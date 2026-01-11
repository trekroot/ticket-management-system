import express from 'express';
import { verifyUserAuthenticated } from '../middleware/auth.js';
import { isAdmin } from '../middleware/authorize.js';
import {
    getAllGames,
    getGameById,
    createGame,
    updateGame,
    deleteGame,
    getGamesBySeason
} from '../controllers/gameController.js';

const router = express.Router();

/**
* Main CRUD routes
* GET       /api/games          - Get all games
* GET       /api/games/:id      - Get single game by ID
* POST      /api/games          - Create a new game
* PUT       /api/games/:id      - Update a game
* DELETE    /api/games/:id      - Delete a game
*/

router.route('/')
    .get(getAllGames)
    .post(verifyUserAuthenticated, isAdmin, createGame);

router.route('/:id')
    .get(verifyUserAuthenticated, getGameById)
    .put(verifyUserAuthenticated, isAdmin, updateGame)
    .delete(verifyUserAuthenticated, isAdmin, deleteGame);

/**
* Convenience route for getting all games in a season
* GET /api/games/season/:year   - All games for a specific season
*/
router.get('/season/:year', verifyUserAuthenticated, getGamesBySeason);

export default router;