import express from 'express';
import { verifyUserAuthenticated, optionalAuth } from '../middleware/auth.js';
import { isTicketOwnerOrAdmin, isAdmin } from '../middleware/authorize.js';
import {
  getAllRequests,
  getRequestById,
  createBuyRequest,
  createSellRequest,
  createTradeRequest,
  updateRequest,
  deleteRequest,
  getRequestsByGame,
  getRequestsByUser,
  getTicketSeatingFormat,
  getAllUserTicketPairings,
  getTicketPairingsOrMatch,
  getBestTicketPairings
} from '../controllers/ticketRequestController.js';

/**
 * ROUTES: ticketRequestRoutes
 *
 * Routes define the API endpoints and map them to controller functions.
 * They handle:
 * - HTTP method (GET, POST, PUT, DELETE)
 * - URL path
 * - Which controller function handles the request
 *
 * Routes are kept thin - all logic lives in controllers.
 *
 * Base path: /api/tickets (set when registered in server.js)
 */

const router = express.Router();

/**
 * Main CRUD routes
 *
 * GET    /api/tickets          - Get all requests (with optional filters)
 * GET    /api/tickets/seating  - Get all seating formats
 * GET    /api/tickets/:id      - Get single request by ID
 * POST   /api/tickets/buy      - Create a buy request
 * POST   /api/tickets/sell     - Create a sell request
 * POST   /api/tickets/trade     - Create a trade request
 * PUT    /api/tickets/:id      - Update a request
 * DELETE /api/tickets/:id      - Delete a request
 *
 * Pairing routes (potential matches for a ticket)
 *
 * GET    /api/tickets/pairing            - Get all pairings for user's tickets
 * GET    /api/tickets/pairing/:ticketId  - Get pairings for a specific ticket
 * GET    /api/tickets/pairing/:ticketId/best - Get top 3 pairings
 */
// TODO: Add public preview endpoint for non-logged-in users (limited info)


// Base route
router.route('/')
  .get(optionalAuth, getAllRequests);

// Seating options
router.route('/seating')
  .get(verifyUserAuthenticated, getTicketSeatingFormat);

// Literal prefix routes FIRST
router.route('/buy')
  .post(verifyUserAuthenticated, createBuyRequest);

router.route('/sell')
  .post(verifyUserAuthenticated, createSellRequest);

router.route('/trade')
  .post(verifyUserAuthenticated, createTradeRequest);

/**
 * Convenience routes for filtering
 *
 * GET /api/tickets/game/:gameId   - All requests for a game
 * GET /api/tickets/user           - All requests for current user
 * GET /api/tickets/user/:userId   - All requests by a user (admin only)
 */
router.route('/user')
  .get(verifyUserAuthenticated, getRequestsByUser);

  router.route('/user/:userId')
  .get(verifyUserAuthenticated, isAdmin, getRequestsByUser);
  
router.route('/game/:gameId')
  .get(verifyUserAuthenticated, getRequestsByGame);

// Pairing-specific routes
router.get('/pairing/', verifyUserAuthenticated, getAllUserTicketPairings);

router.get('/pairing/:ticketId', verifyUserAuthenticated, isTicketOwnerOrAdmin(req => req.params.ticketId), getTicketPairingsOrMatch);

router.get('/pairing/:ticketId/best', verifyUserAuthenticated, isTicketOwnerOrAdmin(req => req.params.ticketId), getBestTicketPairings);

// Parameter routes LAST
router.route('/:id')
  .get(verifyUserAuthenticated, getRequestById) // make a public-safe endpoint with reduced user info
  .put(verifyUserAuthenticated, isTicketOwnerOrAdmin(req => req.params.id), updateRequest)
  .delete(verifyUserAuthenticated, isTicketOwnerOrAdmin(req => req.params.id), deleteRequest);

export default router;
