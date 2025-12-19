import { getSectionTypeLabel } from '../models/SeatingFormat.js';
import { TicketRequest, BuyRequest, SellRequest } from "../models/TicketRequest.js";

/**
 * Extract scoring for module use and easier maintenance
 */
const gameValue = 30;
const seatValue = 20;
const priceValue = 20;
const qtyValue = 20;
const adjacencyValue = 10;

const maxScore = gameValue + seatValue + priceValue + qtyValue + adjacencyValue;
const minMatchScore = maxScore * 0.4;

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

  console.log(`[Matchmaker] Calculating score: Sale ${saleTicket._id} vs Request ${requestTicket._id}`);

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
  if (saleTicket.sectionType === requestTicket.sectionType) {
    score += seatValue;
    reasons.push(`Exact section match: ${saleTicket.sectionType} (+30)`);
    console.log(`  [Section] Exact match: +30`);
  } else if (requestTicket.anySection) {
    score += seatValue / 2;
    reasons.push(`Buyer accepts any section (+20)`);
    console.log(`  [Section] Any section accepted: +20`);
  } else {
    reasons.push(`Section mismatch: ${saleTicket.sectionType} vs ${requestTicket.sectionType} (+0)`);
    console.log(`  [Section] Mismatch: +0`);
  }

  // C. Quantity Match
  if (saleTicket.numTickets >= requestTicket.numTickets) {
    score += qtyValue;
    reasons.push(`Quantity satisfied: ${saleTicket.numTickets} available, ${requestTicket.numTickets} needed (+20)`);
    console.log(`  [Quantity] Satisfied: +20`);
  } else {
    reasons.push(`Insufficient quantity: ${saleTicket.numTickets} available, ${requestTicket.numTickets} needed (+0)`);
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
 * Helper function for pairings from a ticketId
 * @param {String} ticketId
 * @param {Boolean} includeAll - if true, returns all positive scores; if false, only >= minMatchScore
 * @returns {Object} { sourceTicket, pairings, error }
 */
async function getPairingsForTicketRequest(ticketId, includeAll = false) {
  console.log(`[Matchmaker] Finding pairings for ticket: ${ticketId} (includeAll: ${includeAll})`);

  // Find the source ticket and populate game data
  const sourceTicket = await TicketRequest.findById(ticketId).populate('gameId');

  if (!sourceTicket || sourceTicket.status !== 'open') {
    console.warn(`[Matchmaker] Ticket Request not found or unavailable: ${ticketId}`);
    return { sourceTicket: null, pairings: [], error: 'Ticket Request not found or unavailable' };
  }

  // Handle orphaned game reference (game was deleted but ticket still exists)
  if (sourceTicket.gameId && typeof sourceTicket.gameId === 'object' && !sourceTicket.gameId._id) {
    console.warn(`[Matchmaker] Ticket ${ticketId} references a deleted game`);
    return { sourceTicket: null, pairings: [], error: 'Ticket references a game that no longer exists' };
  }

  console.log(`[Matchmaker] Source ticket type: ${sourceTicket.__t}, status: ${sourceTicket.status}`);

  // Determine if this is a buy or sell request
  const isSellRequest = sourceTicket.__t === 'SellRequest';
  const OppositeModel = isSellRequest ? BuyRequest : SellRequest;

  console.log(`[Matchmaker] Looking for ${isSellRequest ? 'BuyRequests' : 'SellRequests'}`);
  
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

  console.log(`[Matchmaker] Found ${nearbyGames.length} games within date range`);
  */

  // Find all active tickets of opposite type with same game
  // Exclude tickets from the same user (can't match with yourself!)
  const potentialMatches = await OppositeModel.find({
    gameId: sourceTicket.gameId,
    status: 'open',
    userId: { $ne: sourceTicket.userId }
  }).populate('gameId');

  console.log(`[Matchmaker] Found ${potentialMatches.length} potential matches`);

  // Filter out matches with orphaned game references
  const validMatches = potentialMatches.filter(match => {
    if (match.gameId && typeof match.gameId === 'object' && !match.gameId._id) {
      console.warn(`[Matchmaker] Skipping match ${match._id} - references deleted game`);
      return false;
    }
    return true;
  });

  const pairings = [];

  for (const match of validMatches) {
    // Determine which is sale and which is request based on source type
    const saleTicket = isSellRequest ? sourceTicket : match;
    const requestTicket = isSellRequest ? match : sourceTicket;

    const { score, reasons, priceStatus } = calculatePairingScore(saleTicket, requestTicket);

    // Include based on threshold: all positive scores if includeAll, otherwise >= minMatchScore
    const threshold = includeAll ? 0 : minMatchScore;
    if (score > threshold) {
      // Convert to object and trim lastName for privacy
      const matchObj = match.toObject();
      if (matchObj.userSnapshot?.lastName) {
        matchObj.userSnapshot.lastName = matchObj.userSnapshot.lastName.charAt(0);
      }
      if (matchObj.userId?.lastName) {
        matchObj.userId.lastName = matchObj.userId.lastName.charAt(0);
      }

      if (matchObj.__t === 'BuyRequest') {
        matchObj.maxPrice = null;
      }

      matchObj.sectionType = getSectionTypeLabel(matchObj.sectionType);

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

  console.log(`[Matchmaker] Returning ${pairings.length} pairings (score > ${includeAll ? 0 : minMatchScore})`);

  return { sourceTicket, pairings };
}

/**
 * Get all potential pairings for a ticket
 *
 * GET /api/matchmaker/:ticketId
 * GET /api/matchmaker/:ticketId?all=true  (includes all positive scores)
 */
export async function getTicketPairings(req, res) {
  try {
    const includeAll = req.query.all === 'true';
    const { sourceTicket, pairings, error } = await getPairingsForTicketRequest(req.params.ticketId, includeAll);

    if (error) {
      return res.status(404).json({ success: false, error });
    }

    res.json({
      success: true,
      sourceTicket: {
        _id: sourceTicket._id,
        type: sourceTicket.__t,
        gameId: sourceTicket.gameId,
        sectionType: sourceTicket.sectionType,
        numTickets: sourceTicket.numTickets
      },
      pairingsCount: pairings.length,
      pairings
    });

  } catch (error) {
    console.error('[Matchmaker] Error finding pairings:', error);
    res.status(500).json({ success: false, error: 'Failed to find pairings', details: error.message });
  }
}

/**
 * Get the best (top 3) pairings for a ticket
 *
 * GET /api/matchmaker/:ticketId/best
 */
export async function getBestTicketPairings(req, res) {
  try {
    const { sourceTicket, pairings, error } = await getPairingsForTicketRequest(req.params.ticketId);

    if (error) {
      return res.status(404).json({ success: false, error });
    }

    const bestPairings = pairings.slice(0, 3);

    res.json({
      success: true,
      sourceTicket: {
        _id: sourceTicket._id,
        type: sourceTicket.__t,
        gameId: sourceTicket.gameId,
        sectionType: sourceTicket.sectionType,
        numTickets: sourceTicket.numTickets
      },
      pairingsCount: bestPairings.length,
      pairings: bestPairings
    });

  } catch (error) {
    console.error('[Matchmaker] Error finding best pairings:', error);
    res.status(500).json({ success: false, error: 'Failed to find best pairings', details: error.message });
  }
}

export async function getAllUserTicketMatches(req, res) {
  try {
    let userTicketMatches = [];
    
    const userTicketRequests = await TicketRequest.find({
      userId: req.user._id,
      status: 'open'
    }).populate('gameId');

    for (const userTicketRequest of userTicketRequests) {
      const { sourceTicket, pairings, error } = await getPairingsForTicketRequest(userTicketRequest._id, true);
      if (error) {
        console.error('[Matchmaker] Issue retrieving pairings for ticketId: ', userTicketRequest._id, '. Details: ', error);
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
    console.error('[Matchmaker] Error finding all pairings for user:', error);
    res.status(500).json({ success: false, error: 'Failed to find all pairings for user', details: error.message });
  }
}
