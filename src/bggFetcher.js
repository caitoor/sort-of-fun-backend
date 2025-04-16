// src/bggFetcher.js

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { MAX_RETRIES, SLEEP_MS } from './config.js';
import { sleep } from './utils/time.js';
import connectDB from './db.js';

const BGG_USERNAME = process.env.BGG_USERNAME || 'default_user';
const BGG_API_URL = 'https://boardgamegeek.com/xmlapi2';
const parser = new XMLParser({ ignoreAttributes: false });

/**
 * Fetch the user’s BGG collection, with up to MAX_RETRIES on status 202 or network errors.
 * Returns an array of raw item objects.
 */
export async function fetchCollection() {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        attempt++;
        try {
            console.log(`Fetching BGG collection for user: ${BGG_USERNAME} (attempt ${attempt})`);
            const response = await axios.get(
                `${BGG_API_URL}/collection?username=${BGG_USERNAME}&own=1&excludesubtype=boardgameexpansion&stats=1`,
                { timeout: 15000 }
            );

            // 202 = still processing; retry after delay
            if (response.status === 202) {
                console.warn('BGG API returned 202; retrying...');
                await sleep(SLEEP_MS);
                continue;
            }

            if (response.status !== 200) {
                throw new Error(`BGG API error: ${response.status}`);
            }

            const jsonData = parser.parse(response.data);
            const items = jsonData?.items?.item;
            if (!items) {
                console.warn('BGG response empty or malformed');
                return [];
            }

            return Array.isArray(items) ? items : [items];
        } catch (err) {
            if (attempt >= MAX_RETRIES) {
                console.error('Failed to fetch collection after retries:', err);
                throw err;
            }
            console.warn('Error fetching collection; retrying...', err);
            await sleep(SLEEP_MS);
        }
    }

    throw new Error('Unable to fetch BGG collection');
}

/**
 * Fetch detailed stats (complexity + playerRatings poll) for one game ID.
 */
export async function fetchGameDetails(gameId) {
    await sleep(SLEEP_MS);
    try {
        console.log(`Fetching details for game ID: ${gameId}`);
        const response = await axios.get(`${BGG_API_URL}/thing?id=${gameId}&stats=1`, {
            timeout: 10000
        });

        if (response.status !== 200) {
            throw new Error(`BGG API thing error: ${response.status}`);
        }

        const jsonData = parser.parse(response.data);
        const item = jsonData.items?.item;
        const ratings = item?.statistics?.ratings;
        const playerRatings = {};

        const poll = item?.poll;
        if (Array.isArray(poll)) {
            const numPlayerPoll = poll.find(p => p['@_name'] === 'suggested_numplayers');
            numPlayerPoll?.results?.forEach(entry => {
                const count = entry['@_numplayers'];
                const best = parseInt(entry.result.find(r => r['@_value'] === 'Best')?.['@_numvotes'] || '0', 10);
                const rec = parseInt(entry.result.find(r => r['@_value'] === 'Recommended')?.['@_numvotes'] || '0', 10);
                const notRec = parseInt(entry.result.find(r => r['@_value'] === 'Not Recommended')?.['@_numvotes'] || '0', 10);
                playerRatings[count] = { best, recommended: rec, notRecommended: notRec };
            });
        }

        return {
            complexity: ratings?.averageweight?.['@_value']
                ? parseFloat(ratings.averageweight['@_value'])
                : null,
            playerRatings
        };
    } catch (err) {
        console.error(`Error fetching details for ${gameId}:`, err);
        return null;
    }
}

/**
 * Insert or update an array of raw BGG items into MongoDB.
 * Uses upsert: existing bggId docs are replaced, new ones are created.
 */
export async function saveGamesToDatabase(games) {
    if (!Array.isArray(games) || games.length === 0) {
        console.warn('No games to save');
        return;
    }

    const db = await connectDB();
    let count = 0;

    for (const raw of games) {
        const id = parseInt(raw['@_objectid'], 10);
        const doc = {
            bggId: id,
            name: raw.name?.['#text'] || null,
            minPlayers: parseInt(raw.stats?.['@_minplayers'] || '1', 10),
            maxPlayers: parseInt(raw.stats?.['@_maxplayers'] || '1', 10),
            playtime: parseInt(raw.stats?.['@_playingtime'] || '0', 10),
            minPlaytime: parseInt(raw.stats?.['@_minplaytime'] || '0', 10),
            maxPlaytime: parseInt(raw.stats?.['@_maxplaytime'] || '0', 10),
            complexity: raw.stats?.rating?.averageweight?.['@_value']
                ? parseFloat(raw.stats.rating.averageweight['@_value'])
                : null,
            bggRating: raw.stats?.rating?.average?.['@_value']
                ? parseFloat(raw.stats.rating.average['@_value'])
                : null,
            bayesAverage: raw.stats?.rating?.bayesaverage?.['@_value']
                ? parseFloat(raw.stats.rating.bayesaverage['@_value'])
                : null,
            stdDeviation: raw.stats?.rating?.stddev?.['@_value']
                ? parseFloat(raw.stats.rating.stddev['@_value'])
                : null,
            usersRated: parseInt(raw.stats?.rating?.usersrated?.['@_value'] || '0', 10),
            thumbnail: raw.thumbnail || null,
            image: raw.image || null,
            yearPublished: raw.yearpublished ? parseInt(raw.yearpublished, 10) : null,
            fetchedAt: new Date()
        };

        await db.collection('games').updateOne(
            { bggId: id },
            { $set: doc },
            { upsert: true }
        );

        // fetch and store playerRatings separately
        const details = await fetchGameDetails(id);
        if (details?.playerRatings) {
            // remove old ratings
            await db.collection('player_ratings').deleteMany({ gameId: id });
            const entries = Object.entries(details.playerRatings).map(([num, votes]) => ({
                gameId: id,
                numPlayers: parseInt(num, 10),
                bestVotes: votes.best,
                recommendedVotes: votes.recommended,
                notRecommendedVotes: votes.notRecommended
            }));
            if (entries.length) {
                await db.collection('player_ratings').insertMany(entries);
            }
        }

        count++;
    }

    console.log(`Saved or updated ${count} games`);
}
