// scripts/updateExistingGames.js
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/db/mongoose.js';
import { fetchCollection, saveGamesToDatabase } from '../src/services/bggService.js';

async function main() {
    // 1) DB verbinden
    await connectDB();
    console.log('⏳ Fetching full BGG collection…');
    const items = await fetchCollection();

    // 3) Anzahl loggen und updaten
    console.log(`ℹ️  Retrieved ${items.length} games from BGG`);
    console.log('🔄 Updating all games (throttle: 2000ms)…');
    await saveGamesToDatabase(items, 2000);  // hart 2000 ms throttling

    console.log('✅ All games updated');
    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Failed to update games:', err);
    process.exit(1);
});
