// src/server.js

import 'dotenv/config';
import './jobs/cronJobs.js';
import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import setup from './setup.js';
import gamesRouter from './routes/games.js';
import themesRouter from './routes/themes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

/**
 * Mount API routers:
 *  - /games    → game collection and update endpoints
 *  - /themes   → theme management endpoints
 */
app.use('/games', gamesRouter);
app.use('/themes', themesRouter);

/**
 * On startup: ensure MongoDB is connected and initial data is loaded.
 */
async function initialize() {
    const db = await connectDB();
    const count = await db.collection('games').countDocuments();

    if (count === 0) {
        console.log('🚀 Database empty. Running initial setup...');
        await setup();
    } else {
        console.log('✅ Database already initialized. Skipping setup.');
    }

    app.listen(PORT, () => {
        console.log(`🌐 Server listening on port ${PORT}`);
    });
}

initialize().catch(err => {
    console.error('❌ Failed to initialize server:', err);
    process.exit(1);
});
