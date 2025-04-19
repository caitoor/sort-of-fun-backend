// src/controllers/expansionsController.js

import BoardGame from '../models/BoardGame.js';

/**
 * GET /expansions
 * List all expansions.
 */
export async function listAllExpansions(req, res) {
    try {
        const exps = await BoardGame.find({ baseGameId: { $ne: null } }).lean();
        res.json(exps);
    } catch (err) {
        console.error('listAllExpansions error:', err);
        res.status(500).json({ error: 'Failed to fetch expansions' });
    }
}

/**
 * GET /expansions/count
 * Return total number of expansions.
 */
export async function countExpansions(req, res) {
    try {
        const count = await BoardGame.countDocuments({ baseGameId: { $ne: null } });
        res.json({ count });
    } catch (err) {
        console.error('countExpansions error:', err);
        res.status(500).json({ error: 'Failed to count expansions' });
    }
}

/**
 * GET /expansions/:bggId
 * Details for a single expansion.
 */
export async function getExpansionById(req, res) {
    const bggId = parseInt(req.params.bggId, 10);
    try {
        const exp = await BoardGame.findOne({ bggId, baseGameId: { $ne: null } }).lean();
        if (!exp) return res.status(404).json({ error: 'Expansion not found' });
        res.json(exp);
    } catch (err) {
        console.error(`getExpansionById(${bggId}) error:`, err);
        res.status(500).json({ error: 'Failed to fetch expansion' });
    }
}

/**
 * GET /games/:bggId/expansions
 * List expansions for a given base game.
 */
export async function listExpansionsForGame(req, res) {
    const bggId = parseInt(req.params.bggId, 10);
    try {
        const exps = await BoardGame.find({ baseGameId: bggId }).lean();
        res.json(exps);
    } catch (err) {
        console.error(`listExpansionsForGame(${bggId}) error:`, err);
        res.status(500).json({ error: 'Failed to fetch expansions for game' });
    }
}
