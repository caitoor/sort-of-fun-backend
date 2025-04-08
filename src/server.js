import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import gamesRouter from './routes/games.js';
import themesRouter from './routes/themes.js';
import setup from './setup.js';
import connectDB from './db.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use('/', gamesRouter);
app.use('/themes', themesRouter);

const PORT = process.env.PORT || 3000;

async function checkDatabaseAndSetup() {
    const db = await connectDB();
    const gameCount = await db.collection('games').countDocuments();
    if (gameCount === 0) {
        console.log("Database is empty. Running setup...");
        await setup();
    } else {
        console.log("Database has data. Skipping setup.");
    }
}

checkDatabaseAndSetup().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
