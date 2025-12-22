import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { isTicketOwnerOrAdmin, isMatchParticipantOrAdmin } from '../middleware/authorize.js';
import {
    initiateMatch,
    acceptMatch,
    cancelMatch,
    completeMatch,
    getUserMatches
} from '../controllers/matchmakerController.js';

const router = express.Router();

// POST /api/matchmaker/:sourceTicketId/match/:targetTicketId - initiate a match between tickets
router.post('/:sourceTicketId/match/:targetTicketId', verifyFirebaseToken, isTicketOwnerOrAdmin(req => req.params.sourceTicketId), initiateMatch);

// GET /api/matchmaker/matches - get all matches (Match records) for user
router.get('/matches', verifyFirebaseToken, getUserMatches);

// Match lifecycle routes (literal paths before :matchId param)
// POST /api/matchmaker/:matchId/accept - accept a pending match
router.post('/:matchId/accept', verifyFirebaseToken, isMatchParticipantOrAdmin(req => req.params.matchId), acceptMatch);

// POST /api/matchmaker/:matchId/cancel - cancel a match
router.post('/:matchId/cancel', verifyFirebaseToken, isMatchParticipantOrAdmin(req => req.params.matchId), cancelMatch);

// POST /api/matchmaker/:matchId/complete - complete an accepted match
router.post('/:matchId/complete', verifyFirebaseToken, isMatchParticipantOrAdmin(req => req.params.matchId), completeMatch);

export default router;