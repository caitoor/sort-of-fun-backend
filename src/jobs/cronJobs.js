// src/jobs/cronJobs.js

import cron from 'node-cron';
import { COLLECTION_SCHEDULE, TIMEZONE } from '../config.js';
import { refreshCollectionIfStale } from './refreshCollection.js';
import { refreshStaleGames } from './refreshStaleGames.js';

cron.schedule(COLLECTION_SCHEDULE, async () => {
  try {
    await refreshCollectionIfStale();
    await refreshStaleGames();
    console.log('✅ Nightly update complete');
  } catch (err) {
    console.error('❌ Nightly update error', err);
  }
}, { timezone: TIMEZONE });
