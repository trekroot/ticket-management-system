import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { isOwner } from '../middleware/authorize.js';
import {
    getPairings,
    getBestPairings
} from '../controllers/matchmakerController.js';

const router = express.Router();

// GET /api/matchmaker/:ticketId - get all pairings (or ?all=true for all positive)
router.get('/:ticketId', verifyFirebaseToken, isOwner, getPairings);

// GET /api/matchmaker/:ticketId/best - get top 5 pairings
router.get('/:ticketId/best', verifyFirebaseToken, isOwner, getBestPairings);

export default router;