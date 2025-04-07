import connectDB from './db.js';
import { fetchCollection, saveGamesToDatabase } from './bggFetcher.js';

async function setup() {
    const db = await connectDB();
    const gameCount = await db.collection('games').countDocuments();
    if (gameCount === 0) {
        console.log("Database is empty. Fetching games from BGG...");
        const bggData = await fetchCollection();
        await saveGamesToDatabase(bggData);
    } else {
        console.log("Database already has games. Setup skipped.");
    }
}

export default setup;
