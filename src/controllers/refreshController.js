// src/controllers/refreshController.js

import { refreshCollectionIfStale } from '../jobs/refreshCollection.js';
import { refreshStaleGames } from '../jobs/refreshStaleGames.js';

/**
 * Handler für manuellen Trigger des nächtlichen Update‑Jobs.
 * Führt Collection‑Refresh und Einzel‑Game‑Refresh sequentiell aus.
 */
export async function manualUpdateHandler(req, res) {
    try {
        await refreshCollectionIfStale();
        await refreshStaleGames();
        res.json({ message: 'Manual update triggered' });
    } catch (err) {
        console.error('Manual update error', err);
        res.status(500).json({ error: 'Manual update failed' });
    }
}
