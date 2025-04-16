import express from 'express';
import connectDB from '../db.js';
import { getAllGames, addGame } from '../models/boardgame.js';
import { fetchCollection, saveGamesToDatabase } from '../bggFetcher.js';

const router = express.Router();

router.get('/games', async (req, res) => {
    try {
        const db = await connectDB();
        const games = await db.collection('games').find({}).toArray();
        const ratings = await db.collection('player_ratings').find({}).toArray();

        const gamesWithRatings = games.map(game => {
            const gameRatings = ratings
                .filter(r => r.gameId === game.bggId)
                .map(r => ({
                    numPlayers: r.numPlayers,
                    bestVotes: r.bestVotes,
                    recommendedVotes: r.recommendedVotes,
                    notRecommendedVotes: r.notRecommendedVotes
                }));
            return { ...game, playerRatings: gameRatings };
        });

        res.json(gamesWithRatings);
    } catch (error) {
        console.error("Error fetching games:", error);
        res.status(500).json({ error: "Failed to fetch games." });
    }
});

router.get('/games/:bggId/player-ratings', async (req, res) => {
    const { bggId } = req.params;
    try {
        const db = await connectDB();
        const playerRatings = await db.collection('player_ratings')
            .find({ gameId: parseInt(bggId) })
            .toArray();

        if (playerRatings.length === 0) {
            return res.status(404).json({ error: "No player ratings found for this game." });
        }
        res.json(playerRatings.map(r => ({
            numPlayers: r.numPlayers,
            bestVotes: r.bestVotes,
            recommendedVotes: r.recommendedVotes,
            notRecommendedVotes: r.notRecommendedVotes
        })));
    } catch (error) {
        console.error(`Error fetching player ratings for game ${bggId}:`, error);
        res.status(500).json({ error: "Failed to fetch player ratings." });
    }
});

router.post('/games/refresh', async (req, res) => {
    try {
        // Abruf der gesamten BGG-Sammlung
        const bggGames = await fetchCollection();
        // Abruf aller bereits vorhandenen Spiele aus der Datenbank
        const existingGames = await getAllGames();
        const existingIds = new Set(existingGames.map(game => game.bggId));

        // Filtere die neuen Spiele (die noch nicht in der DB sind)
        const newGames = bggGames.filter(game => {
            const id = parseInt(game["@_objectid"], 10);
            return !existingIds.has(id);
        });

        // Falls neue Spiele gefunden wurden, in die DB einfügen
        if (newGames.length > 0) {
            await saveGamesToDatabase(newGames);
        }

        res.json({
            message: 'Refresh complete',
            newGamesCount: newGames.length
        });
    } catch (error) {
        console.error('Error refreshing games:', error);
        res.status(500).json({ error: 'Refresh failed' });
    }
});

export default router;
