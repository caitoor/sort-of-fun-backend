// src/routes/tags.js

import express from 'express';
import Tag from '../models/Tag.js';

const router = express.Router();

/**
 * GET /tags
 * Returns a distinct array of all tags.
 */
router.get('/', async (req, res) => {
  console.log('calling GET /tags ...');
  try {
    const tags = await Tag.distinct('tag');
    res.json(tags);
  } catch (error) {
    console.error('GET /tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * GET /tags/:bggId
 * Returns an array of tags for the specified game.
 */
router.get('/:bggId', async (req, res) => {
  const bggId = parseInt(req.params.bggId, 10);
  try {
    const docs = await Tag.find({ bggId }).lean();
    res.json(docs.map(d => d.tag));
  } catch (error) {
    console.error(`GET /tags/${bggId} error:`, error);
    res.status(500).json({ error: 'Failed to fetch game tags' });
  }
});

/**
 * POST /tags/:bggId
 * Adds a new tag to the specified game.
 */
router.post('/:bggId', async (req, res) => {
  const bggId = parseInt(req.params.bggId, 10);
  let { tag } = req.body;

  // <<< logging payload for debugging >>>
  console.log(`POST /tags/${bggId} called with`, { bggId, tag });

  if (!tag) {
    return res.status(400).json({ error: 'Tag value is required' });
  }
  tag = tag.trim();

  try {
    const doc = await Tag.create({ bggId, tag });
    res.status(201).json({ tag: doc.tag });
  } catch (error) {
    // duplicate‐key error from unique index
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Tag already exists for this game' });
    }
    console.error(`POST /tags/${bggId} error:`, error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

/**
 * DELETE /tags/:bggId/:tag
 * Removes a specific tag from the specified game.
 */
router.delete('/:bggId/:tag', async (req, res) => {
  const bggId = parseInt(req.params.bggId, 10);
  const tag = req.params.tag;
  try {
    await Tag.deleteOne({ bggId, tag });
    res.status(204).end();
  } catch (error) {
    console.error(`DELETE /tags/${bggId}/${tag} error:`, error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
