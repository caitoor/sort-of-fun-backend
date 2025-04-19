// src/server.js

import 'dotenv/config';
import './jobs/refreshJobs.js';
import express from 'express';
import cors from 'cors';
import connectDB from './db/mongoose.js';
import setup from './setup.js';
import gamesRouter from './routes/games.js';
import expansionsRouter from './routes/expansions.js';
import tagsRouter from './routes/tags.js';
import BoardGame from './models/BoardGame.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

/**
 * Mount API routers:
 *   GET/POST /games        -> gamesRouter
 *   GET/POST /expansions   -> expansionsRouter         
 *   GET/POST /tags         -> tagsRouter
 */
app.use('/games', gamesRouter);
app.use('/expansions', expansionsRouter);
app.use('/tags', tagsRouter);

/**
 * On startup:
 * 1. connect to Mongo via Mongoose
 * 2. if no games exist, run initial setup
 * 3. start HTTP server
 */
async function initialize() {
    try {
        await connectDB();
        const count = await BoardGame.countDocuments();
        if (count === 0) {
            console.log('🚀 No games found—running initial database setup...');
            await setup();
        } else {
            console.log('✅ Database already contains games—skipping setup.');
        }

        app.listen(PORT, () => {
            console.log(`🌐 Server listening on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Failed to initialize server:', err);
        process.exit(1);
    }
}

initialize();
