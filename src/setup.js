// src/setup.js

import connectDB from './db/mongoose.js';
import BoardGame from './models/BoardGame.js';
import { fetchCollection, saveGamesToDatabase } from './services/bggService.js';

/**
 * On first run, populate the database if empty.
 */
export default async function setup() {
    await connectDB();

    // Count via Mongoose model
    const count = await BoardGame.countDocuments();

    if (count === 0) {
        console.log('🚀 Database empty – fetching initial collection from BGG...');
        const items = await fetchCollection();
        await saveGamesToDatabase(items);
        console.log(`✅ Saved ${items.length} games to database`);
    } else {
        console.log('✅ Database already contains games – setup skipped');
    }
}
