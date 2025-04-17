#!/usr/bin/env node
// scripts/fixBoardGames.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri    = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'boardgames';

async function migrate() {
  await mongoose.connect(uri, { dbName });
  console.log('🔗 Connected to MongoDB');

  const coll = mongoose.connection.db.collection('boardgames');

  // 1) Add createdAt = fetchedAt on all docs, where createdAt fehlt
  const res1 = await coll.updateMany(
    { createdAt: { $exists: false } },
    [ { $set: { createdAt: "$fetchedAt" } } ]     // Aggregation‐pipeline form: kopiert fetchedAt
  );
  console.log(`🆕 createdAt set on ${res1.modifiedCount} docs`);

  // 2) Remove unwanted fields in one go
  const toUnset = {
    complexity: "",
    owned:       "",
    trading:     "",
    wanting:     "",
    wishing:     "",
    numComments: ""
  };
  const res2 = await coll.updateMany({}, { $unset: toUnset });
  console.log(`🗑️  Unset unwanted fields on ${res2.modifiedCount} docs`);

  await mongoose.disconnect();
  console.log('🔌 Migration finished');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
