// src/controllers/gamesController.js

import BoardGame from '../models/BoardGame.js';
import PlayerRating from '../models/PlayerRating.js';

/**
 * GET /games
 */
export async function listGames(req, res) {
    try {
        const games = await BoardGame.find().lean();
        const ratings = await PlayerRating.find().lean();
        const map = ratings.reduce((acc, r) => {
            (acc[r.gameId] ||= []).push({
                numPlayers: r.numPlayers,
                bestVotes: r.bestVotes,
                recommendedVotes: r.recommendedVotes,
                notRecommendedVotes: r.notRecommendedVotes
            });
            return acc;
        }, {});
        const result = games.map(g => ({
            ...g,
            playerRatings: map[g.bggId] || []
        }));
        res.json(result);
    } catch (err) {
        console.error('listGames error:', err);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
}

/**
 * GET /games/:bggId/player-ratings
 */
export async function getPlayerRatings(req, res) {
    const bggId = parseInt(req.params.bggId, 10);
    try {
        const ratings = await PlayerRating.find({ gameId: bggId }).lean();
        if (!ratings.length) {
            return res.status(404).json({ error: 'No player ratings found' });
        }
        res.json(
            ratings.map(r => ({
                numPlayers: r.numPlayers,
                bestVotes: r.bestVotes,
                recommendedVotes: r.recommendedVotes,
                notRecommendedVotes: r.notRecommendedVotes
            }))
        );
    } catch (err) {
        console.error(`getPlayerRatings(${bggId}) error:`, err);
        res.status(500).json({ error: 'Failed to fetch player ratings' });
    }
}

/**
 * POST /games/refresh
 * Cron‐only: refresh if stale.
 */
export async function refreshIfStale(req, res) {
    try {
        await refreshCollectionIfStale();
        res.json({ message: 'Collection stale‐check refresh done' });
    } catch (err) {
        console.error('refreshIfStale error:', err);
        res.status(500).json({ error: 'Refresh failed' });
    }
}

/**
 * POST /games/manual-update
 * Force full import of new games + stale updates.
 */
export async function manualUpdate(req, res) {
    try {
        // Force full collection refresh
        await refreshCollection();

        // Update stale games
        await refreshStaleGames();

        res.json({ message: 'Manual update successful' });
    } catch (err) {
        console.error('manualUpdate error:', err);
        res.status(500).json({ error: 'Manual update failed' });
    }
}


/**
 * GET /games/count
 */
export async function countGames(req, res) {
    try {
        const count = await gameService.countBaseGames();
        res.json({ count });
    } catch (err) {
        console.error('countGames error:', err);
        res.status(500).json({ error: 'Failed to count games' });
    }
}