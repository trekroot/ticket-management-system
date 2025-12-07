import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { isOwnerOrAdmin } from '../middleware/authorize.js';
import {
    getTicketPairings,
    getBestTicketPairings,
    getAllUserTicketMatches
} from '../controllers/matchmakerController.js';

const router = express.Router();

// GET /api/matchmaker - get all pairings
router.get('/', verifyFirebaseToken, getAllUserTicketMatches);

// GET /api/matchmaker/:ticketId - get all pairings (or ?all=true for all positive)
router.get('/:ticketId', verifyFirebaseToken, isOwnerOrAdmin, getTicketPairings);

// GET /api/matchmaker/:ticketId/best - get top 5 pairings
router.get('/:ticketId/best', verifyFirebaseToken, isOwnerOrAdmin, getBestTicketPairings);

export default router;