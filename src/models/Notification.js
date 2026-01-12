import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['match_initiated', 'match_accepted', 'match_cancelled', 'match_completed'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  // Reference to related match for navigation
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  // Who triggered this notification (for display)
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fromUserName: { type: String },
  ticketId: { type: String },
  actionable: { type: Boolean, default: true },
  // Auto-delete after 30 days
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: { expires: 0 }
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Compound index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
