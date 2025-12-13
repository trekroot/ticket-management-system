import express from 'express';
import { verifyFirebaseToken, optionalAuth } from '../middleware/auth.js';
import { isOwnerOrAdmin, isAdmin } from '../middleware/authorize.js';
import {
  getAllRequests,
  getRequestById,
  createBuyRequest,
  createSellRequest,
  updateRequest,
  deleteRequest,
  getRequestsByGame,
  getRequestsByUser
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
 * GET    /api/tickets/:id      - Get single request by ID
 * POST   /api/tickets/buy      - Create a buy request
 * POST   /api/tickets/sell     - Create a sell request
 * PUT    /api/tickets/:id      - Update a request
 * DELETE /api/tickets/:id      - Delete a request
 */
// TODO: Add public preview endpoint for non-logged-in users (limited info)

router.route('/')
  .get(optionalAuth, getAllRequests);

router.route('/buy')
  .post(verifyFirebaseToken, createBuyRequest);

router.route('/sell')
  .post(verifyFirebaseToken, createSellRequest);

router.get('/user', verifyFirebaseToken, getRequestsByUser);

router.route('/:id')
  .get(verifyFirebaseToken, getRequestById) // make a public-safe endpoint with reduced user info
  .put(verifyFirebaseToken, isOwnerOrAdmin, updateRequest)
  .delete(verifyFirebaseToken, isOwnerOrAdmin, deleteRequest);

/**
 * Convenience routes for filtering
 *
 * GET /api/tickets/game/:gameId   - All requests for a game
 * GET /api/tickets/user/:userId   - All requests by a user
 */
router.get('/game/:gameId', verifyFirebaseToken, getRequestsByGame);
router.get('/user/:userId', verifyFirebaseToken, isAdmin, getRequestsByUser);

export default router;
