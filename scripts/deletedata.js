// src/utils/deletedata.js

// deletes database entries for development purposes
// run with `node src/utils/deletedata.js` or `npm run deletedata`
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const collectionsToDrop = [
    'boardgames',
    'playerratings',
    'meta',
    
];

(async () => {
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'boardgames');

        for (const name of collectionsToDrop) {
            const exists = await db.listCollections({ name }).hasNext();
            if (exists) {
                await db.collection(name).drop();
                console.log(`✅ Dropped collection "${name}"`);
            } else {
                console.log(`⚠️ Collection "${name}" does not exist`);
            }
        }
    } catch (err) {
        console.error('❌ Error deleting collections:', err);
        process.exitCode = 1;
    } finally {
        await client.close();
        console.log('🔒 Database connection closed.');
    }
})();
