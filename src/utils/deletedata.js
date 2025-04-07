import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function deleteCollections() {
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'boardgames');
        const collections = ['games', 'game_settings', 'player_ratings', 'game_themes'];
        for (const coll of collections) {
            const collectionList = await db.listCollections({ name: coll }).toArray();
            if (collectionList.length > 0) {
                await db.collection(coll).drop();
                console.log(`Collection ${coll} deleted.`);
            } else {
                console.log(`Collection ${coll} does not exist.`);
            }
        }
    } catch (error) {
        console.error('Error deleting collections:', error);
    } finally {
        await client.close();
        console.log('Database connection closed.');
    }
}

deleteCollections().catch(err => {
    console.error('Error:', err);
    client.close();
    process.exit(1);
});
