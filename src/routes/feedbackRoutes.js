import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/authorize.js';
import { createFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

/**
 * Main CRUD routes
 *
 * POST /api/feeback     - Submit a feedback request
 */

router.route('/')
  .post(verifyFirebaseToken, createFeedback);

export default router;