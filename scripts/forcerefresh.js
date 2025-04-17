// scripts/forcerefresh.js
import 'dotenv/config';
import connectDB from '../src/db/mongoose.js';
import { refreshCollection, refreshGameDetails } from '../src/services/refreshService.js';
import { SLEEP_MS } from '../src/config.js';

async function refreshAll() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    console.log('🔄 Starting collection refresh...');
    await refreshCollection({ checkAge: false, sleepMs: SLEEP_MS });
    console.log('✅ Collection refresh complete');
    
    console.log('🔄 Starting game details refresh...');
    await refreshGameDetails({ checkAge: false, sleepMs: SLEEP_MS });
    console.log('✅ Game details refresh complete');
    
    console.log('🎮 All refresh operations completed successfully');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error refreshing data:', err);
    process.exit(1);
  }
}

refreshAll();