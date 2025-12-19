import express from 'express';
import { readFileSync } from 'fs';

/**
 * ROUTES: healthStatusRoutes
 *
 * Health and status endpoints for monitoring and admin visibility.
 *
 * Base path: /api/health (set when registered in server.js)
 */

const router = express.Router();
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * GET /api/health
 * Returns basic health info including backend version
 */
router.get('/', (req, res) => {
  res.json({ version: pkg.version });
});

export default router;