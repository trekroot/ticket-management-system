import express from 'express';
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
    .post(createGame);
    
router.route('/:id')
    .get(getGameById)
    .put(updateGame)
    .delete(deleteGame);

/**
* Convenience route for getting all games in a season
* GET /api/games/season/:year   - All games for a specific season
*/
router.get('/season/:year', getGamesBySeason);

export default router;