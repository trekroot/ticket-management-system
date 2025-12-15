import { TicketRequest } from '../models/TicketRequest.js';

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
 * Allow if user is admin OR owns the ticket
 * Use for: PUT /api/tickets/:id, DELETE /api/tickets/:id
 */
export async function isTicketOwnerOrAdmin(req, res, next) {
  // Admins can do anything
  if (req.user.role === 'admin') {
    return next();
  }

  // For regular users, check ownership
  // Support both :id and :ticketId param names
  // TODO: FIX THE USAGES OF THIS - MESSY
  const ticketId = req.params.id || req.params.ticketId;
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
