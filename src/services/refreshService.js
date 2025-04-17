// src/jobs/refreshUtils.js
import connectDB from '../db/mongoose.js';
import mongoose from 'mongoose';
import { fetchCollection, saveGamesToDatabase, fetchGameDetails } from '../services/bggService.js';
import BoardGame from '../models/BoardGame.js';
import PlayerRating from '../models/PlayerRating.js';
import { STALE_COLLECTION_THRESHOLD, STALE_GAMES_THRESHOLD, REFRESH_SLEEP_MS } from '../config.js';
import { sleep } from '../utils/time.js';

/**
 * Refresh the collection with configurable options.
 * @param {boolean} checkAge - Whether to check the collection's age.
 * @param {number} sleepMs - Delay between API requests.
 */
export async function refreshCollection({ checkAge = true, sleepMs = REFRESH_SLEEP_MS }) {
    await connectDB();
    // Verwende mongoose.connection statt db
    const meta = await mongoose.connection.collection('meta').findOne({ _id: 'refreshInfo' });
    const lastUpdate = meta?.lastCollectionUpdate || 0;

    if (!checkAge || Date.now() - lastUpdate > STALE_COLLECTION_THRESHOLD) {
        console.log('🔄 Refreshing collection...');
        const items = await fetchCollection();
        await saveGamesToDatabase(items);
        await mongoose.connection.collection('meta').updateOne(
            { _id: 'refreshInfo' },
            { $set: { lastCollectionUpdate: Date.now() } },
            { upsert: true }
        );
        await sleep(sleepMs);
    } else {
        console.log('⏭️ Collection is fresh—skipping refresh.');
    }
}

/**
 * Refresh game details with configurable options.
 * @param {boolean} checkAge - Whether to check the game's age.
 * @param {number} sleepMs - Delay between API requests.
 */
export async function refreshGameDetails({ checkAge = true, sleepMs = REFRESH_SLEEP_MS }) {
    const cutoff = checkAge ? new Date(Date.now() - STALE_GAMES_THRESHOLD) : null;

    const query = checkAge ? { fetchedAt: { $lt: cutoff } } : {};
    const staleList = await BoardGame.find(query).sort({ fetchedAt: 1 }).lean();

    for (const game of staleList) {
        console.log(`▶️  Updating game ${game.bggId} (${game.name})`);
        try {
            const details = await fetchGameDetails(game.bggId);
            if (details) {
                await BoardGame.updateOne(
                    { bggId: game.bggId },
                    {
                        averageWeight: details.averageWeight,
                        numWeights: details.numWeights, fetchedAt: new Date()
                    }
                );

                await PlayerRating.deleteMany({ gameId: game.bggId });
                const docs = Object.entries(details.playerRatings).map(([numPlayers, votes]) => ({
                    gameId: game.bggId,
                    numPlayers: parseInt(numPlayers, 10),
                    bestVotes: votes.best,
                    recommendedVotes: votes.recommended,
                    notRecommendedVotes: votes.notRecommended
                }));
                if (docs.length) {
                    await PlayerRating.insertMany(docs);
                }
            }
        } catch (err) {
            console.error(`⚠️ Failed to update game ${game.bggId}:`, err);
        }
        await sleep(sleepMs);
    }

    console.log(`✅ Game details refresh completed (${staleList.length} processed).`);
}