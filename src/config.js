// src/config.js

const DAY_MS = 24 * 3600 * 1000;

// background refresh rates and configs
export const COLLECTION_SCHEDULE = '0 2 * * *';
export const TIMEZONE = 'America/New_York';
export const STALE_GAMES_THRESHOLD = 7 * DAY_MS;
export const STALE_COLLECTION_THRESHOLD = DAY_MS;
export const REFRESH_SLEEP_MS = 5 * 1000;
export const MAX_RETRIES = 3;

// general constants
export const SLEEP_MS = 2 * 1000;
