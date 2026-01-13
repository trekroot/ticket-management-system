import express from 'express';
import { verifyUserAuthenticated, verifyFirebaseAuth } from '../middleware/auth.js';
import { isUserOwnerOrAdmin, isAdmin } from '../middleware/authorize.js';
import {
    getUserById,
    getAllUsers,
    createUser,
    updateUser,
    updateUserSettings,
    deleteUser,
    getUserPublicProfile,
    deactivateUser,
    verifyUserExists,
    getUserByFirebaseId,
    acceptTermsOfService
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
    .get(verifyUserAuthenticated, getUserByFirebaseId);

router.route('/verifyAccount/:firebaseUid')
    .get(verifyFirebaseAuth, verifyUserExists);

router.route('/')
    .get(verifyUserAuthenticated, isAdmin, getAllUsers)
    .post(createUser);  // Registration - no auth required

// Parameter routes with suffixes
router.route('/:id/deactivate')
    .put(verifyUserAuthenticated, isUserOwnerOrAdmin(req => req.params.id), deactivateUser);

router.route('/:id/public')
    .get(verifyUserAuthenticated, getUserPublicProfile);

router.route('/:id/accept-tos')
    .post(verifyUserAuthenticated, isUserOwnerOrAdmin(req => req.params.id), acceptTermsOfService);

router.route('/:id/settings')
    .put(verifyUserAuthenticated, isUserOwnerOrAdmin(req => req.params.id), updateUserSettings);

// Plain parameter routes LAST
router.route('/:id')
    .get(verifyUserAuthenticated, isUserOwnerOrAdmin(req => req.params.id), getUserById)
    .put(verifyUserAuthenticated, isUserOwnerOrAdmin(req => req.params.id), updateUser)
    .delete(verifyUserAuthenticated, isUserOwnerOrAdmin(req => req.params.id), deleteUser);

export default router;