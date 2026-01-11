import express from 'express';
import { verifyUserAuthenticated } from '../middleware/auth.js';
import { isTicketOwnerOrAdmin, isMatchParticipantOrAdmin, isAdmin } from '../middleware/authorize.js';
import {
    initiateMatch,
    initiateDirectMatch,
    acceptMatch,
    cancelMatch,
    completeMatch,
    getUserMatches,
    getAllMatches
} from '../controllers/matchmakerController.js';

const router = express.Router();

// POST /api/matchmaker/:sourceTicketId/match/:targetTicketId - initiate a match between tickets
router.post('/:sourceTicketId/match/:targetTicketId', verifyUserAuthenticated, isTicketOwnerOrAdmin(req => req.params.sourceTicketId), initiateMatch);

// GET /api/matchmaker/matches - get all matches (Match records) for user
router.get('/matches', verifyUserAuthenticated, getUserMatches);

// GET /api/matchmaker/admin/matches - get all matches (admin only)
router.get('/admin/matches', verifyUserAuthenticated, isAdmin, getAllMatches);

// POST /api/matchmaker/direct/:targetTicketId - initiate match without own ticket (auto-creates one)
router.post('/direct/:targetTicketId', verifyUserAuthenticated, initiateDirectMatch);

// Match lifecycle routes (literal paths before :matchId param)
// POST /api/matchmaker/:matchId/accept - accept an initiated match
router.post('/:matchId/accept', verifyUserAuthenticated, isMatchParticipantOrAdmin(req => req.params.matchId), acceptMatch);

// POST /api/matchmaker/:matchId/cancel - cancel a match
router.post('/:matchId/cancel', verifyUserAuthenticated, isMatchParticipantOrAdmin(req => req.params.matchId), cancelMatch);

// POST /api/matchmaker/:matchId/complete - complete an accepted match
router.post('/:matchId/complete', verifyUserAuthenticated, isMatchParticipantOrAdmin(req => req.params.matchId), completeMatch);

export default router;