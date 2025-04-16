// src/db.js

import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error('MONGO_URI must be set in environment');
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let dbInstance;

/**
 * Returns a singleton MongoDB database connection.
 * Throws if MONGO_URI is missing.
 */
export default async function connectDB() {
  if (!dbInstance) {
    await client.connect();
    // Verify connection
    await client.db('admin').command({ ping: 1 });
    const dbName = process.env.DB_NAME || 'boardgames';
    dbInstance = client.db(dbName);
    console.log(`🌐 Connected to MongoDB database "${dbName}"`);
  }
  return dbInstance;
}
