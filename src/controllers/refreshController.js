// src/controllers/refreshController.js

import { refreshNewGames } from '../services/gameService.js';
import { refreshCollection, refreshGameDetails } from '../services/refreshService.js';
import { SLEEP_MS } from '../config.js';

/**
 * POST /games/manual-update
 * Import only brand-new games and then stale‑update details.
 */
export async function manualUpdateHandler(req, res) {
    try {
        const newCount = await refreshNewGames();

        await refreshStaleGames();

        res.json({ newGamesCount: newCount });
    } catch (err) {
        console.error('manualUpdateHandler error:', err);
        res.status(500).json({ error: 'Manual update failed' });
    }
}

/**
 * POST /games/manual-collection-refresh
 * Refresh the collection without checking its age.
 */
export async function manualCollectionRefresh(req, res) {
    try {
        await refreshCollection({ checkAge: false, sleepMs: SLEEP_MS });
        res.json({ message: 'Manual collection refresh complete' });
    } catch (err) {
        console.error('Manual collection refresh error:', err);
        res.status(500).json({ error: 'Manual collection refresh failed' });
    }
}

/**
 * POST /games/manual-game-refresh
 * Refresh all game details without checking their age.
 */
export async function manualGameRefresh(req, res) {
    try {
        await refreshGameDetails({ checkAge: false, sleepMs: SLEEP_MS });
        res.json({ message: 'Manual game refresh complete' });
    } catch (err) {
        console.error('Manual game refresh error:', err);
        res.status(500).json({ error: 'Manual game refresh failed' });
    }
}