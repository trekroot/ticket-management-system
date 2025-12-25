import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/authorize.js';
import { createFeedback, getAllFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

/**
 * Main CRUD routes
 *
 * POST /api/feedback    - Submit feedback
 * GET  /api/feedback    - Get all feedback (admin only)
*/

router.route('/')
  .get(verifyFirebaseToken, isAdmin, getAllFeedback)
  .post(verifyFirebaseToken, createFeedback);

export default router;