import express from 'express';
import { appConfig } from '../config/app';

/**
 * ROUTES: healthStatusRoutes
 *
 * Health and status endpoints for monitoring and admin visibility.
 *
 * Base path: /api/health (set when registered in server.js)
 */

const router = express.Router();

/**
 * GET /api/health
 * Returns basic health info including backend version
 */
router.get('/', (req, res) => {
  res.json({ version: appConfig.backendVersion });
});

export default router;