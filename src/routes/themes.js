import express from 'express';
import connectDB from '../db.js';

const router = express.Router();

router.get('/:bggId', async (req, res) => {
    try {
        const db = await connectDB();
        const themes = await db.collection('game_themes')
            .find({ bggId: parseInt(req.params.bggId) })
            .toArray();
        res.json(themes.length ? themes.map(t => t.theme) : []);
    } catch (error) {
        console.error("Error fetching themes:", error);
        res.status(500).json({ error: "Error fetching themes" });
    }
});

router.post('/:bggId', async (req, res) => {
    const bggId = parseInt(req.params.bggId);
    let { theme } = req.body;
    if (!theme) {
        return res.status(400).json({ error: "Theme is required." });
    }
    theme = theme.trim();

    try {
        const db = await connectDB();
        const gameExists = await db.collection('games').findOne({ bggId });
        if (!gameExists) {
            return res.status(404).json({ error: "Game not found." });
        }

        const existingTheme = await db.collection('game_themes').findOne({ 
            bggId,
            theme: { $regex: new RegExp(`^${theme}$`, 'i') }
        });
        if (existingTheme) {
            return res.status(409).json({ error: "Theme already exists for this game." });
        }

        const globalTheme = await db.collection('game_themes').findOne({
            theme: { $regex: new RegExp(`^${theme}$`, 'i') }
        });
        if (globalTheme) {
            theme = globalTheme.theme;
        }

        await db.collection('game_themes').insertOne({ bggId, theme });
        res.status(201).json({ success: true, theme });
    } catch (error) {
        console.error("Error adding theme:", error);
        res.status(500).json({ error: "Error adding theme" });
    }
});

router.delete('/:bggId/:theme', async (req, res) => {
    const bggId = parseInt(req.params.bggId);
    const { theme } = req.params;
    try {
        const db = await connectDB();
        await db.collection('game_themes').deleteOne({ bggId, theme });
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: "Error deleting theme" });
    }
});

router.get('/', async (req, res) => {
    try {
        const db = await connectDB();
        const themesCursor = await db.collection('game_themes').aggregate([
            { $group: { _id: "$theme" } }
        ]).toArray();
        const themes = themesCursor.map(doc => doc._id);
        res.json(themes);
    } catch (error) {
        console.error("Error fetching themes:", error);
        res.status(500).json({ error: "Error fetching themes" });
    }
});

export default router;
