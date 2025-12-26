import AdminAuditLog from '../models/AdminAuditLog.js';

/**
 * Admin Audit Service
 *
 * Provides methods for logging and querying admin actions.
 * Call logAdminAction() from controllers when an admin performs an action.
 */

/**
 * Log an admin action
 *
 * @param {Object} params
 * @param {string} params.adminId - The admin user's ID
 * @param {string} params.action - The action performed (e.g., 'cancel_match')
 * @param {string} params.targetType - The model type ('Match', 'TicketRequest', 'User', 'Game')
 * @param {string} params.targetId - The ID of the affected document
 * @param {string[]} [params.affectedUserIds] - Optional: users affected by this action
 * @param {Object} [params.changes] - Optional: { before, after } snapshots
 * @param {string} [params.notes] - Optional: explanation for the action
 * @returns {Promise<AdminAuditLog>}
 */
export async function logAdminAction({
  adminId,
  action,
  targetType,
  targetId,
  affectedUserIds,
  changes,
  notes
}) {

  console.log(`[Admin] logging in AuditService for Admin: ${adminId}, Match: ${targetType}. Reason: ${notes}.`);
  const log = await AdminAuditLog.create({
    adminId,
    action,
    targetType,
    targetId,
    affectedUserIds,
    changes,
    notes
  });

  return log;
}

/**
 * Check if the requesting user is an admin (not the resource owner)
 * Use this to determine if an action should be logged
 *
 * @param {Object} req - Express request with req.user
 * @param {string} resourceOwnerId - The userId who owns the resource
 * @returns {boolean}
 */
export function isAdminAction(req, resourceOwnerId) {
  return req.user.role === 'admin' &&
         req.user._id.toString() !== resourceOwnerId?.toString();
}

/**
 * Get audit logs with filters
 *
 * @param {Object} filters
 * @param {string} [filters.adminId] - Filter by admin
 * @param {string} [filters.targetType] - Filter by model type
 * @param {string} [filters.targetId] - Filter by specific document
 * @param {string} [filters.affectedUserId] - Filter by affected user (matches if in array)
 * @param {string} [filters.action] - Filter by action type
 * @param {Date} [filters.startDate] - Filter from date
 * @param {Date} [filters.endDate] - Filter to date
 * @param {number} [limit=50] - Max results
 * @param {number} [skip=0] - Pagination offset
 * @returns {Promise<AdminAuditLog[]>}
 */
export async function getAuditLogs({
  adminId,
  targetType,
  targetId,
  affectedUserId,
  action,
  startDate,
  endDate,
  limit = 50,
  skip = 0
} = {}) {
  const query = {};

  if (adminId) query.adminId = adminId;
  if (targetType) query.targetType = targetType;
  if (targetId) query.targetId = targetId;
  if (affectedUserId) query.affectedUserIds = affectedUserId; // MongoDB matches if array contains value
  if (action) query.action = action;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await AdminAuditLog.find(query)
    .populate('adminId', 'username firstName lastName email')
    .populate('affectedUserIds', 'username firstName lastName email')
    .populate('targetId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  return logs;
}

/**
 * Get audit log count for pagination
 */
export async function getAuditLogCount(filters = {}) {
  const query = {};

  if (filters.adminId) query.adminId = filters.adminId;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.targetId) query.targetId = filters.targetId;
  if (filters.affectedUserId) query.affectedUserIds = filters.affectedUserId;
  if (filters.action) query.action = filters.action;

  return AdminAuditLog.countDocuments(query);
}