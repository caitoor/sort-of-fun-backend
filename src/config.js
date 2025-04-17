// src/config.js

const DAY_MS = 24 * 3600 * 1000;

// background refresh rates and configs
export const COLLECTION_SCHEDULE = '0 2 * * *';
export const TIMEZONE = 'America/New_York';

// interval for checking if a boardgame detail information is stale
export const STALE_GAMES_THRESHOLD = 7 * DAY_MS;

// interval for checking if the collection is stale
export const STALE_COLLECTION_THRESHOLD = DAY_MS;

// maximum number of retries for API requests
export const MAX_RETRIES = 3;

// delay between retries
export const RETRY_DELAY_MS = 5 * 1000;

// default sleep timer between API requests
export const SLEEP_MS = 3 * 1000;

// default sleep timer between API requests during cron jobs
export const REFRESH_SLEEP_MS = 60 * 1000;