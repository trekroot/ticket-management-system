import { TicketRequest, BuyRequest, SellRequest, TradeRequest } from '../models/TicketRequest.js';
// Import models so Mongoose registers them for populate()
import Game from '../models/Game.js';
import { addOwnerFlag, hidePrivateData } from '../utils/ticketHelper.js';
import { SEATING_FORMATS, SECTION_GROUPS } from '../models/SeatingFormat.js';
import Match from '../models/Match.js';
import { logAdminAction } from '../services/adminAuditService.js';
import { getMatchInfoForTickets } from '../services/matchService.js';

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
 * GET /api/tickets/seating
 * Get all seating formats
 */

export const getTicketSeatingFormat = async (req, res) => {
  try {
    res.json({
      success: true,
      data: { format: SEATING_FORMATS, groups: SECTION_GROUPS }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


/**
 * GET /api/tickets
 * Get all ticket requests (both buy, sell, and trade)
 *
 * Query params:
 *   - type: 'buy' | 'sell' | 'trade' (optional, filter by type)
 *   - gameId: ObjectId (optional, filter by game)
 *   - status: 'open' | 'matched' | 'completed' | 'cancelled' (optional)
 */
export const getAllRequests = async (req, res) => {
  try {
    const { type, status } = req.query;

    // Choose which model to query based on type filter
    let Model = TicketRequest;  // Default: query all types
    if (type === 'buy') Model = BuyRequest;
    if (type === 'sell') Model = SellRequest;
    if (type === 'trade') Model = TradeRequest;

    // Build filter object from query params
    const filter = {};
    // if (gameId) filter.gameId = gameId;
    if (status) filter.status = status;

    // Add to filter
    // Find upcoming games
    const nearbyGames = await Game.find({
      date: { $gte: new Date()}
    });
    const futureGameIds = nearbyGames.map(g => g._id);
    filter.gameId = { $in: futureGameIds };

    const ticketRequests = await Model.find(filter)
      .populate('userId', 'discordHandle username firstName lastName email')  // Get user details
      .populate('gameId', 'opponent date venue tbdTime matchType')            // Get game details
      .sort({ createdAt: -1 });                                 // Newest first

    const userId = req.user?._id;

    const flaggedRequests = ticketRequests.map(ticket => {
      return hidePrivateData(ticket, userId);
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
      .populate('userId', 'discordHandle username firstName lastName email')
      .populate('gameId', 'opponent date venue tbdTime matchType');

    if (!ticketRequest) {
      return res.status(404).json({
        success: false,
        error: 'Ticket request not found'
      });
    }

    const ticketData = hidePrivateData(ticketRequest, req.user?._id);

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
        discordHandle: req.user.discordHandle,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      }
    });

    // Populate references before returning
    await buyRequest.populate('userId', 'discordHandle username firstName lastName');
    await buyRequest.populate('gameId', 'opponent date venue tbdTime matchType');

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
 *   gameId, sectionType, section, row, seats, numTickets, ticketsTogether,
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

    await sellRequest.populate('userId', 'discordHandle username firstName lastName');
    await sellRequest.populate('gameId', 'opponent date venue tbdTime matchType');

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
 * POST /api/tickets/trade
 * Create a new trade request
 *
 * Body: {
 *   anyGame, [desiredGameIds], sectionType, section, row, seats, numTickets,
 *   ticketsTogether, notes
 * }
 * Note: userId comes from authenticated user (req.user), not request body
 */
export const createTradeRequest = async (req, res) => {
  try {
    // Use authenticated user's ID and snapshot their info for audit trail
    const tradeRequest = await TradeRequest.create({
      ...req.body,
      userId: req.user._id,
      userSnapshot: {
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      }
    });

    await tradeRequest.populate('userId', 'username firstName lastName');
    await tradeRequest.populate('gamesOffered', 'opponent date venue tbdTime');
    await tradeRequest.populate('gamesDesired', 'opponent date venue tbdTime');
    
    res.status(201).json({
      success: true,
      data: tradeRequest
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
 * Works for buy, sell, trade requests since they share the base model.
 * Mongoose will validate fields based on the document's discriminator type.
 */
export const updateRequest = async (req, res) => {
  try {
    // first check if the request status is being updated for a ticket in an exchange
    const query = {
      $or: [
        { initiatorTicketId: req.params.id },
        { matchedTicketId: req.params.id }
      ],
      status: {$in: ['initiated', 'accepted']}
    };

    const match = await Match.find(query);

    if (match && match.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update ticket in active exchange! Please contact counterparty or cancel exchange.'
      });
    }

    // Get ticket before update for audit logging
    const ticketBefore = await TicketRequest.findById(req.params.id);

    // findByIdAndUpdate options:
    // - new: true returns the updated document (not the old one)
    // - runValidators: true ensures schema validation runs on update
    const request = await TicketRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('userId', 'discordHandle username firstName lastName email')
      .populate('gameId', 'opponent date venue tbdTime matchType');

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Ticket request not found'
      });
    }

    // Log if admin acted on someone else's ticket
    if (ticketBefore) {
      const ticketOwnerId = ticketBefore.userId?.toString();
      const isOwner = req.user._id.toString() === ticketOwnerId;

      if (req.user.role === 'admin' && !isOwner) {
        await logAdminAction({
          adminId: req.user._id,
          action: 'update_ticket',
          targetType: 'TicketRequest',
          targetId: req.params.id,
          affectedUserIds: [ticketOwnerId],
          changes: {
            before: ticketBefore.toObject(),
            after: request.toObject()
          },
          notes: req.body.adminNotes
        });
      }
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
    // Get ticket before delete for audit logging
    const ticketBefore = await TicketRequest.findById(req.params.id);

    const request = await TicketRequest.findByIdAndDelete(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Ticket request not found'
      });
    }

    // Log if admin deleted someone else's ticket
    if (ticketBefore) {
      const ticketOwnerId = ticketBefore.userId?.toString();
      const isOwner = req.user._id.toString() === ticketOwnerId;

      if (req.user.role === 'admin' && !isOwner) {
        await logAdminAction({
          adminId: req.user._id,
          action: 'delete_ticket',
          targetType: 'TicketRequest',
          targetId: req.params.id,
          affectedUserIds: [ticketOwnerId],
          changes: {
            before: ticketBefore.toObject(),
            after: null
          },
          notes: req.body.adminNotes
        });
      }
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
    if (type === 'trade') Model = TradeRequest;

    const requests = await Model.find({ gameId })
      .populate('userId', 'discordHandle username firstName lastName')
      .populate('gameId', 'opponent date venue tbdTime matchType')
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
    if (req.params.userId && req.params.userId !== userId.toString()) {
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
    if (type === 'trade') Model = TradeRequest;

    const filter = { userId };
    if (status) filter.status = status;

    const ticketRequests = await Model.find(filter)
      .populate('gameId', 'opponent date venue tbdTime matchType')
      .populate('gamesOffered', 'opponent date venue tbdTime matchType')
      .populate('gamesDesired', 'opponent date venue tbdTime matchType')
      .sort({ createdAt: -1 });

    // Get match info for user's tickets (lightweight query using .lean())
    const ticketIds = ticketRequests.map(t => t._id);
    const matchInfoMap = await getMatchInfoForTickets(ticketIds);

    // Enrich tickets with match info (counterpartySnapshot already on ticket after accept)
    const flaggedRequests = ticketRequests.map(ticket => {
      const result = addOwnerFlag(ticket, userId);

      // Attach match info if this ticket has an active match
      const matchInfo = matchInfoMap.get(ticket._id.toString());
      if (matchInfo) {
        result.matchInfo = matchInfo;
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

// Functions for /tickets/pairing API

const gameValue = 30;
const seatValue = 20;
const priceValue = 20;
const qtyValue = 20;
const adjacencyValue = 10;

const maxScore = gameValue + seatValue + priceValue + qtyValue + adjacencyValue;
const minMatchScore = maxScore * 0.6;

/**
 * Calculate a pairing score between a sale (SellRequest) and a request (BuyRequest)
 *
 * @param {Object} saleTicket - The SellRequest document
 * @param {Object} requestTicket - The BuyRequest document
 * @returns {Object} { score: Number, reasons: Array }
 */
export function calculatePairingScore(saleTicket, requestTicket) {
  let score = 0;
  const reasons = [];

  console.log(`[Ticket Pairing] Calculating score: Sale ${saleTicket._id} vs Request ${requestTicket._id}`);

  // A. Game Date Match
  const saleGameId = saleTicket.gameId._id || saleTicket.gameId;
  const requestGameId = requestTicket.gameId._id || requestTicket.gameId;

  // if requestGame not provided, give full value
  if (!requestGameId || saleGameId.toString() === requestGameId.toString()) {
    score += gameValue;
    reasons.push('Game match (+40)');
    console.log(`  [Game] Exact match: +40`);
  } 
  /** IF desire to add game range matching
  else {
    // Check date proximity if games are different
    const saleDate = saleTicket.gameId.date || null;
    const requestDate = requestTicket.gameId.date || null;

    if (saleDate && requestDate) {
      const daysDiff = Math.abs((new Date(saleDate) - new Date(requestDate)) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 3) {
        score += gameValue / 2;
        reasons.push(`Games within 3 days (+20)`);
        console.log(`  [Game] Within 3 days: +20`);
      } else if (daysDiff <= 7) {
        score += gameValue / 4;
        reasons.push(`Games within 7 days (+10)`);
        console.log(`  [Game] Within 7 days: +10`);
      } else {
        reasons.push(`Games more than 7 days apart (+0)`);
        console.log(`  [Game] More than 7 days apart: +0`);
      }
    }
  }
     */

  // B. Section Match
  if (saleTicket.sectionTypeOffered === requestTicket.sectionTypeDesired) {
    score += seatValue;
    reasons.push(`Exact section match: ${saleTicket.sectionTypeLabel} (+30)`);
    console.log(`  [Section] Exact match: +30`);
  } else if (requestTicket.anySection) {
    score += seatValue / 2;
    reasons.push(`Buyer accepts any section (+20)`);
    console.log(`  [Section] Any section accepted: +20`);
  } else {
    reasons.push(`Section mismatch: ${saleTicket.sectionTypeLabel} vs ${requestTicket.sectionTypeLabel} (+0)`);
    console.log(`  [Section] Mismatch: +0`);
  }

  // C. Quantity Match
  const saleTicketQuantity = saleTicket.seats?.length > 0 ? saleTicket.seats?.length : saleTicket.numTickets;
  if (saleTicketQuantity >= requestTicket.numTickets) {
    score += qtyValue;
    reasons.push(`Quantity satisfied: ${saleTicketQuantity} available, ${requestTicket.numTickets} needed (+20)`);
    console.log(`  [Quantity] Satisfied: +20`);
  } else {
    reasons.push(`Insufficient quantity: ${saleTicketQuantity} available, ${requestTicket.numTickets} needed (+0)`);
    console.log(`  [Quantity] Insufficient: +0`);
  }

  // D. Price Match
  const isDonation = saleTicket.donatingFree;
  const wantsFree = requestTicket.requestingFree;
  let priceStatus = 'unknown';

  if (isDonation && wantsFree) {
    score += priceValue;
    priceStatus = 'donation_match';
    reasons.push('Both are donation/free match (+20)');
    console.log(`  [Price] Both donation: +20`);
  } else if (isDonation) {
    score -= 100;
    priceStatus = 'donation_mismatch';
    reasons.push('Seller is donating for free -100, kill match');
    // TODO - find a way to reconcile if there are free tickets available, but no request for donated
    console.log(`  [Price] Seller donating: -100`);
  } else if (requestTicket.maxPrice !== undefined && saleTicket.minPrice !== undefined) {
    if (saleTicket.minPrice <= requestTicket.maxPrice) {
      score += 20;
      priceStatus = 'compatible';
      reasons.push(`Price compatible: asking $${saleTicket.minPrice} (+20)`);
      console.log(`  [Price] Compatible: +20`);
    } else if ((saleTicket.minPrice - requestTicket.maxPrice) / requestTicket.maxPrice < 0.25) {
      score += 10;
      priceStatus = 'negotiation_likely';
      reasons.push(`Price close: asking $${saleTicket.minPrice} (+10)`);
      console.log(`  [Price] Approximate: +10`);
    } else {
      priceStatus = 'negotiation_needed';
      reasons.push(`Price gap: asking $${saleTicket.minPrice} (+0)`);
      console.log(`  [Price] Mismatch: +0`);
    }
  } else {
    priceStatus = 'incomplete';
    reasons.push('Price information incomplete (+0)');
    console.log(`  [Price] Incomplete info: +0`);
  }

  // E. Seat Adjacency
  if (saleTicket.ticketsTogether && requestTicket.ticketsTogether) {
    score += 10;
    reasons.push('Both want adjacent seats (+10)');
    console.log(`  [Adjacency] Both want together: +10`);
  } else if (!saleTicket.ticketsTogether && !requestTicket.ticketsTogether) {
    score += 5;
    reasons.push('Neither requires adjacent seats (+5)');
    console.log(`  [Adjacency] Neither cares: +5`);
  } else {
    reasons.push('Seat adjacency preference mismatch (+0)');
    console.log(`  [Adjacency] Mismatch: +0`);
  }

  console.log(`  [Total] Score: ${score}, [Percent]: ${score}/${maxScore}`);

  return { score, reasons, priceStatus };
}


/**
 * Helper: Get number of tickets from a request
 */
function getNumTicketsFromOffer(ticket) {
  if (ticket.seats?.length > 0) return ticket.seats.length;
  return ticket.numTickets || 1;
}

/**
 * Helper: Score section type match for trades
 * Trades have both sectionTypeOffered and sectionTypeDesired
 */
function sectionTypeScore(tradeA, tradeB) {
  // Check if what A offers matches what B wants, and vice versa
  const aOffersWhatBWants = tradeA.sectionTypeOffered === tradeB.sectionTypeDesired || tradeB.anySection;
  const bOffersWhatAWants = tradeB.sectionTypeOffered === tradeA.sectionTypeDesired || tradeA.anySection;

  if (aOffersWhatBWants && bOffersWhatAWants) {
    return { scoreAdd: seatValue, reasonsAdd: 'Both section types match (+20)' };
  } else if (aOffersWhatBWants || bOffersWhatAWants) {
    return { scoreAdd: seatValue / 2, reasonsAdd: 'One section type matches (+10)' };
  }
  return { scoreAdd: 0, reasonsAdd: 'Section types do not match (+0)' };
}

/**
 * Helper: Check if game IDs overlap (handles ObjectId comparison)
 */
function gamesOverlap(gamesArray, targetGameId) {
  if (!gamesArray || !targetGameId) return false;
  const targetStr = targetGameId.toString();
  return gamesArray.some(g => {
    const gId = g._id ? g._id.toString() : g.toString();
    return gId === targetStr;
  });
}

/**
 * Calculate a pairing score between two trade requests
 *
 * @param {Object} tradeA - First Trade Request
 * @param {Object} tradeB - Second Trade Request
 * @returns {Object} { score: Number, reasons: Array }
 */
export function calculateTradePairingScore(tradeA, tradeB) {
  let score = 0;
  const reasons = [];

  console.log(`[Trade Pairing] Scoring: ${tradeA._id} vs ${tradeB._id}`);

  // A. Game Match - Does each offer what the other wants?
  const aOfferedGames = tradeA.gamesOffered || [];
  const aDesiredGames = tradeA.gamesDesired || [];
  const bOfferedGames = tradeB.gamesOffered || [];
  const bDesiredGames = tradeB.gamesDesired || [];

  // Check: A offers something B wants AND B offers something A wants
  const aHasWhatBWants = tradeA.anyGame || aOfferedGames.some(g => gamesOverlap(bDesiredGames, g._id || g));
  const bHasWhatAWants = tradeB.anyGame || bOfferedGames.some(g => gamesOverlap(aDesiredGames, g._id || g));

  if (aHasWhatBWants && bHasWhatAWants) {
    score += gameValue;
    reasons.push('Both trades offer what the other wants (+30)');
    console.log(`  [Game] Full match: +30`);
  } else if (aHasWhatBWants || bHasWhatAWants) {
    score += gameValue / 2;
    reasons.push('One-sided game match (+15)');
    console.log(`  [Game] Partial match: +15`);
  } else {
    reasons.push('No game overlap (+0)');
    console.log(`  [Game] No match: +0`);
  }

  // B. SectionType Match
  const { scoreAdd, reasonsAdd } = sectionTypeScore(tradeA, tradeB);
  score += scoreAdd;
  reasons.push(reasonsAdd);
  console.log(`  [Section] ${reasonsAdd}`);

  // C. Quantity Match
  const qtyA = getNumTicketsFromOffer(tradeA);
  const qtyB = getNumTicketsFromOffer(tradeB);
  if (qtyA === qtyB) {
    score += qtyValue;
    reasons.push(`Quantity match: both have ${qtyA} tickets (+20)`);
    console.log(`  [Quantity] Match: +20`);
  } else {
    reasons.push(`Quantity mismatch: ${qtyA} vs ${qtyB} (+0)`);
    console.log(`  [Quantity] Mismatch: +0`);
  }

  console.log(`  [Total] Score: ${score}/${maxScore}`);

  return { score, reasons };
}

/**
 * Get Trade ↔ Trade pairings
 * @param {Object} sourceTicket - The source TradeRequest (populated)
 * @param {Boolean} includeAll - if true, returns all positive scores
 * @returns {Array} pairings
 */
async function getTradeToTradePairings(sourceTicket, includeAll = false) {
  console.log(`[Trade Pairing] Finding Trade ↔ Trade matches for: ${sourceTicket._id}`);

  // Find other open trade requests (not from same user)
  const potentialTrades = await TradeRequest.find({
    status: 'open',
    userId: { $ne: sourceTicket.userId }
  })
    .populate('gamesOffered')
    .populate('gamesDesired');

  console.log(`[Trade Pairing] Found ${potentialTrades.length} potential trade(s)`);

  const pairings = [];
  const sourceObj = sourceTicket.toObject();

  for (const trade of potentialTrades) {
    const tradeObj = trade.toObject();
    const { score, reasons } = calculateTradePairingScore(sourceObj, tradeObj);

    const threshold = includeAll ? 0 : minMatchScore;
    if (score > threshold) {
      // Trim lastName for privacy
      if (tradeObj.userSnapshot?.lastName) {
        tradeObj.userSnapshot.lastName = tradeObj.userSnapshot.lastName.charAt(0);
      }

      pairings.push({
        ticket: tradeObj,
        score,
        reasons,
        matchType: 'trade_to_trade',
        maxScore
      });
    }
  }

  return pairings;
}

/**
 * Get Trade → Buy pairings (when trade's allowVisibility is true)
 * Treats the trade as a "sell" - matches gamesOffered against BuyRequests
 * @param {Object} sourceTicket - The source TradeRequest (populated)
 * @param {Boolean} includeAll - if true, returns all positive scores
 * @returns {Array} pairings
 */
async function getTradeToBuyPairings(sourceTicket, includeAll = false) {
  console.log(`[Trade Pairing] Finding Trade → Buy matches for: ${sourceTicket._id}`);

  if (!sourceTicket.gamesOffered || sourceTicket.gamesOffered.length === 0) {
    console.log(`[Trade Pairing] No games offered, skipping Trade → Buy`);
    return [];
  }

  // Get IDs of games being offered
  const offeredGameIds = sourceTicket.gamesOffered.map(g => g._id || g);

  // Find BuyRequests for any of the offered games
  const potentialBuyers = await BuyRequest.find({
    gameId: { $in: offeredGameIds },
    status: 'open',
    userId: { $ne: sourceTicket.userId }
  }).populate('gameId');

  console.log(`[Trade Pairing] Found ${potentialBuyers.length} potential buyer(s)`);

  const pairings = [];

  // Create a pseudo-SellRequest from the TradeRequest for scoring
  const pseudoSell = {
    ...sourceTicket.toObject(),
    sectionTypeOffered: sourceTicket.sectionTypeOffered,
    minPrice: undefined, // Trades don't have prices
    donatingFree: false
  };

  for (const buyer of potentialBuyers) {
    const buyerObj = buyer.toObject();

    // Set the gameId to match for scoring (use the buyer's requested game)
    pseudoSell.gameId = buyerObj.gameId;

    const { score, reasons, priceStatus } = calculatePairingScore(pseudoSell, buyerObj);

    const threshold = includeAll ? 0 : minMatchScore;
    if (score > threshold) {
      // Trim lastName for privacy
      if (buyerObj.userSnapshot?.lastName) {
        buyerObj.userSnapshot.lastName = buyerObj.userSnapshot.lastName.charAt(0);
      }
      if (buyerObj.userId?.lastName) {
        buyerObj.userId.lastName = buyerObj.userId.lastName.charAt(0);
      }
      // Hide maxPrice
      buyerObj.maxPrice = null;

      pairings.push({
        ticket: buyerObj,
        score,
        reasons,
        priceStatus: 'trade_fallback', // Indicates this is a trade→buy match
        matchType: 'trade_to_buy',
        maxScore
      });
    }
  }

  return pairings;
}

/**
 * Helper function for pairings from a ticketId
 * @param {String} ticketId
 * @param {Boolean} includeAll - if true, returns all positive scores; if false, only >= minMatchScore
 * @returns {Object} { sourceTicket, pairings, error }
 */
async function getOpenPairingsForTicketRequest(ticketId, includeAll = false) {
  console.log(`[Ticket Pairing] Finding pairings for ticket: ${ticketId} (includeAll: ${includeAll})`);

  // Find the source ticket and populate game data
  const sourceTicket = await TicketRequest.findById(ticketId)
    .populate('gameId')
    .populate('gamesOffered')
    .populate('gamesDesired');

  if (!sourceTicket || sourceTicket.status !== 'open') {
    console.warn(`[Ticket Pairing] Ticket Request not found or unavailable: ${ticketId}`);
    return { sourceTicket: null, pairings: [], error: 'Ticket Request not found or unavailable' };
  }

  console.log(`[Ticket Pairing] Source ticket type: ${sourceTicket.__t}, status: ${sourceTicket.status}`);

  // Handle TradeRequest separately
  if (sourceTicket.__t === 'TradeRequest') {
    let pairings = [];

    // 1. Always check Trade ↔ Trade
    const tradePairings = await getTradeToTradePairings(sourceTicket, includeAll);
    pairings.push(...tradePairings);

    // 2. If allowVisibility, also check Trade → Buy
    if (sourceTicket.allowVisibility) {
      const buyPairings = await getTradeToBuyPairings(sourceTicket, includeAll);
      pairings.push(...buyPairings);
    }

    // Sort all pairings by score
    pairings.sort((a, b) => b.score - a.score);

    return { sourceTicket, pairings };
  }

  // Handle orphaned game reference (game was deleted but ticket still exists)
  if (sourceTicket.gameId && typeof sourceTicket.gameId === 'object' && !sourceTicket.gameId._id) {
    console.warn(`[Ticket Pairing] Ticket ${ticketId} references a deleted game`);
    return { sourceTicket: null, pairings: [], error: 'Ticket references a game that no longer exists' };
  }

  // Buy/Sell logic
  const isSellRequest = sourceTicket.__t === 'SellRequest';
  const OppositeModel = isSellRequest ? BuyRequest : SellRequest;

  console.log(`[Ticket Pairing] Looking for ${isSellRequest ? 'BuyRequests' : 'SellRequests'}`);
  
  /** LATER OPTION TO ADD BACK IN DATE RANGE FILTER - see calculatePairingScore
  // Find game date range (7 days before and after)
  const sourceGameDate = sourceTicket.gameId.date;
  const dateRangeStart = new Date(sourceGameDate);
  dateRangeStart.setDate(dateRangeStart.getDate() - 7);
  const dateRangeEnd = new Date(sourceGameDate);
  dateRangeEnd.setDate(dateRangeEnd.getDate() + 7);

  // Find games within the date range
  const nearbyGames = await Game.find({
    date: { $gte: dateRangeStart, $lte: dateRangeEnd }
  });
  // const nearbyGameIds = nearbyGames.map(g => g._id);

  console.log(`[Ticket Pairing] Found ${nearbyGames.length} games within date range`);
  */

  // Find all active tickets of opposite type with same game
  // Exclude tickets from the same user (can't match with yourself!)
  const potentialMatches = await OppositeModel.find({
    gameId: sourceTicket.gameId,
    status: 'open',
    userId: { $ne: sourceTicket.userId }
  }).populate('gameId');
  
  const sourceWithLabel = sourceTicket.toObject();
  const matchesWithLabels = potentialMatches.map(m => m.toObject());

  console.log(`[Ticket Pairing] Found ${matchesWithLabels.length} potential match(es)`);

  // Filter out matches with orphaned game references
  const validMatches = matchesWithLabels.filter(match => {
    if (match.gameId && typeof match.gameId === 'object' && !match.gameId._id) {
      console.warn(`[Ticket Pairing] Skipping match ${match._id} - references deleted game`);
      return false;
    }
    return true;
  });

  const pairings = [];

  for (const matchObj of validMatches) {
    // Determine which is sale and which is request based on source type
    const saleTicket = isSellRequest ? sourceWithLabel : matchObj;
    const requestTicket = isSellRequest ? matchObj : sourceWithLabel;

    const { score, reasons, priceStatus } = calculatePairingScore(saleTicket, requestTicket);

    // Include based on threshold: all positive scores if includeAll, otherwise >= minMatchScore
    const threshold = includeAll ? 0 : minMatchScore;
    if (score > threshold) {
      // Convert to object and trim lastName for privacy
      if (matchObj.userSnapshot?.lastName) {
        matchObj.userSnapshot.lastName = matchObj.userSnapshot.lastName.charAt(0);
      }
      if (matchObj.userId?.lastName) {
        matchObj.userId.lastName = matchObj.userId.lastName.charAt(0);
      }

      if (matchObj.__t === 'BuyRequest') {
        matchObj.maxPrice = null;
      }

      pairings.push({
        ticket: matchObj,
        score,
        reasons,
        priceStatus,
        maxScore
      });
    }
  }

  // Sort by score (highest first)
  pairings.sort((a, b) => b.score - a.score);

  console.log(`[Ticket Pairing] Returning ${pairings.length} pairings (score > ${includeAll ? 0 : minMatchScore})`);

  return { sourceTicket, pairings };
}

/**
 * Get match status or potential pairings for a ticket
 *
 * If ticket is in an active match (pending/accepted), returns match details with full user info.
 * Otherwise, returns potential pairings.
 *
 * GET /api/tickets/pairing/:ticketId
 * GET /api/tickets/pairing/:ticketId?all=true  (includes all positive scores)
 */
export async function getTicketPairingsOrMatch(req, res) {
  try {
    const includeAll = req.query.all === 'true';
    const ticketId = req.params.ticketId;

    // Check if ticket is in an non-cancelled match (pending, accepted, completed)
    const activeMatch = await Match.findOne({
      $or: [
        { initiatorTicketId: ticketId },
        { matchedTicketId: ticketId }
      ],
      status: { $in: ['initiated', 'accepted', 'completed'] }
    })
      .populate({
        path: 'initiatorTicketId',
        populate: [
          { path: 'userId', select: 'username discordHandle email firstName lastName' },
          { path: 'gameId', select: 'opponent date venue' },
          { path: 'gamesOffered', select: 'opponent date venue' },
          { path: 'gamesDesired', select: 'opponent date venue' }
        ]
      })
      .populate({
        path: 'matchedTicketId',
        populate: [
          { path: 'userId', select: 'username discordHandle email firstName lastName' },
          { path: 'gameId', select: 'opponent date venue' },
          { path: 'gamesOffered', select: 'opponent date venue' },
          { path: 'gamesDesired', select: 'opponent date venue' }
        ]
      });

    // If ticket is in an active match, return match details with counterparty info
    if (activeMatch) {
      // Determine which ticket belongs to requester and which is the counterparty
      const isInitiator = activeMatch.initiatorTicketId._id.toString() === ticketId;
      const userTicket = isInitiator ? activeMatch.initiatorTicketId : activeMatch.matchedTicketId;
      const counterpartyTicket = isInitiator ? activeMatch.matchedTicketId : activeMatch.initiatorTicketId;

      return res.json({
        success: true,
        hasActiveMatch: true,
        match: activeMatch,
        userTicket: userTicket.toObject(),
        counterpartyTicket: counterpartyTicket.toObject(),
        counterpartyUser: counterpartyTicket.userId
      });
    }

    // No active match - return potential pairings
    const { sourceTicket, pairings, error } = await getOpenPairingsForTicketRequest(ticketId, includeAll);

    if (error) {
      return res.status(404).json({ success: false, error });
    }

    res.json({
      success: true,
      hasActiveMatch: false,
      sourceTicket: sourceTicket.toObject(),
      pairingsCount: pairings.length,
      pairings
    });

  } catch (error) {
    console.error('[Ticket Pairing] Error finding pairings:', error);
    res.status(500).json({ success: false, error: 'Failed to find pairings', details: error.message });
  }
}

/**
 * Get the best (top 3) pairings for a ticket
 *
 * GET /api/tickets/pairing/:ticketId/best
 */
export async function getBestTicketPairings(req, res) {
  try {
    const { sourceTicket, pairings, error } = await getOpenPairingsForTicketRequest(req.params.ticketId);

    if (error) {
      return res.status(404).json({ success: false, error });
    }

    const bestPairings = pairings.slice(0, 3);

    res.json({
      success: true,
      sourceTicket: sourceTicket.toObject(),
      pairingsCount: bestPairings.length,
      pairings: bestPairings
    });

  } catch (error) {
    console.error('[Ticket Pairing] Error finding best pairings:', error);
    res.status(500).json({ success: false, error: 'Failed to find best pairings', details: error.message });
  }
}

/**
 * Get all pairings for a user (expensive call!)
 *
 * GET /api/tickets/pairing
 */
export async function getAllUserTicketPairings(req, res) {
  try {
    let userTicketMatches = [];
    
    const userTicketRequests = await TicketRequest.find({
      userId: req.user._id,
      status: 'open'
    }).populate('gameId').populate('gamesOffered').populate('gamesDesired');

    for (const userTicketRequest of userTicketRequests) {
      const { sourceTicket, pairings, error } = await getOpenPairingsForTicketRequest(userTicketRequest._id, true);
      if (error) {
        console.error('[Ticket Pairing] Issue retrieving pairings for ticketId: ', userTicketRequest._id, '. Details: ', error);
        continue;
      }

      userTicketMatches.push({
        userTicket: sourceTicket,
        matchedTickets: pairings,
        numMatches: pairings.length
      });
    }

    res.json({
      success: true,
      userTicketMatches
    });
  } catch (error) {
    console.error('[Ticket Pairing] Error finding all pairings for user:', error);
    res.status(500).json({ success: false, error: 'Failed to find all pairings for user', details: error.message });
  }
}
