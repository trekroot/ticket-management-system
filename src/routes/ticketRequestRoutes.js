import express from 'express';
import { verifyFirebaseToken, optionalAuth } from '../middleware/auth.js';
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
  getTicketSeatingFormat
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
 */
// TODO: Add public preview endpoint for non-logged-in users (limited info)


// Base route
router.route('/')
  .get(optionalAuth, getAllRequests);

// Seating options
router.route('/seating')
  .get(verifyFirebaseToken, getTicketSeatingFormat);

// Literal prefix routes FIRST
router.route('/buy')
  .post(verifyFirebaseToken, createBuyRequest);

router.route('/sell')
  .post(verifyFirebaseToken, createSellRequest);

router.route('/trade')
  .post(verifyFirebaseToken, createTradeRequest);

/**
 * Convenience routes for filtering
 *
 * GET /api/tickets/game/:gameId   - All requests for a game
 * GET /api/tickets/user           - All requests for current user
 * GET /api/tickets/user/:userId   - All requests by a user (admin only)
 */
router.route('/user')
  .get(verifyFirebaseToken, getRequestsByUser);

  router.route('/user/:userId')
  .get(verifyFirebaseToken, isAdmin, getRequestsByUser);
  
router.route('/game/:gameId')
  .get(verifyFirebaseToken, getRequestsByGame);

// Parameter routes LAST
// TODO: FIX THE USAGES OF THIS - MESSY
router.route('/:id')
  .get(verifyFirebaseToken, getRequestById) // make a public-safe endpoint with reduced user info
  .put(verifyFirebaseToken, isTicketOwnerOrAdmin, updateRequest)
  .delete(verifyFirebaseToken, isAdmin, deleteRequest);

export default router;
