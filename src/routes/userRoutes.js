import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { isOwnerOrAdmin, isAdmin } from '../middleware/authorize.js';
import {
    getUserById,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserPublicProfile,
    deactivateUser
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
    .get(verifyFirebaseToken, isAdmin, getAllUsers)
    .post(createUser);  // Registration - no auth required

router.route('/:id/deactivate')
    .put(verifyFirebaseToken, isOwnerOrAdmin, deactivateUser);

router.route('/:id')
    .get(verifyFirebaseToken, isOwnerOrAdmin, getUserById)
    .put(verifyFirebaseToken, isOwnerOrAdmin, updateUser)
    .delete(verifyFirebaseToken, isOwnerOrAdmin, deleteUser);

router.route('/:id/public')
    .get(verifyFirebaseToken, getUserPublicProfile);


export default router;