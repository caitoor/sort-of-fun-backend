// src/services/gameService.js

import BoardGame from '../models/BoardGame.js';
import PlayerRating from '../models/PlayerRating.js';
import Tag from '../models/Tag.js';
import { fetchCollection, saveGamesToDatabase } from './bggService.js';

/**
 * Return all board games with their embedded playerRatings.
 */
export async function getAllGamesWithRatings() {
    // fetch games and ratings in parallel
    const [games, ratings] = await Promise.all([
        BoardGame.find().lean(),
        PlayerRating.find().lean()
    ]);

    // group ratings by gameId
    const ratingMap = ratings.reduce((map, r) => {
        (map[r.gameId] ||= []).push({
            numPlayers: r.numPlayers,
            bestVotes: r.bestVotes,
            recommendedVotes: r.recommendedVotes,
            notRecommendedVotes: r.notRecommendedVotes
        });
        return map;
    }, {});

    // attach ratings
    return games.map(game => ({
        ...game,
        playerRatings: ratingMap[game.bggId] || []
    }));
}

/**
 * Return playerRatings for a single game.
 */
export async function getPlayerRatingsForGame(bggId) {
    const ratings = await PlayerRating.find({ gameId: bggId }).lean();
    return ratings.map(r => ({
        numPlayers: r.numPlayers,
        bestVotes: r.bestVotes,
        recommendedVotes: r.recommendedVotes,
        notRecommendedVotes: r.notRecommendedVotes
    }));
}

/**
 * Perform a manual refresh: fetch only brand-new games and save.
 * @returns {number} Count of new games added.
 */
export async function refreshNewGames() {
    const raw = await fetchCollection();
    // determine which are new
    const existing = await BoardGame.find().select('bggId').lean();
    const existingIds = new Set(existing.map(g => g.bggId));

    const newRaw = raw.filter(item => {
        const id = parseInt(item['@_objectid'], 10);
        return !existingIds.has(id);
    });

    if (newRaw.length) {
        await saveGamesToDatabase(newRaw);
    }

    return newRaw.length;
}

/**
 * Force upsert of entire BGG collection.
 * @returns {number} Total items processed.
 */
export async function importEntireCollection() {
    const raw = await fetchCollection();
    await saveGamesToDatabase(raw);
    return raw.length;
}

/**
 * Get all distinct tags (for autocomplete).
 */
export async function getAllTags() {
    return Tag.distinct('tag');
}

/**
 * Get tags for a specific game.
 */
export async function getTagsForGame(bggId) {
    const docs = await Tag.find({ bggId }).lean();
    return docs.map(d => d.tag);
}
