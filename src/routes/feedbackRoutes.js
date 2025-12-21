import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/authorize.js';
import { createFeedback, getAllFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

/**
 * Main CRUD routes
 *
 * POST /api/feeback    - Submit a feedback request
 * GET /api/feeback     - Submit a feedback request
*/

router.route('/')
  .post(verifyFirebaseToken, createFeedback);

router.route('/')
  .post(verifyFirebaseToken, isAdmin, getAllFeedback);

export default router;