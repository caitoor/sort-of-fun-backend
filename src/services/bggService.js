// src/services/bggService.js

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import BoardGame from '../models/BoardGame.js';
import PlayerRating from '../models/PlayerRating.js';
import { sleep } from '../utils/time.js';
import {
  MAX_RETRIES,
  SLEEP_MS as DEFAULT_SLEEP_MS,
  RETRY_DELAY_MS
} from '../config.js';

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
          stats: 1
        },
        timeout: 15000
      });
      if (res.status === 202) {
        console.warn(`BGG /collection returned 202; retrying in ${RETRY_DELAY_MS}ms`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      if (res.status !== 200) {
        throw new Error(`BGG /collection status ${res.status}`);
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
 * Low‑level: fetch <item> node from BGG /thing endpoint.
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
    throw new Error(`BGG /thing status ${res.status}`);
  }
  return parser.parse(res.data)?.items?.item || null;
}

/**
 * Parse a <item> node from BGG /thing into our stats shape.
 */
export function parseThingStats(item) {
  const r = item?.statistics?.ratings || {};
  const stats = {
    bggRating:     r.average       ? +r.average['@_value']       : null,
    bayesAverage:  r.bayesaverage  ? +r.bayesaverage['@_value']  : null,
    stdDeviation:  r.stddev        ? +r.stddev['@_value']        : null,
    usersRated:    r.usersrated    ? +r.usersrated['@_value']    : 0,
    averageWeight: r.averageweight ? +r.averageweight['@_value'] : null,
    numWeights:    r.numweights    ? +r.numweights['@_value']    : 0,
    playerRatings: {},
    suggestedPlayerAges: []
  };

  // parse player-count poll
  const pp = Array.isArray(item.poll)
    ? item.poll.find(p => p['@_name'] === 'suggested_numplayers')
    : null;
  const ppResults = pp?.results
    ? Array.isArray(pp.results) ? pp.results : [pp.results]
    : [];
  ppResults.forEach(e => {
    const n = parseInt(e['@_numplayers'], 10);
    if (!isNaN(n)) {
      stats.playerRatings[n] = {
        best:         +e.result.find(x => x['@_value']==='Best')?.['@_numvotes']         || 0,
        recommended:  +e.result.find(x => x['@_value']==='Recommended')?.['@_numvotes'] || 0,
        notRecommended:+e.result.find(x => x['@_value']==='Not Recommended')?.['@_numvotes'] || 0
      };
    }
  });

  // parse suggested player‑age poll
  const ap = Array.isArray(item.poll)
    ? item.poll.find(p => p['@_name'] === 'suggested_playerage')
    : null;
  const apResults = ap?.results
    ? Array.isArray(ap.results) ? ap.results : [ap.results]
    : [];
  apResults.forEach(e => {
    const age = parseInt(e['@_value'], 10);
    if (!isNaN(age)) {
      stats.suggestedPlayerAges.push({
        age,
        votes: +e['@_numvotes'] || 0
      });
    }
  });

  return stats;
}

/**
 * Fetch and parse stats for one game (or expansion), retrying on 202.
 * Returns an object combining:
 *   • all parseThingStats()
 *   • baseGameId (null for base games, BGG-ID of the parent game for expansions)
 */
export async function fetchGameDetails(bggId) {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      const item = await _fetchThing(bggId);
      // console.log(`fetchGameDetails(${bggId})`, item);

      // parse all Ratings & Polls
      const stats = parseThingStats(item) || {
        bggRating: null,
        bayesAverage: null,
        stdDeviation: null,
        usersRated: 0,
        averageWeight: null,
        numWeights: 0,
        playerRatings: {},
        suggestedPlayerAges: []
      };

      // detect parent game for expansions
      let baseGameId = null;
      const isExp = item['@_type'] === 'boardgameexpansion' || item['@_subtype'] === 'boardgameexpansion';
      if (isExp) {
        const links = Array.isArray(item.link) ? item.link : item.link ? [item.link] : [];
        // look for inbound expansion link → the BGG-ID of the base game
        const parent = links.find(l => l['@_type']==='boardgameexpansion' && l['@_inbound']==='true');
        if (parent) baseGameId = +parent['@_id'];
      }

      return { ...stats, baseGameId };
    } catch (err) {
      if (err.message === '202' && i < MAX_RETRIES) {
        console.warn(`BGG 202 for ${bggId}; retry #${i} in ${RETRY_DELAY_MS}ms`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.error(`fetchGameDetails(${bggId}) failed:`, err.message);
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
  const details = (await fetchGameDetails(id)) || {
    playerRatings: {},
    suggestedPlayerAges: [],
    baseGameId: null
  };

  // pull Stats & Polls & parent‑ID
  const {
    bggRating, bayesAverage, stdDeviation, usersRated,
    averageWeight, numWeights,
    playerRatings, suggestedPlayerAges,
    baseGameId
  } = details;

  // own rating + owned count from collection‑Call
  let myRating = parseFloat(raw.stats?.rating?.['@_value'] || '');
  if (isNaN(myRating)) myRating = null;

  const numOwned = raw.stats?.['@_numowned']
    ? parseInt(raw.stats['@_numowned'], 10)
    : 0;

  // assemble document
  const doc = {
    bggId: id,
    name: raw.name?.['#text'] || '',
    thumbnail: raw.thumbnail || null,
    image: raw.image || null,
    yearPublished: raw.yearpublished ? +raw.yearpublished : null,
    minPlayers: +raw.stats?.['@_minplayers']   || 1,
    maxPlayers: +raw.stats?.['@_maxplayers']   || 1,
    playtime:   +raw.stats?.['@_playingtime']  || 0,
    minPlaytime:+raw.stats?.['@_minplaytime']  || 0,
    maxPlaytime:+raw.stats?.['@_maxplaytime']  || 0,
    myRating,
    numOwned,
    baseGameId,

    // die BGG‑Stats:
    bggRating,
    bayesAverage,
    stdDeviation,
    usersRated,
    averageWeight,
    numWeights,
    suggestedPlayerAges,

    fetchedAt: new Date()
  };

  // upsert main document
  await BoardGame.findOneAndUpdate(
    { bggId: id },
    doc,
    { upsert: true, new: true }
  );

  // wipe & re‑insert PlayerRating‑Subcollection
  await PlayerRating.deleteMany({ gameId: id });
  const prDocs = Object.entries(playerRatings).map(([num, v]) => ({
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

/**
 * Bulk‑upsert an array of raw games.
 * @param {Array<object>} rawGames
 * @param {number} sleepMs  throttle between each upsert
 */
export async function saveGamesToDatabase(rawGames, sleepMs = DEFAULT_SLEEP_MS) {
  let count = 0;
  for (const raw of rawGames) {
    await upsertGame(raw);
    if (sleepMs > 0) await sleep(sleepMs);
    count++;
  }
  console.log(`✅ saveGamesToDatabase: processed ${count} entries`);
}
