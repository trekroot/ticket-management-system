import resend, { EMAIL_FROM } from '../config/resend.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import {
  matchInitiatedTemplate,
  matchAcceptedTemplate,
  matchCancelledTemplate,
  matchCompletedTemplate
} from '../templates/emails.js';

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
function getActorOfTicketUpdate(actingUserId, initiatorUserId, matchedUserId) {
    if (!actingUserId) return 'admin';

    const actingId = actingUserId.toString();
    if (initiatorUserId?.toString() === actingId) return 'initiator';
    if (matchedUserId?.toString() === actingId) return 'matched';
    return 'admin';
}

/**
 * Notify when a match is initiated
 * Notifies the matched user that someone wants to trade
 *
 * @param {Object} matchedTicket - The ticket that received the match request (populated with userId, gameId)
 * @param {Object} initiatorUser - User who initiated { firstName, lastName, username, discordHandle }
 * @param {String} reason - note present if direct match
 */
export async function sendMatchInitiatedNotification(matchedTicket, initiatorUser, reason) {
  try {
    // Get matched user's email
    const matchedUser = await User.findById(matchedTicket.userId).select('email firstName');

    // Send email if user has email address
    if (matchedUser?.email) {
      const template = matchInitiatedTemplate({
        recipientFirstName: matchedUser.firstName,
        initiatorName: getUserDisplayName(initiatorUser),
        ticketType: getTicketType(matchedTicket),
        gameInfo: formatGameInfo(matchedTicket),
        reason
      });

      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM || 'noreply@ticketexchange.me',
        to: matchedUser.email,
        subject: template.subject,
        html: template.html
      });

      if (error) {
        console.error('[Notification] Match initiated email failed:', error);
      } else {
        console.log('[Notification] Match initiated email sent:', data?.id);
      }
    } else {
      console.log('[Notification] No email for matched user, skipping Initiated email to: ', matchedUser._id);
    }

    // Create in-app notification
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
 * Send notification when a match is accepted
 * Only notifies the recipient (the actor who accepted already knows)
 *
 * @param {Object} recipientUser - User to notify { _id, email, firstName, lastName, username, discordHandle }
 * @param {Object} actingUser - User who performed the action (for counterparty info)
 * @param {Object} ticket - Ticket for game info
 */
export async function sendMatchAcceptedNotification(recipientUser, actingUser, ticket) {
  try {
    const gameInfo = formatGameInfo(ticket);

    const ticketType = getTicketType(ticket);

    // Email to recipient only (they get actor's contact info)
    if (recipientUser.email) {
      try {
        const template = matchAcceptedTemplate({
          recipientFirstName: recipientUser.firstName,
          counterpartyName: getUserDisplayName(actingUser),
          counterpartyEmail: actingUser.email,
          counterpartyDiscord: actingUser.discordHandle,
          ticketType,
          gameInfo
        });

        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: recipientUser.email,
          subject: template.subject,
          html: template.html
        });

        if (error) {
          console.error('[Notification] Match accepted email failed:', error);
        } else {
          console.log('[Notification] Match accepted email sent:', data?.id);
        }
      } catch (error) {
        console.error('[Notification] Error sending match accepted email:', error.message);
      }
    } else {
      console.log('[Notification] No email for recipient user, skipping Match Accepted email to: ', recipientUser._id);
    }

    // In-app notification to recipient only
    await createInAppNotification({
      userId: recipientUser._id,
      type: 'match_accepted',
      title: 'Match Accepted!',
      message: `${getUserDisplayName(actingUser)} accepted your match for ${gameInfo}`,
      ticketId: ticket._id,
      fromUserId: actingUser._id,
      fromUserName: getUserDisplayName(actingUser)
    });
  } catch (error) {
    console.error('[Notification] sendMatchAcceptedNotification error:', error.message);
  }
}

/**
 * Send notification when a match is cancelled
 * Notifies both users
 *
 * @param {Object} match - The match object (populated with initiatorTicketId, matchedTicketId)
 * @param {String} userId taking current action
 * @param {String} reason - Cancellation reason
 */
export async function sendMatchCancelledNotification(match, actingUserId, reason) {
  try {
    const gameInfo = formatGameInfo(match.initiatorTicketId);
    // Get both users
    const [initiatorUser, matchedUser] = await Promise.all([
        User.findById(match.initiatorTicketId.userId).select('email firstName lastName username discordHandle'),
        User.findById(match.matchedTicketId.userId).select('email firstName lastName username discordHandle')
      ]);
    const actor = getActorOfTicketUpdate(actingUserId, match.initiatorTicketId.userId, match.matchedTicketId.userId);

    // Email to initiator if not the actor
    if (initiatorUser?.email && actor !== 'initiator') {
      try {
        const template = matchCancelledTemplate({
          recipientFirstName: initiatorUser.firstName,
          otherPartyName: getUserDisplayName(matchedUser),
          reason,
          gameInfo
        });

        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: initiatorUser.email,
          subject: template.subject,
          html: template.html
        });

        if (error) {
          console.error('[Notification] Match cancelled email to initiator failed:', error);
        } else {
          console.log('[Notification] Match cancelled email sent to initiator:', data?.id);
        }
      } catch (e) {
        console.error('[Notification] Error sending cancel to initiator:', e.message);
      }
    } else if (!initiatorUser?.email && actor !== 'initiator') {
      console.log('[Notification] No email for initiator user, skipping Cancelled email to: ', initiatorUser._id);
    }

    // Email to matched user if not actor
    if (matchedUser?.email && actor !== 'matched') {
      try {
        const template = matchCancelledTemplate({
          recipientFirstName: matchedUser.firstName,
          otherPartyName: getUserDisplayName(initiatorUser),
          reason,
          gameInfo
        });

        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: matchedUser.email,
          subject: template.subject,
          html: template.html
        });

        if (error) {
          console.error('[Notification] Match cancelled email to matched user failed:', error);
        } else {
          console.log('[Notification] Match cancelled email sent to matched user:', data?.id);
        }
      } catch (e) {
        console.error('[Notification] Error sending cancel to matched:', e.message);
      }
    } else if (!matchedUser?.email && actor !== 'matched') {
      console.log('[Notification] No email for matched user, skipping Cancelled email to: ', matchedUser._id);
    }
    const cancelledMessage = `Your match for ${gameInfo} has been cancelled${reason ? `: ${reason}` : ''}`;

    // Create in-app notifications for the user not acting
    if (actor !== 'initiator') {
      await createInAppNotification({
        userId: match.initiatorTicketId.userId,
        type: 'match_cancelled',
        title: 'Match Cancelled',
        message,
        matchId: match._id,
        fromUserName: 'System',
        ticketId: match.initiatorTicketId._id,
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
        fromUserName: 'System',
        ticketId: match.matchedTicketId._id
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
    const ticketType = getTicketType(match.initiatorTicketId);
    const actor = getActorOfTicketUpdate(actingUserId, match.initiatorTicketId.userId, match.matchedTicketId.userId);

    // Email to initiator
    if (initiatorUser?.email && actor !== 'initiator') {
      try {
        const template = matchCompletedTemplate({
          recipientFirstName: initiatorUser.firstName,
          otherPartyName: getUserDisplayName(matchedUser),
          ticketType,
          gameInfo
        });

        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: initiatorUser.email,
          subject: template.subject,
          html: template.html
        });

        if (error) {
          console.error('[Notification] Match completed email to initiator failed:', error);
        } else {
          console.log('[Notification] Match completed email sent to initiator:', data?.id);
        }
      } catch (e) {
        console.error('[Notification] Error sending complete to initiator:', e.message);
      }
    } else if (!initiatorUser?.email && actor !== 'initiator') {
      console.log('[Notification] No email for initiator user, skipping Completed email to: ', initiatorUser._id);
    }

    // Email to matched user
    if (matchedUser?.email && actor !== 'matched') {
      try {
        const template = matchCompletedTemplate({
          recipientFirstName: matchedUser.firstName,
          otherPartyName: getUserDisplayName(initiatorUser),
          ticketType,
          gameInfo
        });

        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: matchedUser.email,
          subject: template.subject,
          html: template.html
        });

        if (error) {
          console.error('[Notification] Match completed email to matched user failed:', error);
        } else {
          console.log('[Notification] Match completed email sent to matched user:', data?.id);
        }
      } catch (e) {
        console.error('[Notification] Error sending complete to matched:', e.message);
      }
    } else if (!matchedUser?.email && actor !== 'matched') {
      console.log('[Notification] No email for matched user, skipping Completed email to: ', matchedUser._id);
    }

    const completedMessage = `Your exchange for ${gameInfo} has been completed`;

    // Create in-app notifications for user not acting
    if (actor !== 'initiator') {
      await createInAppNotification({
        userId: match.initiatorTicketId.userId,
        type: 'match_completed',
        title: 'Exchange Complete!',
        message: completedMessage,
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
