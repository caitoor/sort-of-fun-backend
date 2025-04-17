// scripts/migrateGameThemes.js
// Migrate legacy 'game_themes' documents into the new Mongoose 'tags' collection.
// NOTE: this script no longer drops the old collection.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tag from '../src/models/Tag.js';

dotenv.config();
const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'boardgames';

async function migrate() {
    // Connect to MongoDB
    await mongoose.connect(uri, { dbName });
    console.log('🔗 Connected to MongoDB for migration');

    // Load all legacy entries
    const legacy = await mongoose.connection
        .collection('game_themes')
        .find()
        .toArray();
    console.log(`ℹ️  Found ${legacy.length} legacy theme documents`);

    // Copy into new 'tags' collection
    let count = 0;
    for (const { bggId, theme } of legacy) {
        try {
            // note: new field is 'tag'
            await Tag.create({ bggId, tag: theme });
            count++;
        } catch (err) {
            // ignore duplicate‑key errors
            if (err.code !== 11000) {
                console.error('❌ Error migrating', { bggId, theme }, err);
            }
        }
    }
    console.log(`✅ Migrated ${count} tags into 'tags' collection`);

    // Do NOT drop 'game_themes' here; handled by separate cleanup script

    // Disconnect
    await mongoose.disconnect();
    console.log('🔌 Migration complete, connection closed');
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
