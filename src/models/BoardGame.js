// src/models/BoardGame.js

import mongoose from 'mongoose';

const SuggestedPlayerAgeSchema = new mongoose.Schema({
  age: { type: Number, required: true },
  votes: { type: Number, default: 0 }
}, { _id: false });

const BoardGameSchema = new mongoose.Schema({
  // general info
  bggId: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  thumbnail: { type: String, default: null },
  image: { type: String, default: null },
  yearPublished: { type: Number, default: null },
  numOwned: { type: Number, default: 0 },

  // playtime and player count
  minPlayers: { type: Number, default: 1 },
  maxPlayers: { type: Number, default: 1 },
  playtime: { type: Number, default: 0 },
  minPlaytime: { type: Number, default: 0 },
  maxPlaytime: { type: Number, default: 0 },

  // ratings and stats
  myRating: { type: Number, default: null },
  bggRating: { type: Number, default: null },
  bayesAverage: { type: Number, default: null },
  stdDeviation: { type: Number, default: null },
  usersRated: { type: Number, default: 0 },
  averageWeight: { type: Number, default: null },
  numWeights: { type: Number, default: 0 },

  // recommended ages
  suggestedPlayerAges: { type: [SuggestedPlayerAgeSchema], default: [] },

  // expansion status
  baseGameId: { type: Number, default: null, index: true }
},
  {
    // automatically add createdAt and updatedAt fields
    timestamps: { createdAt: 'createdAt', updatedAt: 'fetchedAt' }
  });

export default mongoose.model('BoardGame', BoardGameSchema);
