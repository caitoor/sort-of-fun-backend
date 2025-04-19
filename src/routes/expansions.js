// src/routes/expansions.js

import express from 'express';
import {
    listAllExpansions,
    countExpansions,
    getExpansionById
} from '../controllers/expansionsController.js';

const router = express.Router();

// GET /expansions
router.get('/', listAllExpansions);

// GET /expansions/count
router.get('/count', countExpansions);

// GET /expansions/:bggId
router.get('/:bggId', getExpansionById);

export default router;
