import * as matchService from '../services/matchService.js';

/**
 * Match Controller - handles Match lifecycle actions
 * Business logic lives in matchService.js
 */

/**
 * Initiate a match between two tickets
 * POST /api/matchmaker/:sourceTicketId/match/:targetTicketId
 */
export async function initiateMatch(req, res) {
  try {
    const { sourceTicketId, targetTicketId } = req.params;
    const userId = req.user._id;

    const result = await matchService.initiateMatch(sourceTicketId, targetTicketId, userId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      match: result.match
    });
  } catch (error) {
    console.error('[Matchmaker] Error initiating match:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate match', details: error.message });
  }
}

/**
 * Accept a pending match
 * POST /api/matchmaker/:matchId/accept
 */
export async function acceptMatch(req, res) {
  try {
    const { matchId } = req.params;
    const userId = req.user._id;

    const result = await matchService.acceptMatch(matchId, userId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      match: result.match
    });
  } catch (error) {
    console.error('[Matchmaker] Error accepting match:', error);
    res.status(500).json({ success: false, error: 'Failed to accept match', details: error.message });
  }
}

/**
 * Cancel a match
 * POST /api/matchmaker/:matchId/cancel
 */
export async function cancelMatch(req, res) {
  try {
    const { matchId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const result = await matchService.cancelMatch(matchId, userId, reason);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      match: result.match
    });
  } catch (error) {
    console.error('[Matchmaker] Error cancelling match:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel match', details: error.message });
  }
}

/**
 * Complete a match
 * POST /api/matchmaker/:matchId/complete
 */
export async function completeMatch(req, res) {
  try {
    const { matchId } = req.params;
    const userId = req.user._id;

    const result = await matchService.completeMatch(matchId, userId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      match: result.match
    });
  } catch (error) {
    console.error('[Matchmaker] Error completing match:', error);
    res.status(500).json({ success: false, error: 'Failed to complete match', details: error.message });
  }
}

/**
 * Get all matches for the current user
 * GET /api/matchmaker/matches
 * GET /api/matchmaker/matches?status=pending
 */
export async function getUserMatches(req, res) {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const result = await matchService.getMatchesForUser(userId, status);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      matches: result.matches
    });
  } catch (error) {
    console.error('[Matchmaker] Error getting user matches:', error);
    res.status(500).json({ success: false, error: 'Failed to get matches', details: error.message });
  }
}

/**
 * Initiate a direct match (without having your own ticket)
 * POST /api/matchmaker/direct/:targetTicketId
 */
export async function initiateDirectMatch(req, res) {
  try {
    const { targetTicketId } = req.params;
    const userId = req.user._id;

    const result = await matchService.initiateDirectMatch(targetTicketId, userId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      match: result.match,
      createdTicket: result.createdTicket
    });
  } catch (error) {
    console.error('[Matchmaker] Error initiating direct match:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate direct match', details: error.message });
  }
}
