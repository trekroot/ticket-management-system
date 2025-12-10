import { TicketRequest, BuyRequest, SellRequest } from '../models/TicketRequest.js';
// Import models so Mongoose registers them for populate()
import '../models/User.js';
import '../models/Game.js';
import { addOwnerFlag } from '../utils/ticketHelper.js';

/**
 * CONTROLLER: ticketRequestController
 *
 * Controllers handle the business logic for each route. They:
 * 1. Receive the request (req) from the route
 * 2. Interact with the database via models
 * 3. Send a response (res) back to the client
 *
 * This separation keeps routes thin and logic testable.
 */

/**
 * GET /api/tickets
 * Get all ticket requests (both buy and sell)
 *
 * Query params:
 *   - type: 'buy' | 'sell' (optional, filter by type)
 *   - gameId: ObjectId (optional, filter by game)
 *   - status: 'open' | 'matched' | 'completed' | 'cancelled' (optional)
 */
export const getAllRequests = async (req, res) => {
  try {
    const { type, gameId, status } = req.query;

    // Choose which model to query based on type filter
    let Model = TicketRequest;  // Default: query all types
    if (type === 'buy') Model = BuyRequest;
    if (type === 'sell') Model = SellRequest;

    // Build filter object from query params
    const filter = {};
    if (gameId) filter.gameId = gameId;
    if (status) filter.status = status;

    const ticketRequests = await Model.find(filter)
      .populate('userId', 'username firstName lastName email')  // Get user details
      .populate('gameId', 'opponent date venue')                // Get game details
      .sort({ createdAt: -1 });                                 // Newest first

    const userId = req.user?._id;

    const flaggedRequests = ticketRequests.map(ticket => {
      const result = addOwnerFlag(ticket, userId);
      if (!req.user) {
        result.userId = null;
        result.userSnapshot = { firstName: "••••••", lastName: "••••••", username: null };
        result.notes = null;
      }
      return result;
    });

    res.json({
      success: true,
      count: flaggedRequests.length,
      data: flaggedRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/tickets/:id
 * Get a single ticket request by ID
 */
export const getRequestById = async (req, res) => {
  try {
    const ticketRequest = await TicketRequest.findById(req.params.id)
      .populate('userId', 'username firstName lastName email')
      .populate('gameId', 'opponent date venue time');

    if (!ticketRequest) {
      return res.status(404).json({
        success: false,
        error: 'Ticket request not found'
      });
    }

    const ticketData = addOwnerFlag(ticketRequest, req.user?._id);

    res.json({
      success: true,
      data: ticketData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/tickets/buy
 * Create a new buy request
 *
 * Body: {
 *   gameId, section, numTickets, ticketsTogether,
 *   notes, maxPrice, bandMember, firstTimeAttending, requestingFree, anySection
 * }
 * Note: userId comes from authenticated user (req.user), not request body
 */
export const createBuyRequest = async (req, res) => {
  try {
    // Use authenticated user's ID and snapshot their info for audit trail
    const buyRequest = await BuyRequest.create({
      ...req.body,
      userId: req.user._id,
      userSnapshot: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      }
    });

    // Populate references before returning
    await buyRequest.populate('userId', 'username firstName lastName');
    await buyRequest.populate('gameId', 'opponent date venue');

    res.status(201).json({
      success: true,
      data: buyRequest
    });
  } catch (error) {
    // Handle validation errors nicely
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/tickets/sell
 * Create a new sell request
 *
 * Body: {
 *   gameId, section, numTickets, ticketsTogether,
 *   notes, minPrice, donatingFree
 * }
 * Note: userId comes from authenticated user (req.user), not request body
 */
export const createSellRequest = async (req, res) => {
  try {
    // Use authenticated user's ID and snapshot their info for audit trail
    const sellRequest = await SellRequest.create({
      ...req.body,
      userId: req.user._id,
      userSnapshot: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      }
    });

    await sellRequest.populate('userId', 'username firstName lastName');
    await sellRequest.populate('gameId', 'opponent date venue');

    res.status(201).json({
      success: true,
      data: sellRequest
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * PUT /api/tickets/:id
 * Update a ticket request
 *
 * Works for both buy and sell requests since they share the base model.
 * Mongoose will validate fields based on the document's discriminator type.
 */
export const updateRequest = async (req, res) => {
  try {
    // findByIdAndUpdate options:
    // - new: true returns the updated document (not the old one)
    // - runValidators: true ensures schema validation runs on update
    const request = await TicketRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('userId', 'username firstName lastName email')
      .populate('gameId', 'opponent date venue');

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Ticket request not found'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE /api/tickets/:id
 * Delete a ticket request
 *
 * In production, you might want to soft-delete (set status: 'cancelled')
 * instead of actually removing the document for audit purposes.
 */
// TODO: Consider soft delete instead of hard delete - requires schema change to ticketRequest.js
export const deleteRequest = async (req, res) => {
  try {
    const request = await TicketRequest.findByIdAndDelete(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Ticket request not found'
      });
    }

    res.json({
      success: true,
      data: {},
      message: 'Ticket request deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/tickets/game/:gameId
 * Get all requests for a specific game
 *
 * Useful for seeing all buy/sell activity for a particular match.
 */
export const getRequestsByGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { type } = req.query;

    let Model = TicketRequest;
    if (type === 'buy') Model = BuyRequest;
    if (type === 'sell') Model = SellRequest;

    const requests = await Model.find({ gameId })
      .populate('userId', 'username firstName lastName')
      .populate('gameId', 'opponent date venue')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/tickets/user          - Get own requests (any authenticated user)
 * GET /api/tickets/user/:userId  - Get specific user's requests (admin only)
 *
 * Useful for a "My Requests" dashboard view or admin user lookup.
 */
export const getRequestsByUser = async (req, res) => {
  try {
    let userId = req.user._id;

    // If userId param provided, check admin permission
    if (req.params.userId) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required to view other users\' requests'
        });
      }
      userId = req.params.userId;
    }
    const { type, status } = req.query;

    let Model = TicketRequest;
    if (type === 'buy') Model = BuyRequest;
    if (type === 'sell') Model = SellRequest;

    const filter = { userId };
    if (status) filter.status = status;

    const ticketRequests = await Model.find(filter)
      .populate('gameId', 'opponent date venue')
      .sort({ createdAt: -1 });

    const flaggedRequests = ticketRequests.map(ticket => {
      const result = addOwnerFlag(ticket, userId);
      if (!req.user) {
        result.userId = null;
        result.userSnapshot = { firstName: "••••••", lastName: "••••••", username: null };
        result.notes = null;
      }
      return result;
    });

    res.json({
      success: true,
      count: flaggedRequests.length,
      data: flaggedRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
