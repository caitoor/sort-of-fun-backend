// src/db/mongoose.js

import mongoose from 'mongoose';
const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'boardgames';

if (!uri) {
    throw new Error('Missing MONGO_URI in environment');
}

let isConnected = false;

export default async function connectDB() {
    if (isConnected || mongoose.connection.readyState === 1) {
        return;
    }

    try {
        // Only uri + dbName—no useNewUrlParser/useUnifiedTopology
        await mongoose.connect(uri, { dbName });
        isConnected = true;
        console.log(`🔗 Mongoose connected to "${dbName}"`);
    } catch (err) {
        console.error('❌ Mongoose connection error:', err);
        throw err;
    }
}
