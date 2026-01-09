import { BuyRequest } from '../models/TicketRequest.js';
import Game from '../models/Game.js';

/**
 * Rate Limiting Service
 *
 * Enforces purchase limits:
 * 1. Max 2 purchases per game per user
 * 2. Max 3 purchases over any 4 consecutive games
 */

const MAX_PER_GAME = 2;
const MAX_CONSECUTIVE = 3;
const CONSECUTIVE_WINDOW = 4;

/**
 * Check if user has exceeded per-game purchase limit
 * @param {ObjectId} userId
 * @param {ObjectId} gameId
 * @returns {{ allowed: boolean, count: number, reason?: string }}
 */
export async function checkPerGameLimit(userId, gameId) {
  const count = await BuyRequest.countDocuments({
    userId,
    gameId,
    status: { $in: ['open', 'matched', 'completed'] }
  });

  if (count >= MAX_PER_GAME) {
    return {
      allowed: false,
      count,
      reason: `You already have ${count} purchase request(s) for this game. Maximum is ${MAX_PER_GAME}.`
    };
  }

  return { allowed: true, count };
}

/**
 * Check if user has exceeded consecutive games purchase limit
 * @param {ObjectId} userId
 * @param {ObjectId} targetGameId - The game user wants to purchase for
 * @returns {{ allowed: boolean, reason?: string, context?: object }}
 */
export async function checkConsecutiveGamesLimit(userId, targetGameId) {
  // Get all active/completed buy requests for this user with game data
  const userPurchases = await BuyRequest.find({
    userId,
    status: { $in: ['open', 'matched', 'completed'] }
  })
    .populate('gameId', '_id date opponent')
    .lean();

  if (userPurchases.length < MAX_CONSECUTIVE) {
    return { allowed: true };
  }

  // Get all games ordered by date
  const allGames = await Game.find({})
    .sort({ date: 1 })
    .select('_id date opponent')
    .lean();

  // Create a map of gameId to index for ordering
  const gameIndexMap = new Map();
  allGames.forEach((game, index) => {
    gameIndexMap.set(game._id.toString(), index);
  });

  // Get target game index
  const targetGameIndex = gameIndexMap.get(targetGameId.toString());
  if (targetGameIndex === undefined) {
    return { allowed: true }; // Unknown game, allow
  }

  // Get unique games user has purchases for
  const purchasedGameIds = [...new Set(
    userPurchases
      .filter(p => p.gameId)
      .map(p => p.gameId._id.toString())
  )];

  // Add target game to simulate the new purchase
  if (!purchasedGameIds.includes(targetGameId.toString())) {
    purchasedGameIds.push(targetGameId.toString());
  }

  // Sort by game index
  purchasedGameIds.sort((a, b) => gameIndexMap.get(a) - gameIndexMap.get(b));

  // Count purchases per game (including the new one)
  const purchaseCountByGame = new Map();
  userPurchases.forEach(p => {
    if (p.gameId) {
      const gid = p.gameId._id.toString();
      purchaseCountByGame.set(gid, (purchaseCountByGame.get(gid) || 0) + 1);
    }
  });
  // Add 1 for the new purchase on target game
  purchaseCountByGame.set(
    targetGameId.toString(),
    (purchaseCountByGame.get(targetGameId.toString()) || 0) + 1
  );

  // Check all windows of CONSECUTIVE_WINDOW games that include the target game
  for (let i = 0; i < purchasedGameIds.length; i++) {
    // Get window of games by their indices
    const windowStart = gameIndexMap.get(purchasedGameIds[i]);
    const windowEnd = windowStart + CONSECUTIVE_WINDOW - 1;

    // Only check windows that include the target game
    if (targetGameIndex < windowStart || targetGameIndex > windowEnd) {
      continue;
    }

    // Count purchases in this window
    let windowPurchases = 0;
    purchasedGameIds.forEach(gid => {
      const idx = gameIndexMap.get(gid);
      if (idx >= windowStart && idx <= windowEnd) {
        windowPurchases += purchaseCountByGame.get(gid) || 0;
      }
    });

    if (windowPurchases > MAX_CONSECUTIVE) {
      // Find the games in this window for context
      const windowGames = allGames.slice(windowStart, windowEnd + 1);
      return {
        allowed: false,
        reason: `Adding this purchase would exceed ${MAX_CONSECUTIVE} purchases over ${CONSECUTIVE_WINDOW} consecutive games.`,
        context: {
          windowGames: windowGames.map(g => ({ opponent: g.opponent, date: g.date })),
          purchasesInWindow: windowPurchases
        }
      };
    }
  }

  return { allowed: true };
}

/**
 * Combined check for all purchase limits
 * @param {ObjectId} userId
 * @param {ObjectId} gameId
 * @returns {{ allowed: boolean, reason?: string }}
 */
export async function checkPurchaseLimits(userId, gameId) {
  // Check per-game limit first (faster)
  const perGameCheck = await checkPerGameLimit(userId, gameId);
  if (!perGameCheck.allowed) {
    return perGameCheck;
  }

  // Check consecutive games limit
  const consecutiveCheck = await checkConsecutiveGamesLimit(userId, gameId);
  if (!consecutiveCheck.allowed) {
    return consecutiveCheck;
  }

  return { allowed: true };
}

/**
 * Get user's current purchase stats for display
 * @param {ObjectId} userId
 * @returns {{ perGame: object, consecutive: object, limits: object }}
 */
export async function getUserPurchaseStats(userId) {
  // Get all active buy requests for this user with game data
  const userPurchases = await BuyRequest.find({
    userId,
    status: { $in: ['open', 'matched', 'completed'] }
  })
    .populate('gameId', '_id date opponent')
    .lean();

  // Get upcoming games ordered by date
  const upcomingGames = await Game.find({ date: { $gte: new Date() } })
    .sort({ date: 1 })
    .select('_id date opponent')
    .lean();

  // Count purchases per game
  const perGameCounts = {};
  userPurchases.forEach(p => {
    if (p.gameId) {
      const gid = p.gameId._id.toString();
      perGameCounts[gid] = (perGameCounts[gid] || 0) + 1;
    }
  });

  // Build per-game stats for upcoming games
  const perGameStats = upcomingGames.map(game => ({
    gameId: game._id,
    opponent: game.opponent,
    date: game.date,
    purchaseCount: perGameCounts[game._id.toString()] || 0,
    remaining: MAX_PER_GAME - (perGameCounts[game._id.toString()] || 0)
  }));

  // Calculate consecutive window stats
  const allGames = await Game.find({})
    .sort({ date: 1 })
    .select('_id date opponent')
    .lean();

  const gameIndexMap = new Map();
  allGames.forEach((game, index) => {
    gameIndexMap.set(game._id.toString(), index);
  });

  // Find the current window (based on upcoming games)
  let currentWindowPurchases = 0;
  if (upcomingGames.length > 0) {
    const firstUpcomingIndex = gameIndexMap.get(upcomingGames[0]._id.toString()) || 0;
    const windowEnd = firstUpcomingIndex + CONSECUTIVE_WINDOW - 1;

    userPurchases.forEach(p => {
      if (p.gameId) {
        const idx = gameIndexMap.get(p.gameId._id.toString());
        if (idx !== undefined && idx >= firstUpcomingIndex && idx <= windowEnd) {
          currentWindowPurchases++;
        }
      }
    });
  }

  return {
    totalActivePurchases: userPurchases.length,
    perGame: perGameStats,
    consecutiveWindow: {
      purchasesInWindow: currentWindowPurchases,
      remaining: MAX_CONSECUTIVE - currentWindowPurchases,
      windowSize: CONSECUTIVE_WINDOW
    },
    limits: {
      maxPerGame: MAX_PER_GAME,
      maxConsecutive: MAX_CONSECUTIVE,
      consecutiveWindowSize: CONSECUTIVE_WINDOW
    }
  };
}
