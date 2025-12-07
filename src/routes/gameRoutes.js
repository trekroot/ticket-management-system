import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
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
    .post(verifyFirebaseToken, isAdmin, createGame);

router.route('/:id')
    .get(verifyFirebaseToken, getGameById)
    .put(verifyFirebaseToken, isAdmin, updateGame)
    .delete(verifyFirebaseToken, isAdmin, deleteGame);

/**
* Convenience route for getting all games in a season
* GET /api/games/season/:year   - All games for a specific season
*/
router.get('/season/:year', verifyFirebaseToken, getGamesBySeason);

export default router;