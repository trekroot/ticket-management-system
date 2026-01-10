import express from 'express';
import { verifyAdminEmail } from '../controllers/adminAuthController.js';

const router = express.Router();

/**
 * Admin Authentication Routes
 *
 * These routes handle admin-specific auth flows, specifically
 * pre-verifying admin status before Firebase login.
 */

// POST /api/admin/auth/verify-email - Check if email belongs to admin
router.post('/verify-email', verifyAdminEmail);

export default router;
