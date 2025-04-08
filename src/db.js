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

let dbInstance;

async function connectDB() {
    if (!dbInstance) {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        dbInstance = client.db(process.env.DB_NAME || 'boardgames');
        console.log("Connected to MongoDB");
    }
    return dbInstance;
}

export default connectDB;
