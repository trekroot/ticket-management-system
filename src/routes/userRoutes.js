import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { isUserOwnerOrAdmin, isAdmin } from '../middleware/authorize.js';
import {
    getUserById,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserPublicProfile,
    deactivateUser,
    verifyUserExists,
    getUserByFirebaseId
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


router.route('/firebase/:firebaseUid')
    .get(verifyFirebaseToken, getUserByFirebaseId);

router.route('/verifyAccount/:firebaseUid')
    .get(verifyFirebaseToken, verifyUserExists);

router.route('/')
    .get(verifyFirebaseToken, isAdmin, getAllUsers)
    .post(createUser);  // Registration - no auth required

// Parameter routes with suffixes
router.route('/:id/deactivate')
    .put(verifyFirebaseToken, isUserOwnerOrAdmin, deactivateUser);

router.route('/:id/public')
    .get(verifyFirebaseToken, getUserPublicProfile);

// Plain parameter routes LAST
router.route('/:id')
    .get(verifyFirebaseToken, isUserOwnerOrAdmin, getUserById)
    .put(verifyFirebaseToken, isUserOwnerOrAdmin, updateUser)
    .delete(verifyFirebaseToken, isUserOwnerOrAdmin, deleteUser);

export default router;