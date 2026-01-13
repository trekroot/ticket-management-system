// import mongoose from 'mongoose'; //for transaction work/future impl
import Match from '../models/Match.js';
import { TicketRequest, BuyRequest, SellRequest, TradeRequest } from '../models/TicketRequest.js';
import User from '../models/User.js';
import { checkPurchaseLimits } from './rateLimitService.js';
import {
  sendMatchInitiatedNotification,
  sendMatchAcceptedNotification,
  sendMatchCancelledNotification,
  sendMatchCompletedNotification
} from './notificationService.js';

/**
 * Match Service
 *
 * Centralizes all match-related business logic.
 * Ensures Match and TicketRequest statuses stay in sync.
 */

/**
 * Initiate a match between two tickets
 * - Creates Match with status 'initiated'
 * - Sets BOTH tickets to 'matched'
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
      initiatorTicketId: initiatorTicket,
      matchedTicketId: matchedTicket,
      status: 'initiated',
      history: [{
        status: 'initiated',
        changedBy: userId,
        notes: 'Match initiated'
      }]
    });

    // Update BOTH tickets to matched
    await Promise.all([
      TicketRequest.findByIdAndUpdate(initiatorTicketId, { status: 'matched' }),
      TicketRequest.findByIdAndUpdate(matchedTicketId, { status: 'matched' })
    ]);

    // Send notification to matched user (fire-and-forget)
    const initiatorUser = await User.findById(userId).select('firstName lastName username discordHandle');
    const populatedMatchedTicket = await TicketRequest.findById(matchedTicketId).populate('gameId');
    sendMatchInitiatedNotification(populatedMatchedTicket, initiatorUser).catch(err =>
      console.error('[MatchService] Notification error:', err.message)
    );

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
      .populate('initiatorTicketId')
      .populate('matchedTicketId');

    if (!match) {
      return { success: false, error: 'Match not found' };
    }
    if (match.status !== 'initiated') {
      return { success: false, error: `Match is ${match.status}, cannot accept` };
    }

    // Store copy of matchBefore
    const matchBefore = match.toObject();

    // Update match
    match.status = 'accepted';
    match.history.push({
      status: 'accepted',
      changedBy: userId,
      notes: 'Match accepted'
    });
    await match.save();

    // Fetch users separately for counterparty snapshots
    const [initiatorUser, matchedUser] = await Promise.all([
      User.findById(match.initiatorTicketId.userId).select('discordHandle username firstName lastName email'),
      User.findById(match.matchedTicketId.userId).select('discordHandle username firstName lastName email')
    ]);

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

    // Update both tickets to matched with counterparty snapshots
    await Promise.all([
      TicketRequest.findByIdAndUpdate(match.initiatorTicketId._id, {
        status: 'matched',
        counterpartySnapshot: matchedSnapshot  // initiator gets matched user's info
      }),
      TicketRequest.findByIdAndUpdate(match.matchedTicketId._id, {
        status: 'matched',
        counterpartySnapshot: initiatorSnapshot  // matched gets initiator's info
      })
    ]);

    // Notify the OTHER user (not the one who performed the action)
    const actorIsInitiator = initiatorUser._id.toString() === userId.toString();
    const recipientUser = actorIsInitiator ? matchedUser : initiatorUser;
    const actorUser = actorIsInitiator ? initiatorUser : matchedUser;
    // Pass the RECIPIENT's ticket, not the actor's
    const recipientTicketId = actorIsInitiator ? match.matchedTicketId._id : match.initiatorTicketId._id;
    const recipientTicket = await TicketRequest.findById(recipientTicketId).populate('gameId');

    sendMatchAcceptedNotification(recipientUser, actorUser, recipientTicket).catch(err =>
      console.error('[MatchService] Notification error:', err.message)
    );

    return { success: true, match, matchBefore };
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
    
    const matchBefore = match.toObject();

    // Update match
    match.status = 'cancelled';
    match.history.push({
      status: 'cancelled',
      changedBy: userId,
      notes: reason || 'Match cancelled'
    });
    await match.save();

    // Reopen tickets, or deactivate if they were auto-created for direct match
    const initiatorStatus = match.initiatorTicketId.isDirectMatch ? 'deactivated' : 'open';
    const matchedStatus = match.matchedTicketId.isDirectMatch ? 'deactivated' : 'open';

    await Promise.all([
      TicketRequest.findByIdAndUpdate(match.initiatorTicketId._id, {
        status: initiatorStatus, counterpartySnapshot: null
      }),
      TicketRequest.findByIdAndUpdate(match.matchedTicketId._id, {
        status: matchedStatus,
        counterpartySnapshot: null
      })
    ]);

    // Send notification to both users (fire-and-forget)
    // Populate gameId for email content
    await match.populate('initiatorTicketId.gameId');
    sendMatchCancelledNotification(match, userId, reason).catch(err =>
      console.error('[MatchService] Notification error:', err.message)
    );

    return { success: true, match, matchBefore };
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
      .populate('initiatorTicketId')
      .populate('matchedTicketId');

    if (!match) {
      return { success: false, error: 'Match not found' };
    }
    if (match.status !== 'accepted') {
      return { success: false, error: `Match must be accepted before completing (currently: ${match.status})` };
    }

    // Snapshot before changes (userId is ObjectId here, not populated)
    const matchBefore = match.toObject();

    // Update match
    match.status = 'completed';
    match.history.push({
      status: 'completed',
      changedBy: userId,
      notes: 'Match completed'
    });
    await match.save();

    // Complete both tickets with counterparty snapshots
    await Promise.all([
      TicketRequest.findByIdAndUpdate(match.initiatorTicketId._id, { status: 'completed' }),
      TicketRequest.findByIdAndUpdate(match.matchedTicketId._id, { status: 'completed' })
    ]);

    // Send notification to both users (fire-and-forget)
    // Populate gameId for email content
    await match.populate('initiatorTicketId.gameId');
    sendMatchCompletedNotification(match, userId).catch(err =>
      console.error('[MatchService] Notification error:', err.message)
    );

    return { success: true, match, matchBefore };
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
          { path: 'gameId', select: 'opponent date venue' },
          { path: 'gamesOffered', select: 'opponent date venue' },
          { path: 'gamesDesired', select: 'opponent date venue' }
        ]
      })
      .populate({
        path: 'matchedTicketId',
        populate: [
          { path: 'userId', select: 'username discordHandle email firstName lastName' },
          { path: 'gameId', select: 'opponent date venue' },
          { path: 'gamesOffered', select: 'opponent date venue' },
          { path: 'gamesDesired', select: 'opponent date venue' }
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
 * Get all matches (admin only)
 *
 * @param {string} status - Optional status filter
 * @returns {Object} { success, matches, error }
 */
export async function getAllMatches(status = null) {
  try {
    const query = {};
    if (status) {
      query.status = status;
    }

    const matches = await Match.find(query)
      .populate({
        path: 'initiatorTicketId',
        populate: [
          { path: 'userId', select: 'username discordHandle email firstName lastName' },
          { path: 'gameId', select: 'opponent date venue' },
          { path: 'gamesOffered', select: 'opponent date venue' },
          { path: 'gamesDesired', select: 'opponent date venue' }
        ]
      })
      .populate({
        path: 'matchedTicketId',
        populate: [
          { path: 'userId', select: 'username discordHandle email firstName lastName' },
          { path: 'gameId', select: 'opponent date venue' },
          { path: 'gamesOffered', select: 'opponent date venue' },
          { path: 'gamesDesired', select: 'opponent date venue' }
        ]
      })
      .sort({ updatedAt: -1 });

    return { success: true, data: matches };
  } catch (error) {
    console.error('[MatchService] getAllMatches error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get minimal match info for a list of tickets
 * Returns a Map of ticketId -> { matchId, matchStatus, isInitiator, awaitingMyAction }
 *
 * @param {Array} ticketIds - Array of ticket ObjectIds
 * @returns {Map} ticketId string -> matchInfo object
 */
export async function getMatchInfoForTickets(ticketIds) {
  const activeMatches = await Match.find({
    $or: [
      { initiatorTicketId: { $in: ticketIds } },
      { matchedTicketId: { $in: ticketIds } }
    ],
    status: { $in: ['initiated', 'accepted'] }
  }).lean();

  const matchInfoMap = new Map();
  const ticketIdStrings = ticketIds.map(id => id.toString());

  for (const match of activeMatches) {
    const initiatorIdStr = match.initiatorTicketId.toString();
    const matchedIdStr = match.matchedTicketId.toString();
    const isInitiator = ticketIdStrings.includes(initiatorIdStr);

    const userTicketId = isInitiator ? initiatorIdStr : matchedIdStr;

    matchInfoMap.set(userTicketId, {
      matchId: match._id,
      matchStatus: match.status,
      isInitiator,
      awaitingMyAction: !isInitiator && match.status === 'initiated'
    });
  }

  return matchInfoMap;
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
export async function initiateDirectMatch(targetTicketId, userId, reason = '') {
  try {
    // Get the target ticket
    const targetTicket = await TicketRequest.findById(targetTicketId)
      .populate('gameId').populate('gamesOffered').populate('gamesDesired');

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
    const isTradeRequest = targetTicket.__t === 'TradeRequest';
    let createdTicket;

    // Check purchase rate limits when creating a BuyRequest
    if (isSellRequest) {
      const limitCheck = await checkPurchaseLimits(userId, targetTicket.gameId._id);
      if (!limitCheck.allowed) {
        return { success: false, error: limitCheck.reason };
      }
    }

    if (isSellRequest) {
      // Target is selling, create a BuyRequest for initiator
      createdTicket = await BuyRequest.create({
        userId,
        gameId: targetTicket.gameId._id,
        sectionTypeDesired: targetTicket.sectionTypeOffered,
        numTickets: targetTicket.numTickets || targetTicket.seats?.length || 1,
        anySectionDesired: false,
        status: 'matched',
        isDirectMatch: true,
        maxPrice: targetTicket.minPrice,
        userSnapshot: {
          discordHandle: user.discordHandle,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        notes: `Buy initiated from seller listing. Notes: ${reason}`
      });
    } else if (!isTradeRequest) {
      // Target is buying, create a SellRequest for initiator
      // Note: This is less common - usually buyers don't have specific inventory
      // You may want to restrict this or handle differently
      createdTicket = await SellRequest.create({
        userId,
        gameId: targetTicket.gameId._id,
        sectionTypeOffered: targetTicket.sectionTypeDesired || 'See Notes',
        numTickets: targetTicket.numTickets || 1,
        status: 'matched',
        isDirectMatch: true,
        userSnapshot: {
          discordHandle: user.discordHandle,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        notes: `Sell initiated from buy listing. Notes: ${reason}`
      });
    } else {
      // Trade request direct match
      createdTicket = await TradeRequest.create({
        userId,
        gamesDesired: targetTicket.gamesOffered,
        gamesOffered: targetTicket.gamesDesired,
        fullSeasonTrade: targetTicket.fullSeasonTrade,
        status: 'matched',
        sectionTypeOffered: 'See Notes',
        sectionTypeDesired: targetTicket.sectionTypeOffered,
        isDirectMatch: true,
        userSnapshot: {
          discordHandle: user.discordHandle,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        notes: `Trade initiated from listing. Notes: ${reason}`
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
        notes: `Direct match initiated (ticket auto-created). Initiator Note: ${reason}`
      }]
    });

    // Update target ticket to matched (has incoming match request)
    await TicketRequest.findByIdAndUpdate(targetTicketId, { status: 'matched' });

    // Notify target user (fire-and-forget)
    sendMatchInitiatedNotification(targetTicket, user, reason).catch(err =>
      console.error('[MatchService] Notification error:', err.message)
    );

    return { success: true, match, createdTicket };
  } catch (error) {
    console.error('[MatchService] initiateDirectMatch error:', error);
    return { success: false, error: error.message };
  }
}