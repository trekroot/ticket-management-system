import mongoose from 'mongoose';
import Match from '../models/Match.js';
import { TicketRequest, BuyRequest, SellRequest } from '../models/TicketRequest.js';
import User from '../models/User.js';

/**
 * Match Service
 *
 * Centralizes all match-related business logic.
 * Ensures Match and TicketRequest statuses stay in sync.
 */

/**
 * Initiate a match between two tickets
 * - Creates Match with status 'initiated'
 * - Sets BOTH tickets to 'pending'
 *
 * @param {string} initiatorTicketId - Ticket ID of the user initiating
 * @param {string} matchedTicketId - Ticket ID they want to match with
 * @param {string} userId - User ID initiating the match
 * @returns {Object} { success, match, error }
 */
export async function initiateMatch(initiatorTicketId, matchedTicketId, userId) {
  try {
    // Verify both tickets exist and are open
    const [initiatorTicket, matchedTicket] = await Promise.all([
      TicketRequest.findById(initiatorTicketId),
      TicketRequest.findById(matchedTicketId)
    ]);

    if (!initiatorTicket) {
      return { success: false, error: 'Your ticket not found' };
    }
    if (!matchedTicket) {
      return { success: false, error: 'Matched ticket not found' };
    }
    if (initiatorTicket.status !== 'open') {
      return { success: false, error: 'Your ticket is not available for matching' };
    }
    if (matchedTicket.status !== 'open') {
      return { success: false, error: 'Matched ticket is no longer available' };
    }

    // Verify initiator owns the ticket
    // TODO: low priority - can this be handled in authorize/middleware?
    if (initiatorTicket.userId.toString() !== userId.toString()) {
      return { success: false, error: 'Not authorized to initiate match for this ticket' };
    }

    // Create the match
    const match = await Match.create({
      initiatorTicketId,
      matchedTicketId,
      status: 'initiated',
      history: [{
        status: 'initiated',
        changedBy: userId,
        notes: 'Match initiated'
      }]
    });

    // Update BOTH tickets to pending
    await Promise.all([
      TicketRequest.findByIdAndUpdate(initiatorTicketId, { status: 'pending' }),
      TicketRequest.findByIdAndUpdate(matchedTicketId, { status: 'pending' })
    ]);

    return { success: true, match };
  } catch (error) {
    console.error('[MatchService] initiateMatch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Accept an initiated match
 * - Match status → 'accepted'
 * - Both tickets → 'matched'
 *
 * @param {string} matchId - Match ID to accept
 * @param {string} userId - User ID accepting (must own matchedTicket)
 * @returns {Object} { success, match, error }
 */
export async function acceptMatch(matchId, userId) {
  try {
    const match = await Match.findById(matchId)
      .populate('matchedTicketId');

    if (!match) {
      return { success: false, error: 'Match not found' };
    }
    if (match.status !== 'initiated') {
      return { success: false, error: `Match is ${match.status}, cannot accept` };
    }

    // Verify user owns the matched ticket (they're the one accepting)
    // TODO: verify that this is now correctly handled in authorize/middleware?
    // if (match.matchedTicketId.userId.toString() !== userId.toString()) {
    //   return { success: false, error: 'Not authorized to accept this match' };
    // }

    // Update match
    match.status = 'accepted';
    match.history.push({
      status: 'accepted',
      changedBy: userId,
      notes: 'Match accepted'
    });
    await match.save();

    // Update both tickets to 'matched'
    await Promise.all([
      TicketRequest.findByIdAndUpdate(match.initiatorTicketId, { status: 'matched' }),
      TicketRequest.findByIdAndUpdate(match.matchedTicketId._id, { status: 'matched' })
    ]);

    return { success: true, match };
  } catch (error) {
    console.error('[MatchService] acceptMatch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a match
 * - Match status → 'cancelled'
 * - Both tickets → 'open' (re-available)
 *
 * @param {string} matchId - Match ID to cancel
 * @param {string} userId - User ID cancelling
 * @param {string} reason - Optional reason for cancellation
 * @returns {Object} { success, match, error }
 */
export async function cancelMatch(matchId, userId, reason = '') {
  try {
    const match = await Match.findById(matchId)
      .populate('initiatorTicketId')
      .populate('matchedTicketId');

    if (!match) {
      return { success: false, error: 'Match not found' };
    }
    if (['completed', 'cancelled', 'expired'].includes(match.status)) {
      return { success: false, error: `Match is already ${match.status}` };
    }

    // Update match
    match.status = 'cancelled';
    match.history.push({
      status: 'cancelled',
      changedBy: userId,
      notes: reason || 'Match cancelled'
    });
    await match.save();

    // Reopen both tickets
    await Promise.all([
      TicketRequest.findByIdAndUpdate(match.initiatorTicketId._id, { status: 'open' }),
      TicketRequest.findByIdAndUpdate(match.matchedTicketId._id, { status: 'open' })
    ]);

    return { success: true, match };
  } catch (error) {
    console.error('[MatchService] cancelMatch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete a match (transaction finished)
 * - Match status → 'completed'
 * - Both tickets → 'completed'
 *
 * @param {string} matchId - Match ID to complete
 * @param {string} userId - User ID completing
 * @returns {Object} { success, match, error }
 */
export async function completeMatch(matchId, userId) {
  try {
    const match = await Match.findById(matchId)
      .populate({
        path: 'initiatorTicketId',
        populate: { path: 'userId', select: 'discordHandle username firstName lastName email' }
      })
      .populate({
        path: 'matchedTicketId',
        populate: { path: 'userId', select: 'discordHandle username firstName lastName email' }
      });

    if (!match) {
      return { success: false, error: 'Match not found' };
    }
    if (match.status !== 'accepted') {
      return { success: false, error: `Match must be accepted before completing (currently: ${match.status})` };
    }

    // Either party can mark complete
    const isInitiator = match.initiatorTicketId.userId._id.toString() === userId.toString();
    const isMatched = match.matchedTicketId.userId._id.toString() === userId.toString();

    // TODO: low priority - can this be handled in authorize/middleware?
    if (!isInitiator && !isMatched) {
      return { success: false, error: 'Not authorized to complete this match' };
    }

    // Update match
    match.status = 'completed';
    match.history.push({
      status: 'completed',
      changedBy: userId,
      notes: 'Match completed'
    });
    await match.save();

    // Build counterparty snapshots (freeze user info at completion time)
    const initiatorUser = match.initiatorTicketId.userId;
    const matchedUser = match.matchedTicketId.userId;

    const initiatorSnapshot = {
      discordHandle: initiatorUser.discordHandle,
      username: initiatorUser.username,
      firstName: initiatorUser.firstName,
      lastName: initiatorUser.lastName,
      email: initiatorUser.email
    };

    const matchedSnapshot = {
      discordHandle: matchedUser.discordHandle,
      username: matchedUser.username,
      firstName: matchedUser.firstName,
      lastName: matchedUser.lastName,
      email: matchedUser.email
    };

    // Complete both tickets with counterparty snapshots
    await Promise.all([
      TicketRequest.findByIdAndUpdate(match.initiatorTicketId._id, {
        status: 'completed',
        counterpartySnapshot: matchedSnapshot  // initiator gets matched user's info
      }),
      TicketRequest.findByIdAndUpdate(match.matchedTicketId._id, {
        status: 'completed',
        counterpartySnapshot: initiatorSnapshot  // matched gets initiator's info
      })
    ]);

    return { success: true, match };
  } catch (error) {
    console.error('[MatchService] completeMatch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get matches for a user (across all their tickets)
 *
 * @param {string} userId - User ID
 * @param {string} status - Optional status filter
 * @returns {Object} { success, matches, error }
 */
export async function getMatchesForUser(userId, status = null) {
  try {
    // Find all tickets belonging to user
    const userTickets = await TicketRequest.find({ userId }).select('_id');
    const ticketIds = userTickets.map(t => t._id);

    // Find matches involving any of those tickets
    const query = {
      $or: [
        { initiatorTicketId: { $in: ticketIds } },
        { matchedTicketId: { $in: ticketIds } }
      ]
    };

    // TODO: consider if a "initiated, accepted" default filter is best.
    if (status) {
      query.status = status;
    }

    const matches = await Match.find(query)
      .populate({
        path: 'initiatorTicketId',
        populate: [
          { path: 'userId', select: 'username discordHandle email firstName lastName' },
          { path: 'gameId', select: 'opponent date venue' }
        ]
      })
      .populate({
        path: 'matchedTicketId',
        populate: [
          { path: 'userId', select: 'username discordHandle email firstName lastName' },
          { path: 'gameId', select: 'opponent date venue' }
        ]
      })
      .sort({ updatedAt: -1 });

    return { success: true, matches };
  } catch (error) {
    console.error('[MatchService] getMatchesForUser error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initiate a direct match - auto-creates a ticket for the initiator
 * Used when user wants to match with a ticket but doesn't have their own
 *
 * @param {string} targetTicketId - The ticket they want to match with
 * @param {string} userId - User ID initiating
 * @returns {Object} { success, match, createdTicket, error }
 */
// TODO - add transation for mongoDB to ensure ALL OR NOTHING UPDATES
export async function initiateDirectMatch(targetTicketId, userId) {
  try {
    // Get the target ticket
    const targetTicket = await TicketRequest.findById(targetTicketId).populate('gameId');

    if (!targetTicket) {
      return { success: false, error: 'Target ticket not found' };
    }
    if (targetTicket.status !== 'open') {
      return { success: false, error: 'Target ticket is no longer available' };
    }
    if (targetTicket.userId.toString() === userId.toString()) {
      return { success: false, error: 'Cannot match with your own ticket' };
    }

    // Get user info for snapshot
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Determine what type of ticket to create (opposite of target)
    const isSellRequest = targetTicket.__t === 'SellRequest';
    let createdTicket;

    if (isSellRequest) {
      // Target is selling, create a BuyRequest for initiator
      createdTicket = await BuyRequest.create({
        userId,
        gameId: targetTicket.gameId._id,
        sectionTypeDesired: targetTicket.sectionTypeOffered,
        numTickets: targetTicket.numTickets || targetTicket.seats?.length || 1,
        anySection: false,
        status: 'pending',
        isDirectMatch: true,
        userSnapshot: {
          discordHandle: user.discordHandle,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        notes: `Direct match with ticket ${targetTicketId}`
      });
    } else {
      // Target is buying, create a SellRequest for initiator
      // Note: This is less common - usually buyers don't have specific inventory
      // You may want to restrict this or handle differently
      createdTicket = await SellRequest.create({
        userId,
        gameId: targetTicket.gameId._id,
        sectionTypeOffered: targetTicket.sectionTypeDesired || 'standard',
        numTickets: targetTicket.numTickets || 1,
        status: 'pending',
        isDirectMatch: true,
        userSnapshot: {
          discordHandle: user.discordHandle,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        notes: `Direct match with ticket ${targetTicketId}`
      });
    }

    // Create the match
    const match = await Match.create({
      initiatorTicketId: createdTicket._id,
      matchedTicketId: targetTicketId,
      status: 'initiated',
      history: [{
        status: 'initiated',
        changedBy: userId,
        notes: 'Direct match initiated (ticket auto-created)'
      }]
    });

    // Update target ticket to pending (has incoming match request)
    await TicketRequest.findByIdAndUpdate(targetTicketId, { status: 'pending' });

    return { success: true, match, createdTicket };
  } catch (error) {
    console.error('[MatchService] initiateDirectMatch error:', error);
    return { success: false, error: error.message };
  }
}