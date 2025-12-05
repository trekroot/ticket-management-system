import Game from '../models/Game.js';

/**
 * CONTROLLER: gameController
 *
 * Handles all CRUD operations for games.
 * Games represent matches that users can buy/sell tickets for.
 */

/**
 * GET /api/games
 * Get all games with optional filtering
 *
 * Query params:
 *   - season: number (e.g., 2025) - filter by season year
 *   - venue: string - filter by venue name
 *   - upcoming: 'true' - only show games in the future
 */
export const getAllGames = async (req, res) => {
  try {
    const { season, venue, upcoming } = req.query;

    // Build filter object dynamically based on query params
    const filter = {};
    if (season) filter.season = parseInt(season);
    if (venue) filter.venue = venue;
    if (upcoming === 'true') {
      filter.date = { $gte: new Date() }; // $gte = greater than or equal
    }

    const games = await Game.find(filter).sort({ date: 1 }); // Sort by date ascending (earliest first)

    res.json({
      success: true,
      count: games.length,
      data: games
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/games/:id
 * Get a single game by its MongoDB ObjectId
 */
export const getGameById = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    res.json({
      success: true,
      data: game
    });
  } catch (error) {
    // Handle invalid ObjectId format (e.g., "abc" instead of valid 24-char hex)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/games
 * Create a new game
 *
 * Body: {
 *   opponent: string (required),
 *   date: Date (required - includes both date and time),
 *   venue: string (optional, defaults to "Fitzpatrick Stadium"),
 *   season: number (required, e.g., 2025),
 *   matchType: string (optional, defaults to "USL League One"),
 *   isHomeGame: boolean (optional, defaults to true)
 * }
 */
// TODO: Add admin authentication/authorization middleware before allowing game creation
export const createGame = async (req, res) => {
  try {
    // Game.create() is shorthand for new Game() + save()
    // It also runs schema validation automatically
    const game = await Game.create(req.body);

    res.status(201).json({
      success: true,
      data: game
    });
  } catch (error) {
    // Handle Mongoose validation errors (missing required fields, invalid enum values, etc.)
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
 * PUT /api/games/:id
 * Update an existing game
 *
 * Body: Any subset of game fields to update
 */
// TODO: Add admin authentication/authorization middleware before allowing game creation
export const updateGame = async (req, res) => {
  try {
    const game = await Game.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,           // Return the updated document, not the original
        runValidators: true  // Ensure updates pass schema validation (e.g., venue enum)
      }
    );

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    res.json({
      success: true,
      data: game
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE /api/games/:id
 * Delete a game
 *
 * Note: In production, consider checking if any ticket requests
 * reference this game before allowing deletion, or use soft delete.
 */
// TODO: Add admin authentication/authorization middleware before allowing game creation
export const deleteGame = async (req, res) => {
  try {
    const game = await Game.findByIdAndDelete(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    res.json({
      success: true,
      data: {},
      message: 'Game deleted'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/games/season/:year
 * Get all games for a specific season
 *
 * This is a convenience endpoint - same as GET /api/games?season=2025
 * but more RESTful for season-based lookups
 */
export const getGamesBySeason = async (req, res) => {
  try {
    const season = parseInt(req.params.year);

    if (isNaN(season)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season year'
      });
    }

    const games = await Game.find({ season }).sort({ date: 1 });

    res.json({
      success: true,
      count: games.length,
      data: games
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
