import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/authorize.js';
import { getAdminAuditLogs } from '../controllers/adminAuditController.js';

const router = express.Router();

/**
 * Admin Audit Routes
 *
 * All routes require admin authentication.
 *
 * GET /api/admin/audit - Get audit logs with optional filters
 */

router.get('/', verifyFirebaseToken, isAdmin, getAdminAuditLogs);

export default router;