import User from '../models/User.js';
import Notification from '../models/Notification.js';

/**
 * Notification Service
 *
 * Creates in-app notifications for match lifecycle events.
 * All functions are fire-and-forget safe (catch errors internally).
 */

/**
 * Create an in-app notification (bell icon)
 */
async function createInAppNotification({ userId, type, title, message, matchId, ticketId, fromUserId, fromUserName, actionable }) {
  try {
    await Notification.create({
      userId,
      type,
      title,
      message,
      matchId,
      ticketId,
      fromUserId,
      fromUserName,
      actionable
    });
    console.log(`[Notification] In-app notification created for user ${userId}: ${type}`);
  } catch (error) {
    console.error('[Notification] Failed to create in-app notification:', error.message);
  }
}

/**
 * Format game info for display
 */
function formatGameInfo(ticket) {
  if (ticket.gameId?.opponent) {
    const date = ticket.gameId.date
      ? new Date(ticket.gameId.date).toLocaleDateString()
      : '';
    return `vs ${ticket.gameId.opponent}${date ? ` (${date})` : ''}`;
  }
  if (ticket.gamesOffered?.length > 0) {
    return `Trade: ${ticket.gamesOffered.length} game(s)`;
  }
  return 'Ticket Exchange';
}

/**
 * Get user's display name
 */
function getUserDisplayName(user) {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.username || user.discordHandle || 'A user';
}

/**
 * Determine who performed the action
 */
function getActor(actingUserId, initiatorUserId, matchedUserId) {
  if (initiatorUserId?.toString() === actingUserId?.toString()) {
    return 'initiator';
  } else if (matchedUserId?.toString() === actingUserId?.toString()) {
    return 'matched';
  }
  return 'admin';
}

/**
 * Notify when a match is initiated
 * Notifies the matched user that someone wants to trade
 */
export async function sendMatchInitiatedNotification(matchedTicket, initiatorUser) {
  try {
    await createInAppNotification({
      userId: matchedTicket.userId,
      type: 'match_initiated',
      title: 'New Match Request',
      message: `${getUserDisplayName(initiatorUser)} wants to match with your ticket for ${formatGameInfo(matchedTicket)}`,
      ticketId: matchedTicket._id,
      fromUserId: initiatorUser._id,
      fromUserName: getUserDisplayName(initiatorUser)
    });
  } catch (error) {
    console.error('[Notification] sendMatchInitiatedNotification error:', error.message);
  }
}

/**
 * Notify when a match is accepted
 * Only notifies the recipient (the actor already knows)
 */
export async function sendMatchAcceptedNotification(recipientUser, actorUser, ticket) {
  try {
    const gameInfo = formatGameInfo(ticket);

    await createInAppNotification({
      userId: recipientUser._id,
      type: 'match_accepted',
      title: 'Match Accepted!',
      message: `${getUserDisplayName(actorUser)} accepted your match for ${gameInfo}`,
      ticketId: ticket._id,
      fromUserId: actorUser._id,
      fromUserName: getUserDisplayName(actorUser)
    });
  } catch (error) {
    console.error('[Notification] sendMatchAcceptedNotification error:', error.message);
  }
}

/**
 * Notify when a match is cancelled
 * Notifies the user who didn't perform the action
 */
export async function sendMatchCancelledNotification(match, reason, actingUserId) {
  try {
    const gameInfo = formatGameInfo(match.initiatorTicketId);
    const actor = getActor(actingUserId, match.initiatorTicketId.userId, match.matchedTicketId.userId);
    const message = `Your match for ${gameInfo} has been cancelled${reason ? `: "${reason}"` : ''}`;

    // Notify initiator if they didn't cancel
    if (actor !== 'initiator') {
      await createInAppNotification({
        userId: match.initiatorTicketId.userId,
        type: 'match_cancelled',
        title: 'Match Cancelled',
        message,
        matchId: match._id,
        ticketId: match.initiatorTicketId._id,
        fromUserName: 'System',
        actionable: !match.initiatorTicketId.isDirectMatch // special case where initiator was direct match (ticket is DEACTIVATED)
      });
    }

    // Notify matched user if they didn't cancel
    if (actor !== 'matched') {
      await createInAppNotification({
        userId: match.matchedTicketId.userId,
        type: 'match_cancelled',
        title: 'Match Cancelled',
        message,
        matchId: match._id,
        ticketId: match.matchedTicketId._id,
        fromUserName: 'System'
      });
    }
  } catch (error) {
    console.error('[Notification] sendMatchCancelledNotification error:', error.message);
  }
}

/**
 * Notify when a match is completed
 * Notifies the user who didn't perform the action
 */
export async function sendMatchCompletedNotification(match, actingUserId) {
  try {
    const [initiatorUser, matchedUser] = await Promise.all([
      User.findById(match.initiatorTicketId.userId).select('firstName lastName username discordHandle'),
      User.findById(match.matchedTicketId.userId).select('firstName lastName username discordHandle')
    ]);

    const gameInfo = formatGameInfo(match.initiatorTicketId);
    const actor = getActor(actingUserId, match.initiatorTicketId.userId, match.matchedTicketId.userId);
    const message = `Your exchange for ${gameInfo} has been completed`;

    // Notify initiator if they didn't complete
    if (actor !== 'initiator') {
      await createInAppNotification({
        userId: match.initiatorTicketId.userId,
        type: 'match_completed',
        title: 'Exchange Complete!',
        message,
        matchId: match._id,
        ticketId: match.initiatorTicketId._id,
        fromUserName: getUserDisplayName(matchedUser)
      });
    }

    // Notify matched user if they didn't complete
    if (actor !== 'matched') {
      await createInAppNotification({
        userId: match.matchedTicketId.userId,
        type: 'match_completed',
        title: 'Exchange Complete!',
        message,
        matchId: match._id,
        ticketId: match.matchedTicketId._id,
        fromUserName: getUserDisplayName(initiatorUser)
      });
    }
  } catch (error) {
    console.error('[Notification] sendMatchCompletedNotification error:', error.message);
  }
}
