import mongoose from 'mongoose';

/**
 * AdminAuditLog Schema
 *
 * Centralized audit trail for all admin actions across the system.
 * Uses Mongoose refPath for polymorphic references - targetId can
 * reference different collections based on targetType value.
 */
const adminAuditLogSchema = new mongoose.Schema({
  // The admin who performed the action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // What action was performed
  action: {
    type: String,
    enum: [
      // Match actions
      'accept_match',
      'cancel_match',
      'complete_match',
      // Ticket actions
      'update_ticket',
      'delete_ticket',
      // User actions
      'update_user',
      'delete_user',
      'deactivate_user',
      // Game actions
      'create_game',
      'update_game',
      'delete_game'
    ],
    required: true
  },

  // Which model type was affected
  targetType: {
    type: String,
    enum: ['Match', 'TicketRequest', 'User', 'Game'],
    required: true
  },

  // ID of the affected document - uses refPath for dynamic population
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetType',
    required: true
  },

  // Optional: IDs of users affected by this action
  // Useful for queries like "show all admin actions affecting user X's stuff"
  // Array supports Match actions which affect two users
  affectedUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Snapshot of changes made
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },

  // Optional notes explaining why the action was taken
  notes: String

}, {
  timestamps: true  // adds createdAt, updatedAt
});

// Indexes for common query patterns
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1 });
adminAuditLogSchema.index({ affectedUserIds: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);

export default AdminAuditLog;