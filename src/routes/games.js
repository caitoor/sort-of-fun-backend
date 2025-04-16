// src/routes/games.js

import express from 'express';
import connectDB from '../db.js';
import { refreshCollectionIfStale, refreshCollection } from '../jobs/refreshCollection.js';
import { refreshStaleGames } from '../jobs/refreshStaleGames.js';

const router = express.Router();

/**
 * GET /games
 * Return all games with their embedded playerRatings.
 */
router.get('/', async (req, res) => {
    try {
        const db = await connectDB();
        const games = await db.collection('games').find({}).toArray();
        const ratings = await db.collection('player_ratings').find({}).toArray();

        const gamesWithRatings = games.map(game => {
            const playerRatings = ratings
                .filter(r => r.gameId === game.bggId)
                .map(r => ({
                    numPlayers: r.numPlayers,
                    bestVotes: r.bestVotes,
                    recommendedVotes: r.recommendedVotes,
                    notRecommendedVotes: r.notRecommendedVotes
                }));
            return { ...game, playerRatings };
        });

        res.json(gamesWithRatings);
    } catch (err) {
        console.error('Error fetching games:', err);
        res.status(500).json({ error: 'Failed to fetch games.' });
    }
});

/**
 * GET /games/:bggId/player-ratings
 * Return the playerRatings for a single game.
 */
router.get('/:bggId/player-ratings', async (req, res) => {
    const bggId = parseInt(req.params.bggId, 10);
    try {
        const db = await connectDB();
        const playerRatings = await db
            .collection('player_ratings')
            .find({ gameId: bggId })
            .toArray();

        if (playerRatings.length === 0) {
            return res.status(404).json({ error: 'No player ratings found for this game.' });
        }

        res.json(
            playerRatings.map(r => ({
                numPlayers: r.numPlayers,
                bestVotes: r.bestVotes,
                recommendedVotes: r.recommendedVotes,
                notRecommendedVotes: r.notRecommendedVotes
            }))
        );
    } catch (err) {
        console.error(`Error fetching player ratings for game ${bggId}:`, err);
        res.status(500).json({ error: 'Failed to fetch player ratings.' });
    }
});


/**
 * POST /games/refresh
 * Trigger a “stale‑only” collection refresh (used by nightly cron).
 */
router.post('/refresh', async (req, res) => {
    try {
        // Only refresh if it’s stale (cron-only)
        await refreshCollectionIfStale();
        res.json({ message: 'Collection refresh triggered' });
    } catch (err) {
        console.error('Collection refresh error:', err);
        res.status(500).json({ error: 'Collection refresh failed' });
    }
});

/**
 * POST /games/manual-update
 * * Force a full collection re‑import + stale‑games update.
 */
router.post('/manual-update', async (req, res) => {
    try {
        // Force full collection refresh regardless of threshold
        await refreshCollection();

        // Update stale games
        await refreshStaleGames();

        res.json({ message: 'Manual update triggered' });
    } catch (err) {
        console.error('Manual update error:', err);
        res.status(500).json({ error: 'Manual update failed' });
    }
});

export default router;
