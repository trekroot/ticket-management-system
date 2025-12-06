import express from 'express';
import {
    getUserById,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserPublicProfile
} from '../controllers/userController.js';

const router = express.Router();

/**
 * Main CRUD routes
 * GET       /api/users             - Get all users
 * GET       /api/users/:id         - Get single user by ID
 * POST      /api/users             - Create new user
 * PUT       /api/users/:id         - Update user
 * DELETE    /api/users/:id         - Delete user
 * GET       /api/users/:id/public  - Get user's public profile
 */

router.route('/')
    .get(getAllUsers)
    .post(createUser);

router.route('/:id')
    .get(getUserById)
    .put(updateUser)
    .delete(deleteUser)

router.route('/:id/public')
    .get(getUserPublicProfile)


export default router;