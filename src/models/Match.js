import mongoose from 'mongoose';

/**
 * Match Schema
 *
 * Tracks the lifecycle of a match between two tickets.
 * Works for all match types: Buy↔Sell, Trade↔Trade, Trade↔Buy, Trade↔Sell
 *
 * Separate from TicketRequest to maintain clean audit trail and
 * allow independent querying of match history.
 */
const matchSchema = new mongoose.Schema({
  // The ticket whose owner initiated this match
  initiatorTicketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketRequest',
    required: true
  },

  // The ticket they're matching with
  matchedTicketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketRequest',
    required: true
  },

  // Current match status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },

  // Audit trail - every status change is logged
  history: [{
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'cancelled', 'expired'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],

  // Optional: expiration for pending matches //TODO, after seeing movement
  expiresAt: {
    type: Date
  }

}, {
  timestamps: true  // adds createdAt, updatedAt
});

// Index for common queries
matchSchema.index({ initiatorTicketId: 1 });
matchSchema.index({ matchedTicketId: 1 });
matchSchema.index({ status: 1 });

const Match = mongoose.model('Match', matchSchema);

export default Match;