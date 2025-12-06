import express from 'express';
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
router.route('/')
  .get(getAllRequests);

router.route('/buy')
  .post(createBuyRequest);

router.route('/sell')
  .post(createSellRequest);

router.route('/:id')
  .get(getRequestById)
  .put(updateRequest)
  .delete(deleteRequest);

/**
 * Convenience routes for filtering
 *
 * GET /api/tickets/game/:gameId   - All requests for a game
 * GET /api/tickets/user/:userId   - All requests by a user
 */
router.get('/game/:gameId', getRequestsByGame);
router.get('/user/:userId', getRequestsByUser);

export default router;
