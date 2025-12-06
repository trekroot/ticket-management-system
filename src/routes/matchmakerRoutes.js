import express from 'express';
import {
    getPairings,
    getBestPairings
} from '../controllers/matchmakerController.js';

const router = express.Router();

// GET /api/matchmaker/:ticketId - get all pairings (or ?all=true for all positive)
router.get('/:ticketId', getPairings);

// GET /api/matchmaker/:ticketId/best - get top 5 pairings
router.get('/:ticketId/best', getBestPairings);

export default router;