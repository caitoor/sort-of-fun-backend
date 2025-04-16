// src/models/boardgame.js
import connectDB from '../db.js';

/**
 * Retrieve all games from the database.
 */
export async function getAllGames() {
    const db = await connectDB();
    return db.collection('games').find({}).toArray();
}

/**
 * Find a single game by its BGG ID.
 */
export async function findGameById(bggId) {
    const db = await connectDB();
    return db.collection('games').findOne({ bggId: parseInt(bggId, 10) });
}

/**
 * Delete a game by its BGG ID.
 */
export async function deleteGame(bggId) {
    const db = await connectDB();
    return db.collection('games').deleteOne({ bggId: parseInt(bggId, 10) });
}

/**
 * Update the complexity and player ratings for a game.
 * 1) Update game metadata (complexity, fetchedAt)
 * 2) Remove old player ratings
 * 3) Insert new player rating documents
 */
export async function updateGameDetails(bggId, details) {
    const db = await connectDB();

    // 1) Update game metadata
    await db.collection('games').updateOne(
        { bggId: parseInt(bggId, 10) },
        {
            $set: {
                complexity: details.complexity,
                fetchedAt: new Date()
            }
        }
    );

    // 2) Remove existing player ratings for this game
    await db.collection('player_ratings').deleteMany({ gameId: parseInt(bggId, 10) });

    // 3) Insert new player rating entries
    const docs = Object.entries(details.playerRatings).map(([numPlayers, votes]) => ({
        gameId: parseInt(bggId, 10),
        numPlayers: parseInt(numPlayers, 10),
        bestVotes: votes.best,
        recommendedVotes: votes.recommended,
        notRecommendedVotes: votes.notRecommended
    }));

    if (docs.length) {
        await db.collection('player_ratings').insertMany(docs);
    }
}
