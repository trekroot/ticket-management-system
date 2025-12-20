import * as matchService from '../services/matchService.js';
import { logAdminAction } from '../services/adminAuditService.js';

/**
 * Match Controller - handles Match lifecycle actions
 * Business logic lives in matchService.js
 */

/**
 * Check if admin is acting on someone else's match
 * @param {Object} match - Match document (with populated tickets)
 * @param {string} actingUserId - The user performing the action
 * @returns {{ isAdminEdit: boolean, affectedUserIds: string[] }}
 */
function checkAdminEdit(match, actingUserId) {
  const initiatorUserId = match.initiatorTicketId?.userId?.toString();
  const matchedUserId = match.matchedTicketId?.userId?.toString();
  const affectedUserIds = [initiatorUserId, matchedUserId].filter(Boolean);
  const isParticipant = affectedUserIds.includes(actingUserId.toString());

  return { isAdminEdit: !isParticipant, affectedUserIds };
}

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

    // Log if admin acted on someone else's match
    const { isAdminEdit, affectedUserIds } = checkAdminEdit(result.match, userId);
    if (req.user.role === 'admin' && isAdminEdit) {
      await logAdminAction({
        adminId: userId,
        action: 'accept_match',
        targetType: 'Match',
        targetId: matchId,
        affectedUserIds,
        changes: {
          before: { status: result.matchBefore.status },
          after: { status: result.match.status }
        },
        notes: req.body?.reason
      });
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
 * Calculate a pairing score between a trades 
 *
 * @param {Object} tradeRequest - The Trade Request
 * @param {Object} potentialTradeMatch - The Comparison Ticket
 * @returns {Object} { score: Number, reasons: Array }
 */
export function calculateTradePairingScore(tradeRequest, potentialTradeMatch) {
  let score = 0;
  const reasons = [];

  console.log(`[Matchmaker] Calculating score: Trade Request ${tradeRequest._id} vs Trade Match ${potentialTradeMatch._id}`);

  // A. Game Match
  const requestGameId = tradeRequest.gameId._id || tradeRequest.gameId;
  const requestDesiredGameIds = tradeRequest.desiredGameIds;
  const matchGameId = potentialTradeMatch.gameId._id || potentialTradeMatch.gameId;
  const matchDesiredGameIds = potentialTradeMatch.desiredGameIds;
  
  // Full match if games overlap OR allows anyGame
  if ( (matchDesiredGameIds.includes(requestGameId) || tradeRequest.anyGame)
    && (requestDesiredGameIds.includes(matchGameId) || potentialTradeMatch.anyGame) ) {
    score += gameValue;
    reasons.push('Both trades meet Game criteria (+40)');
    console.log(`  [Game] Exact match: +40`);
  } else if ( (matchDesiredGameIds.includes(requestGameId) || tradeRequest.anyGame)
    || (requestDesiredGameIds.includes(matchGameId) || potentialTradeMatch.anyGame) ) {
    // Odd logic but works - one of the two combos aligns
    score += 10;
    reasons.push('One ticket combo meets Game criteria (+10)');
    console.log(`  [Game] Weak partial match: +10`);
  } else {
    reasons.push('No ticket combo meets Game criteria (+10)');
    console.log(`  [Game] Weak partial match: +10`);
  }

  // B. SectionType Match
  const { scoreAdd, reasonsAdd } = sectionTypeScore(tradeRequest, potentialTradeMatch);
  score += scoreAdd;
  reasons.push(reasonsAdd);
  
  // C. Quantity Match
  const tradeTicketQuantity = getNumTicketsFromOffer(tradeRequest);
  const potentialTradeMatchQuantity = getNumTicketsFromOffer(potentialTradeMatch);
  if (tradeTicketQuantity == potentialTradeMatchQuantity) {
    score += qtyValue;
    reasons.push(`Quantity satisfied: ${tradeTicketQuantity} available, ${potentialTradeMatchQuantity} needed (+20)`);
    console.log(`  [Quantity] Satisfied: +20`);
  } else {
    reasons.push(`Insufficient quantity: ${tradeTicketQuantity} available, ${potentialTradeMatchQuantity} needed (+0)`);
    console.log(`  [Quantity] Insufficient: +0`);
  }

  return { score, reasons };
}

/**
 * Lil baby helper function for NumTickets from an offer
 * @param {ticket} ticket
 * @returns {Number} Number of Tickets
 */
function getNumTicketsFromOffer(ticket) {
  return ticket.seats?.length > 0 ? ticket.seats?.length : ticket.numTickets;
}

/**
 * Helper function for sectionType score of a ticket pairing
 * @param {ticket} ticketA
 * @param {ticket} ticketB
 * @returns {Number} score
 */
function sectionTypeScore(ticketA, ticketB) {
  if (ticketA.sectionType === ticketB.sectionType) {
    console.log(`  [Section] Exact match: +30`);
    return {
      scoreAdd: seatValue,
      reasonsAdd: `Exact section match: ${ticketA.sectionType} (+30)`
    };
  } else if (ticketB.anySection) {
    console.log(`  [Section] Any section accepted: +20`);
    return {
      scoreAdd:  seatValue / 2,
      reasonsAdd: `Buyer accepts any section (+20)`
    };
  } else {
    console.log(`  [Section] Mismatch: +0`);
    return {
      scoreAdd: 0,
      reasonsAdd: `Section mismatch: ${ticketA.sectionType} vs ${ticketB.sectionType} (+0)`
    };
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

    // Log if admin acted on someone else's match
    const { isAdminEdit, affectedUserIds } = checkAdminEdit(result.match, userId);
    if (req.user.role === 'admin' && isAdminEdit) {
      await logAdminAction({
        adminId: userId,
        action: 'cancel_match',
        targetType: 'Match',
        targetId: matchId,
        affectedUserIds,
        changes: {
          before: { status: result.matchBefore.status },
          after: { status: result.match.status }
        },
        notes: reason
      });
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

    // Log if admin acted on someone else's match
    const { isAdminEdit, affectedUserIds } = checkAdminEdit(result.match, userId);
    if (req.user.role === 'admin' && isAdminEdit) {
      await logAdminAction({
        adminId: userId,
        action: 'complete_match',
        targetType: 'Match',
        targetId: matchId,
        affectedUserIds,
        changes: {
          before: { status: result.matchBefore.status },
          after: { status: result.match.status }
        },
        notes: req.body?.reason
      });
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
 * Get all matches (admin only)
 * GET /api/matchmaker/admin/matches
 * GET /api/matchmaker/admin/matches?status=pending
 */
export async function getAllMatches(req, res) {
  try {
    const { status } = req.query;

    const result = await matchService.getAllMatches(status);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      count: result.data.length,
      data: result.data
    });
  } catch (error) {
    console.error('[Matchmaker] Error getting all matches:', error);
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
