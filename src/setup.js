// src/setup.js

import connectDB from './db.js';
import { fetchCollection, saveGamesToDatabase } from './bggFetcher.js';

/**
 * Initialize the MongoDB database on first run.
 * - If no games exist, fetch from BGG and save them.
 * - Otherwise, skip setup.
 */
export default async function setup() {
    const db = await connectDB();
    const count = await db.collection('games').countDocuments();

    if (count === 0) {
        console.log('🚀 Database empty – fetching initial collection from BGG...');
        const items = await fetchCollection();
        await saveGamesToDatabase(items);
        console.log(`✅ Saved ${items.length} games to database`);
    } else {
        console.log('✅ Database already contains games – setup skipped');
    }
}
