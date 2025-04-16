// src/jobs/refreshCollection.js

import connectDB from '../db.js';
import { fetchCollection, saveGamesToDatabase } from '../bggFetcher.js';
import { STALE_COLLECTION_THRESHOLD } from '../config.js';

/**
 * Core logic: fetch full BGG collection and upsert into DB, then update lastCollectionUpdate.
 */
async function _runCollectionRefresh() {
    const items = await fetchCollection();
    await saveGamesToDatabase(items);

    const db = await connectDB();
    await db.collection('meta').updateOne(
        { _id: 'refreshInfo' },
        { $set: { lastCollectionUpdate: Date.now() } },
        { upsert: true }
    );
}
/**
 * Refresh the collection only if it hasn't been updated within the threshold.
 */
export async function refreshCollectionIfStale() {
    const db = await connectDB();
    const meta = await db.collection('meta').findOne({ _id: 'refreshInfo' });
    const last = meta?.lastCollectionUpdate || 0;

    if (Date.now() - last > STALE_COLLECTION_THRESHOLD) {
        console.log('🔄 Refreshing entire collection (stale)…');
        await _runCollectionRefresh();
    }
}

/**
 * Force a full collection refresh, ignoring staleness.
 */
export async function refreshCollection() {
    console.log('🔄 Forcing full collection refresh…');
    await _runCollectionRefresh();
}