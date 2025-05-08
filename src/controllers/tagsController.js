// src/controllers/tagsController.js

import Tag from '../models/Tag.js';

/**
 * GET /tags
 * Returns a distinct array of all tags.
 */
export async function listAllTags(req, res) {
    try {
        const tags = await Tag.distinct('tag');
        res.json(tags);
    } catch (error) {
        console.error('listAllTags error:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
}

/**
 * GET /tags/:bggId
 * Returns all tags for the specified game.
 */
export async function getGameTags(req, res) {
    const bggId = parseInt(req.params.bggId, 10);
    try {
        const docs = await Tag.find({ bggId }).lean();
        res.json(docs.map(d => d.tag));
    } catch (error) {
        console.error(`getGameTags(${bggId}) error:`, error);
        res.status(500).json({ error: 'Failed to fetch game tags' });
    }
}

/**
 * POST /tags/:bggId
 * Adds a tag to the specified game.
 */
// src/controllers/tagsController.js

export async function addTag(req, res) {
    console.log("📝 POST /tags/:bggId payload — params:", req.params, "body:", req.body);
  
    const bggId = parseInt(req.params.bggId, 10);
    let { tag } = req.body;
    if (!tag) {
      return res.status(400).json({ error: 'Tag is required' });
    }
    tag = tag.trim();
  
    try {
      const doc = await Tag.create({ bggId, tag });
      return res.status(201).json({ tag: doc.tag });
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key
        return res.status(409).json({ error: 'Tag already exists for this game' });
      }
      console.error(`addTag(${bggId}) error:`, error);
      res.status(500).json({ error: 'Failed to add tag' });
    }
  }


/**
 * DELETE /tags/:bggId/:tag
 * Removes a specific tag from the specified game.
 */
export async function deleteTag(req, res) {
    const bggId = parseInt(req.params.bggId, 10);
    const tag = req.params.tag;
    try {
        await Tag.deleteOne({ bggId, tag });
        res.status(204).end();
    } catch (error) {
        console.error(`deleteTag(${bggId}, ${tag}) error:`, error);
        res.status(500).json({ error: 'Failed to delete tag' });
    }
}
