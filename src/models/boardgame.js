// src/models/BoardGame.js

import mongoose from 'mongoose';

const BoardGameSchema = new mongoose.Schema({
  bggId:      { type: Number, required: true, unique: true, index: true },
  name:       { type: String, required: true },
  minPlayers: { type: Number, default: 1 },
  maxPlayers: { type: Number, default: 1 },
  playtime:   { type: Number, default: 0 },
  minPlaytime:{ type: Number, default: 0 },
  maxPlaytime:{ type: Number, default: 0 },

  bggRating:  { type: Number, default: null },
  bayesAverage:{ type: Number, default: null },
  stdDeviation:{ type: Number, default: null },
  usersRated: { type: Number, default: 0 },
  numWeights: { type: Number, default: 0 },
  averageWeight: { type: Number, default: null },

  thumbnail:  { type: String, default: null },
  image:      { type: String, default: null },
  yearPublished:{ type: Number, default: null },
  createdAt:  { type: Date, default: Date.now, immutable: true },
  fetchedAt:  { type: Date, default: Date.now }
});

export default mongoose.model('BoardGame', BoardGameSchema);
