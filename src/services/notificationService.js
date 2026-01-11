// import resend, { EMAIL_FROM } from '../config/resend.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
// import {
//   matchInitiatedTemplate,
//   matchAcceptedTemplate,
//   matchCancelledTemplate,
//   matchCompletedTemplate
// } from '../templates/emails.js';

/**
 * Notification Service
 *
 * Sends email notifications and creates in-app notifications for match lifecycle events.
 * All functions are fire-and-forget safe (catch errors internally).
 */

/**
 * Create an in-app notification (bell icon)
 */
async function createInAppNotification({ userId, type, title, message, matchId, fromUserId, fromUserName }) {
  try {
    await Notification.create({
      userId,
      type,
      title,
      message,
      matchId,
      fromUserId,
      fromUserName
    });
    console.log(`[Notification] In-app notification created for user ${userId}: ${type}`);
  } catch (error) {
    console.error('[Notification] Failed to create in-app notification:', error.message);
  }
}

/**
 * Format game info for display in emails
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
 * Get ticket type for display
 */
function getTicketType(ticket) {
  const type = ticket.__t || ticket.constructor?.modelName || 'Ticket';
  return type.replace('Request', '');
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
 * Get actor of the action
 */
function getActorOfTicketUpdate(actingUserId, initiatorUserId, matchedUserId) {
    let actor = 'admin';
    if (initiatorUserId === actingUserId) {
      actor = 'initiator';
    } else if (matchedUserId === actingUserId) {
      actor = 'matched';
    }
    return actor;
}

/**
 * Send notification when a match is initiated
 * Notifies the matched user that someone wants to trade
 *
 * @param {Object} matchedTicket - The ticket that received the match request (populated with userId, gameId)
 * @param {Object} initiatorUser - User who initiated { firstName, lastName, username, discordHandle }
 */
export async function sendMatchInitiatedNotification(matchedTicket, initiatorUser) {
  try {
    // Get matched user's email
    const matchedUser = await User.findById(matchedTicket.userId).select('email firstName');
    if (!matchedUser?.email) {
      console.log('[Notification] No email for matched user, skipping');
      return { success: false, error: 'No email address' };
    }

    const template = matchInitiatedTemplate({
      initiatorName: getUserDisplayName(initiatorUser),
      ticketType: getTicketType(matchedTicket),
      gameInfo: formatGameInfo(matchedTicket)
    });

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: matchedUser.email,
      subject: template.subject,
      html: template.html
    });

    if (error) {
      console.error('[Notification] Match initiated email failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[Notification] Match initiated email sent:', data?.id);


    // Create in-app notification
    await createInAppNotification({
      userId: matchedTicket.userId,
      type: 'match_initiated',
      title: 'New Match Request',
      message: `${getUserDisplayName(initiatorUser)} wants to match with your ticket for ${formatGameInfo(matchedTicket)}`,
      fromUserId: initiatorUser._id,
      ticketId: matchedTicket._id,
      fromUserName: getUserDisplayName(initiatorUser)
    });

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('[Notification] sendMatchInitiatedNotification error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification when a match is accepted
 * Only notifies the recipient (the actor who accepted already knows)
 *
 * @param {Object} recipientUser - User to notify { _id, email, firstName, lastName, username, discordHandle }
 * @param {Object} actorUser - User who performed the action (for counterparty info)
 * @param {Object} ticket - Ticket for game info
 */
export async function sendMatchAcceptedNotification(recipientUser, actorUser, ticket) {
  const results = [];
  const gameInfo = formatGameInfo(ticket);

  const ticketType = getTicketType(ticket);

  // Email to recipient only (they get actor's contact info)
  if (recipientUser.email) {
    try {
      const template = matchAcceptedTemplate({
        counterpartyName: getUserDisplayName(actorUser),
        counterpartyEmail: actorUser.email,
        counterpartyDiscord: actorUser.discordHandle,
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
        results.push({ to: 'recipient', messageId: data?.id });
      }
    } catch (error) {
      console.error('[Notification] Error sending match accepted email:', error.message);
    }
  }

  // In-app notification to recipient only
  await createInAppNotification({
    userId: recipientUser._id,
    type: 'match_accepted',
    title: 'Match Accepted!',
    message: `${getUserDisplayName(actorUser)} accepted your match for ${gameInfo}`,
    fromUserId: actorUser._id,
    fromUserName: getUserDisplayName(actorUser),
    ticketId: ticket._id
  });

  return { success: results.length > 0, results };
}

/**
 * Send notification when a match is cancelled
 * Notifies both users
 *
 * @param {Object} match - The match object (populated with initiatorTicketId, matchedTicketId)
 * @param {string} reason - Cancellation reason
 */
export async function sendMatchCancelledNotification(match, reason, actingUserId) {
  // const results = [];

  try {
    const gameInfo = formatGameInfo(match.initiatorTicketId);
    // Get both users
    const [initiatorUser, matchedUser] = await Promise.all([
        User.findById(match.initiatorTicketId.userId).select('email firstName lastName username discordHandle'),
        User.findById(match.matchedTicketId.userId).select('email firstName lastName username discordHandle')
      ]);


    // Email to initiator
    if (initiatorUser?.email) {
      try {
        const template = matchCancelledTemplate({
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

        if (!error) {
          console.log('[Notification] Match cancelled email sent to initiator:', data?.id);
          results.push({ to: 'initiator', messageId: data?.id });
        }
      } catch (e) {
        console.error('[Notification] Error sending cancel to initiator:', e.message);
      }
    }

    // Email to matched user
    if (matchedUser?.email) {
      try {
        const template = matchCancelledTemplate({
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

        if (!error) {
          console.log('[Notification] Match cancelled email sent to matched user:', data?.id);
          results.push({ to: 'matched', messageId: data?.id });
        }
      } catch (e) {
        console.error('[Notification] Error sending cancel to matched:', e.message);
      }
    }

    const actor = getActorOfTicketUpdate(actingUserId, match.initiatorTicketId.userId, match.matchedTicketId.userId);
    const cancelledMessage = `Your match for ${gameInfo} has been cancelled${reason ? `: ${reason}` : ''}`;

    // Create in-app notifications for the user not acting
    if (actor !== 'initiator') {
      await createInAppNotification({
        userId: match.initiatorTicketId.userId,
        type: 'match_cancelled',
        title: 'Match Cancelled',
        message: cancelledMessage,
        matchId: match._id,
        ticketId: match.initiatorTicketId._id,
        fromUserName: 'System'
      });
    }

    if (actor !== 'matched') {
      await createInAppNotification({
        userId: match.matchedTicketId.userId,
        type: 'match_cancelled',
        title: 'Match Cancelled',
        message: cancelledMessage,
        matchId: match._id,
        ticketId: match.matchedTicketId._id,
        fromUserName: 'System'
      });
    }

  } catch (error) {
    console.error('[Notification] sendMatchCancelledNotification error:', error.message);
  }

  return { success: results.length > 0, results };
}

/**
 * Send notification when a match is completed
 * Notifies both users
 *
 * @param {Object} match - The match object (populated with initiatorTicketId, matchedTicketId)
 */
export async function sendMatchCompletedNotification(match, actorUserId) {
  const results = [];

  try {
    // Get both users
    const [initiatorUser, matchedUser] = await Promise.all([
      User.findById(match.initiatorTicketId.userId).select('email firstName lastName username discordHandle'),
      User.findById(match.matchedTicketId.userId).select('email firstName lastName username discordHandle')
    ]);

    const gameInfo = formatGameInfo(match.initiatorTicketId);

    const ticketType = getTicketType(match.initiatorTicketId);

    // Email to initiator
    if (initiatorUser?.email) {
      try {
        const template = matchCompletedTemplate({
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

        if (!error) {
          console.log('[Notification] Match completed email sent to initiator:', data?.id);
          results.push({ to: 'initiator', messageId: data?.id });
        }
      } catch (e) {
        console.error('[Notification] Error sending complete to initiator:', e.message);
      }
    }

    // Email to matched user
    if (matchedUser?.email) {
      try {
        const template = matchCompletedTemplate({
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

        if (!error) {
          console.log('[Notification] Match completed email sent to matched user:', data?.id);
          results.push({ to: 'matched', messageId: data?.id });
        }
      } catch (e) {
        console.error('[Notification] Error sending complete to matched:', e.message);
      }
    }

    const actor = getActorOfTicketUpdate(actingUserId, match.initiatorTicketId.userId, match.matchedTicketId.userId);
    const completedMessage = `Your exchange for ${gameInfo} has been completed`;

    // Create in-app notifications for user not acting
    if (actor === 'initiator') {
      await createInAppNotification({
        userId: match.initiatorTicketId.userId,
        type: 'match_completed',
        title: 'Exchange Complete!',
        message: completedMessage,
        matchId: match._id,
        ticketId: initiatorTicketId._id,
        fromUserName: getUserDisplayName(matchedUser)
      });
    }

    if (actor !== 'matched') {
      await createInAppNotification({
        userId: match.matchedTicketId.userId,
        type: 'match_completed',
        title: 'Exchange Complete!',
        message: completedMessage,
        matchId: match._id,
        ticketId: matchedTicketId._id,
        fromUserName: getUserDisplayName(initiatorUser)
      });
    }
  } catch (error) {
    console.error('[Notification] sendMatchCompletedNotification error:', error.message);
  }

  return { success: results.length > 0, results };
}
