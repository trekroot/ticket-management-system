import { TicketRequest } from '../models/TicketRequest.js';
import Match from '../models/Match.js';

/**
 * Authorization Middleware
 *
 * These run AFTER verifyFirebaseToken, so req.user is already
 * the full MongoDB user document (has _id, role, etc.)
 */

/**
 * Only allow admins to proceed
 */
export function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Factory: Allow if user is admin OR owns the ticket
 * @param {Function} getTicketId - Function to extract ticketId from req
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.put('/:id', isTicketOwnerOrAdmin(req => req.params.id), updateTicket);
 *   router.post('/match', isTicketOwnerOrAdmin(req => req.body.sourceTicketId), initiateMatch);
 */
export function isTicketOwnerOrAdmin(getTicketId) {
  return async (req, res, next) => {
    // Admins can do anything
    if (req.user.role === 'admin') {
      return next();
    }

    // For regular users, check ownership
    const ticketId = getTicketId(req);

    if (!ticketId) {
      return res.status(400).json({ error: 'Ticket ID required' });
    }

    try {
      const ticket = await TicketRequest.findById(ticketId);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Compare MongoDB ObjectIds (need toString() for comparison)
      if (ticket.userId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ error: 'Not authorized to modify this ticket' });
      }

      next();
    } catch (error) {
      console.error('Authorization check failed:', error.message);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

/**
 * Factory: Allow if user is admin OR participant in the match
 * (owns either initiatorTicketId or matchedTicketId)
 *
 * @param {Function} getMatchId - Function to extract matchId from req
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.post('/:matchId/accept', isMatchParticipantOrAdmin(req => req.params.matchId), acceptMatch);
 */
export function isMatchParticipantOrAdmin(getMatchId) {
  return async (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    const matchId = getMatchId(req);

    if (!matchId) {
      return res.status(400).json({ error: 'Match ID required' });
    }

    try {
      const match = await Match.findById(matchId)
        .populate('initiatorTicketId', 'userId')
        .populate('matchedTicketId', 'userId');

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const userId = req.user._id.toString();
      const isInitiator = match.initiatorTicketId?.userId?.toString() === userId;
      const isMatched = match.matchedTicketId?.userId?.toString() === userId;

      if (!isInitiator && !isMatched) {
        return res.status(403).json({ error: 'Not authorized to modify this match' });
      }

      // Attach match to request for use in controller (avoid re-fetching)
      req.match = match;
      next();
    } catch (error) {
      console.error('Match authorization check failed:', error.message);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

/**
 * Allow if user is admin OR accessing their own user record
 * Use for: GET/PUT/DELETE /api/users/:id
 */
export function isUserOwnerOrAdmin(req, res, next) {
  // Admins can do anything
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user is accessing their own record
  if (req.params.id !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not authorized to access this user' });
  }

  next();
}

/**
 * Only allow the ticket owner (not even admins)
 * Use if you need strict ownership checks
 */
export async function isOwner(req, res, next) {
  try {
    const ticket = await TicketRequest.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.userId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ error: 'Not authorized to modify this ticket' });
    }

    next();
  } catch (error) {
    console.error('Authorization check failed:', error.message);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}
