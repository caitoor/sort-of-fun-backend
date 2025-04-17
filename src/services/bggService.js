// src/services/bggService.js

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import BoardGame from '../models/BoardGame.js';
import PlayerRating from '../models/PlayerRating.js';
import { sleep } from '../utils/time.js';
import { MAX_RETRIES, SLEEP_MS as DEFAULT_SLEEP_MS, RETRY_DELAY_MS, REFRESH_SLEEP_MS } from '../config.js';

const BGG_USERNAME = process.env.BGG_USERNAME;
const BGG_API_URL = 'https://boardgamegeek.com/xmlapi2';
const parser = new XMLParser({ ignoreAttributes: false });

/**
 * Fetch the raw collection items from BGG, retrying on 202 Processing.
 * Returns an array of raw item objects.
 */
export async function fetchCollection() {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const res = await axios.get(`${BGG_API_URL}/collection`, {
        params: {
          username: BGG_USERNAME,
          own: 1,
          excludesubtype: 'boardgameexpansion',
          stats: 1
        },
        timeout: 15000
      });
      if (res.status === 202) {
        console.warn(`BGG 202; retrying in ${RETRY_DELAY_MS}ms`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      if (res.status !== 200) {
        throw new Error(`BGG API status ${res.status}`);
      }
      const items = parser.parse(res.data)?.items?.item;
      return Array.isArray(items) ? items : items ? [items] : [];
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        console.error('fetchCollection failed:', err);
        throw err;
      }
      console.warn('fetchCollection error, retrying:', err.message);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error('fetchCollection: max retries exceeded');
}

/**
 * Fetch and parse <item> from BGG /thing endpoint.
 * @param {number} bggId
 */
async function _fetchThing(bggId) {
  const res = await axios.get(`${BGG_API_URL}/thing`, {
    params: { id: bggId, stats: 1 },
    timeout: 10000
  });
  if (res.status === 202) {
    throw new Error('202');
  }
  if (res.status !== 200) {
    throw new Error(`BGG status ${res.status}`);
  }
  return parser.parse(res.data)?.items?.item || null;
}

/**
 * Parse a <item> node from BGG /thing into our stats shape.
 * @param {object} item  parsed XML object from XMLParser
 */
export function parseThingStats(item) {
  const r = item?.statistics?.ratings;
  if (!r) return null;

  const bggRating = r.average ? +r.average['@_value'] : null;
  const bayesAverage = r.bayesaverage ? +r.bayesaverage['@_value'] : null;
  const stdDeviation = r.stddev ? +r.stddev['@_value'] : null;
  const usersRated = r.usersrated ? +r.usersrated['@_value'] : 0;
  const averageWeight = r.averageweight ? +r.averageweight['@_value'] : null;
  const numWeights = r.numweights ? +r.numweights['@_value'] : 0;

  // parse player-count poll
  const playerRatings = {};
  const poll = item.poll;
  if (Array.isArray(poll)) {
    const numPoll = poll.find(p => p['@_name'] === 'suggested_numplayers');
    numPoll?.results?.forEach(e => {
      const numStr = e['@_numplayers'];
      const num = parseInt(numStr, 10);
      // skip non‑numeric entries like "4+"
      if (isNaN(num)) return;

      const best = +e.result.find(x => x['@_value'] === 'Best')?.['@_numvotes'] || 0;
      const rec = +e.result.find(x => x['@_value'] === 'Recommended')?.['@_numvotes'] || 0;
      const notR = +e.result.find(x => x['@_value'] === 'Not Recommended')?.['@_numvotes'] || 0;

      playerRatings[num] = { best, recommended: rec, notRecommended: notR };
    });
  }

  return { bggRating, bayesAverage, stdDeviation, usersRated, averageWeight, numWeights, playerRatings };
}

/**
 * Fetch and parse stats for one game, retrying on 202.
 * @param {number} bggId
 * @returns {object|null} parsed stats or null on failure
 */
export async function fetchGameDetails(bggId) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const item = await _fetchThing(bggId);
      return parseThingStats(item);
    } catch (err) {
      if (err.message === '202' && attempt < MAX_RETRIES) {
        console.warn(`BGG 202 for ${bggId}; retry #${attempt} in ${RETRY_DELAY_MS}ms`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.error(`fetchGameStats(${bggId}) ${attempt === MAX_RETRIES ? 'failed' : 'error'}:`, err.message);
      return null;
    }
  }
  return null;
}


/**
 * Upsert one game document + its playerRatings.
 */
export async function upsertGame(raw) {
  const id = +raw['@_objectid'];
  const stats = await fetchGameDetails(id);

  // build combined doc from both "raw" (collection) and "stats" (/thing)
  const doc = {
    bggId: id,
    name: raw.name?.['#text'] || '',
    minPlayers: +raw.stats?.['@_minplayers'] || 1,
    maxPlayers: +raw.stats?.['@_maxplayers'] || 1,
    playtime: +raw.stats?.['@_playingtime'] || 0,
    minPlaytime: +raw.stats?.['@_minplaytime'] || 0,
    maxPlaytime: +raw.stats?.['@_maxplaytime'] || 0,
    thumbnail: raw.thumbnail || null,
    image: raw.image || null,
    yearPublished: raw.yearpublished
      ? parseInt(raw.yearpublished, 10)
      : null,

    // now the stats from /thing:
    bggRating: stats?.bggRating,
    bayesAverage: stats?.bayesAverage,
    stdDeviation: stats?.stdDeviation,
    usersRated: stats?.usersRated,
    averageWeight: stats?.averageWeight,
    numWeights: stats?.numWeights,

    fetchedAt: new Date()
    // createdAt wird im Schema automatisch gesetzt und ist immutable
  };

  // upsert main document
  await BoardGame.findOneAndUpdate({ bggId: id }, doc, { upsert: true, new: true });

  // wipe & re‑insert playerRatings
  if (stats?.playerRatings) {
    await PlayerRating.deleteMany({ gameId: id });
    const prDocs = Object.entries(stats.playerRatings).map(([num, v]) => ({
      gameId: id,
      numPlayers: +num,
      bestVotes: v.best,
      recommendedVotes: v.recommended,
      notRecommendedVotes: v.notRecommended
    }));
    if (prDocs.length) {
      await PlayerRating.insertMany(prDocs);
    }
  }
}

/**
 * Bulk‑upsert an array of raw games.
 * @param {Array<object>} rawGames
 * @param {number} sleepMs  throttle between each upsert
 */
export async function saveGamesToDatabase(rawGames, sleepMs = DEFAULT_SLEEP_MS) {
  if (!Array.isArray(rawGames) || rawGames.length === 0) return;
  let count = 0;
  for (const raw of rawGames) {
    await upsertGame(raw);
    if (sleepMs > 0) await sleep(sleepMs);
    count++;
  }
  console.log(`✅ saveGamesToDatabase: processed ${count} entries`);
}

