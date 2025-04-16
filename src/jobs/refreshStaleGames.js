// src/jobs/refreshStaleGames.js

import connectDB from '../db.js';
import { fetchGameDetails } from '../bggFetcher.js';
import { updateGameDetails } from '../models/boardgame.js';
import { STALE_GAMES_THRESHOLD, REFRESH_SLEEP_MS } from '../config.js';
import { sleep } from '../utils/time.js';

export async function refreshStaleGames() {
    const db = await connectDB();
    const cursor = db.collection('games')
        .find({ fetchedAt: { $lt: new Date(Date.now() - STALE_GAMES_THRESHOLD) } })
        .sort({ fetchedAt: 1 });

    for await (const game of cursor) {
        console.log(`▶️  Updating game ${game.bggId} (${game.name})`);
        try {
            const details = await fetchGameDetails(game.bggId);
            if (details) await updateGameDetails(game.bggId, details);
        } catch (err) {
            console.error(`⚠️ Failed to update ${game.bggId}:`, err);
        }
        await sleep(REFRESH_SLEEP_MS);
    }
}
