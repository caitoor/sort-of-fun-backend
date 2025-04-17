// src/routes/games.js

import express from 'express';
import BoardGame from '../models/BoardGame.js';
import PlayerRating from '../models/PlayerRating.js';
import { manualUpdateHandler, manualCollectionRefresh } from '../controllers/refreshController.js';

const router = express.Router();

/**
 * GET /games
 * Return all games with embedded playerRatings.
 */
router.get('/', async (req, res) => {
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
    console.error('GET /games error', err);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

/**
 * GET /games/:bggId/player-ratings
 * Return only playerRatings for one game.
 */
router.get('/:bggId/player-ratings', async (req, res) => {
  const bggId = parseInt(req.params.bggId, 10);
  try {
    const ratings = await PlayerRating.find({ gameId: bggId }).lean();
    if (ratings.length === 0) {
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
    console.error(`GET /games/${bggId}/player-ratings error`, err);
    res.status(500).json({ error: 'Failed to fetch player ratings' });
  }
});

/**
 * POST /games/refresh
 * Cron-only: refresh if stale.
 */
router.post('/refresh', async (req, res) => {
  try {
    // Using manualCollectionRefresh since refreshCollectionIfStale doesn't exist
    await manualCollectionRefresh(req, res);
  } catch (err) {
    console.error('POST /games/refresh error', err);
    res.status(500).json({ error: 'Refresh failed' });
  }
});

router.post('/manual-update', manualUpdateHandler);
export default router;
