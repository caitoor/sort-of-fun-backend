// src/models/Tag.js

import mongoose from 'mongoose';

const TagSchema = new mongoose.Schema({
  bggId: { type: Number, required: true, index: true },
  tag: { type: String, required: true }
});

// Prevent duplicates
TagSchema.index({ bggId: 1, tag: 1 }, { unique: true });

export default mongoose.model('Tag', TagSchema, 'tags');
