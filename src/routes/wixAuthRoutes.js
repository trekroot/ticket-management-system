import express from 'express';
import { authenticateWixUser } from '../controllers/wixAuthController.js';

const router = express.Router();

/**
 * Wix Authentication Routes
 * POST /api/auth/wix - Authenticate Wix member via HMAC signature
 */

router.post('/wix', authenticateWixUser);

export default router;
