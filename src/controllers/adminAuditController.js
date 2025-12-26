import { getAuditLogs, getAuditLogCount } from '../services/adminAuditService.js';

/**
 * Admin Audit Controller
 *
 * Provides endpoints for admins to view audit logs of admin actions.
 */

/**
 * GET /api/admin/audit
 * Get admin audit logs with optional filters
 *
 * Query params:
 *   - adminId: Filter by specific admin
 *   - targetType: 'Match' | 'TicketRequest' | 'User' | 'Game'
 *   - targetId: Filter by specific document
 *   - affectedUserId: Filter by affected user
 *   - action: Filter by action type
 *   - startDate: Filter from date (ISO string)
 *   - endDate: Filter to date (ISO string)
 *   - limit: Max results (default 50)
 *   - skip: Pagination offset (default 0)
 */
export async function getAdminAuditLogs(req, res) {
  try {
    const {
      adminId,
      targetType,
      targetId,
      affectedUserId,
      action,
      startDate,
      endDate,
      limit = 50,
      skip = 0
    } = req.query;

    const [logs, total] = await Promise.all([
      getAuditLogs({
        adminId,
        targetType,
        targetId,
        affectedUserId,
        action,
        startDate,
        endDate,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }),
      getAuditLogCount({
        adminId,
        targetType,
        targetId,
        affectedUserId,
        action
      })
    ]);

    res.json({
      success: true,
      count: logs.length,
      total,
      data: logs
    });
  } catch (error) {
    console.error('[AdminAudit] Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      details: error.message
    });
  }
}