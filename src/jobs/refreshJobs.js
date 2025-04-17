// src/jobs/refreshJobs.js

import cron from 'node-cron';
import { COLLECTION_SCHEDULE, TIMEZONE, REFRESH_SLEEP_MS } from '../config.js';
import { refreshCollection, refreshGameDetails } from '../services/refreshService.js';

cron.schedule(
  COLLECTION_SCHEDULE,
  async () => {
    console.log('🕒 Starting nightly update job');
    try {
      await refreshCollection({ checkAge: true, sleepMs: REFRESH_SLEEP_MS });
      await refreshGameDetails({ checkAge: true, sleepMs: REFRESH_SLEEP_MS });
      console.log('✅ Nightly update complete');
    } catch (err) {
      console.error('❌ Nightly update error:', err);
    }
  },
  { timezone: TIMEZONE }
);
