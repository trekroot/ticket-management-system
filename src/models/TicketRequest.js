import mongoose from 'mongoose';
import { getSectionTypeLabel } from './SeatingFormat.js';

/**
 * BASE SCHEMA: TicketRequest
 *
 * This is the parent schema containing fields shared by BOTH buy and sell requests.
 * We use Mongoose discriminators to create "child" models (BuyRequest, SellRequest)
 * that inherit these fields and add their own type-specific fields.
 *
 * All documents are stored in a single 'ticketrequest' collection.
 * Mongoose adds a '__t' field (discriminator key) to identify the type.
 */
const ticketRequestSchema = new mongoose.Schema({
  // Reference to the user making the request
  // ObjectId links to the User collection - similar to a foreign key
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Reference to which game this request is for
  // NOT required - if not provided, match any request. Give date a mid-level value
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: false
  },

  // How many tickets
  numTickets: {
    type: Number,
    min: 1,
    required: function() {
      // Sellers only need numTickets if section doesn't have seats, else numTickets
      return this.__t === 'BuyRequest' || [119, 120, 'standing_room'].includes(this.section);
    }
  },

  // Free-form notes from the user
  notes: {
    type: String
  },

  // Request lifecycle status
  // - open: active request seeking matches
  // - matched: paired with another request
  // - completed: transaction finished
  // - cancelled: user cancelled the request
  // - deactivated: system cancelled due to user account deactivation/deletion
  status: {
    type: String,
    enum: ['open', 'matched', 'completed', 'cancelled', 'deactivated'],
    default: 'open'
  },

  // Snapshot of user info at time of creation (preserved if user is deleted)
  userSnapshot: {
    discordHandle: String,
    username: String,
    firstName: String,
    lastName: String
  },

  // Snapshot of counterparty info at time of match accepted
  counterpartySnapshot: {
    discordHandle: String,
    username: String,
    firstName: String,
    lastName: String,
    email: String
  },

  // True if this ticket was auto-created when user initiated a match
  // without having their own ticket first (direct match)
  isDirectMatch: {
    type: Boolean,
    default: false
  },

}, {
  timestamps: true,           // Adds createdAt and updatedAt automatically
  collection: 'ticketrequests',
  discriminatorKey: '__t'     // This field stores 'BuyRequest' or 'SellRequest'
});

// Index for common queries
ticketRequestSchema.index({ gameId: 1, status: 1 });
ticketRequestSchema.index({ userId: 1 });

// Virtual for frontend compatibility - returns the relevant sectionType
ticketRequestSchema.virtual('effectiveSectionType').get(function() {
  if (this.__t === 'BuyRequest') return this.sectionTypeDesired;
  if (this.__t === 'SellRequest') return this.sectionTypeOffered;
  return null; // Trade uses explicit fields
});

// Include virtuals in JSON/Object output + auto-add sectionTypeLabel
ticketRequestSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    if (doc.sectionType) ret.sectionTypeLabel = getSectionTypeLabel(doc.sectionType);
    if (doc.sectionTypeOffered) ret.sectionTypeOfferedLabel = getSectionTypeLabel(doc.sectionTypeOffered);
    if (doc.sectionTypeDesired) ret.sectionTypeDesiredLabel = getSectionTypeLabel(doc.sectionTypeDesired);
    return ret;
  }
});
ticketRequestSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    if (doc.sectionType) ret.sectionTypeLabel = getSectionTypeLabel(doc.sectionType);
    if (doc.sectionTypeOffered) ret.sectionTypeOfferedLabel = getSectionTypeLabel(doc.sectionTypeOffered);
    if (doc.sectionTypeDesired) ret.sectionTypeDesiredLabel = getSectionTypeLabel(doc.sectionTypeDesired);
    return ret;
  }
});

// Create the base model
const TicketRequest = mongoose.model('TicketRequest', ticketRequestSchema);

/**
 * DISCRIMINATOR: BuyRequest
 *
 * Inherits ALL fields from TicketRequest, plus adds buyer-specific fields.
 * When you do `new BuyRequest({...})`, Mongoose automatically sets __t: 'BuyRequest'
 */
const buyRequestSchema = new mongoose.Schema({
  // Maximum price willing to pay per ticket
  maxPrice: {
    type: Number,
    min: 0
  },

  // Does the buyer require adjacent seats?
  requireTogether: {
    type: Boolean,
    default: false
  },

  // Is this person a band member? (May get priority or special pricing)
  bandMember: {
    type: Boolean,
    default: false
  },

  // First time attending a game? (Some programs give free tickets to first-timers)
  firstTimeAttending: {
    type: Boolean,
    default: false
  },

  // Requesting a free/donated ticket?
  requestingFree: {
    type: Boolean,
    default: false
  },

  // Flag for desiring any section
  anySectionDesired: {
    type: Boolean,
    default: false
  },
  
  // Stadium section type - used for matching
  sectionTypeDesired: {
    type: String,
    enum: ['supporters', 'standard', 'standing_room', 'deweys', 'highroller', 'goal_zone', 'See Notes'],
    required: function() {
      return !this.anySectionDesired;
    }
  },
});

/**
 * DISCRIMINATOR: SellRequest
 *
 * Inherits ALL fields from TicketRequest, plus adds seller-specific fields.
 * When you do `new SellRequest({...})`, Mongoose automatically sets __t: 'SellRequest'
 *
 * Seat details vary by sectionTypeOffered:
 *   - standard (100-117): sectionNumber, row (A-T), seats [1-20]
 *   - supporters (118): sectionNumber, row (A-T), seats [1-20]
 *   - supporters (119-120): sectionNumber only (GA)
 *   - standing_room: no seat details (GA)
 *   - deweys (1-6): sectionNumber, ticketNumbers [1-50]
 *   - highroller (FC-1 to FC-7): sectionNumber, ticketNumbers [1-20]
 */
const sellRequestSchema = new mongoose.Schema({

  // Minimum price willing to accept per ticket
  minPrice: {
    type: Number,
    min: 0
  },

  // Are the offered seats adjacent? (computed from seats array)
  seatsAdjacent: {
    type: Boolean,
    default: true
  },

  // Is this a free donation?
  donatingFree: {
    type: Boolean,
    default: false
  },
  
  // Stadium section type - used for matching
  sectionTypeOffered: {
    type: String,
    enum: ['supporters', 'standard', 'standing_room', 'deweys', 'highroller', 'goal_zone', 'See Notes'],
    required: true
  },

  // Section number/identifier
  // - standard: 100-117
  // - supporters: 118-120
  // - deweys: 1-6
  // - highroller: 'FC-1' through 'FC-7'
  // - goal_zone: GA/standing room only
  // - standing_room: not used
  section: {
    type: mongoose.Schema.Types.Mixed
  },

  // Row letter for standard seating (A-T)
  // Only applies to standard (100-117) and supporters section 118
  row: {
    type: String,
    uppercase: true,
    match: /^[A-T]$/
  },

  // Seat numbers for standard seating [1-20]
  // Only applies to standard (100-117) and supporters section 118
  seats: {
    type: [Number]
  },
});

/**
   * DISCRIMINATOR: TradeRequest
   *
   * Inherits ALL fields from TicketRequest except minPrice, plus adds trade-specific fields.
   * Similar to SellRequest but without price - user wants to trade tickets for different games.
   */
const tradeRequestSchema = new mongoose.Schema({
  fullSeasonTrade: {
    type: Boolean,
    default: false
  },

  // Does the trader require adjacent seats in return?
  requireTogether: {
    type: Boolean,
    default: false
  },

  // Are the offered seats adjacent? (computed from seats array)
  seatsAdjacent: {
    type: Boolean,
    default: true
  },

  // Games the user is offering (required, at least one)
  gamesOffered: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Game',
    required: function() {
      return !this.fullSeasonTrade
    },
    validate: {
      validator: function(v) {
        if (this.fullSeasonTrade) return true;
        return v && v.length > 0;
      },
      message: 'At least one offered game is required when not trading for full season'
    }
  },

  // Games the user wants to trade for (required, at least one)
  gamesDesired: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Game',
    required: function() {
      return !this.fullSeasonTrade
    },
    validate: {
      validator: function(v) {
        if (this.fullSeasonTrade) return true;
        return v && v.length > 0;
      },
      message: 'At least one desired game is required when not trading for full season'
    }
  },

  // Flag for desiring any section
  anySectionDesired: {
    type: Boolean,
    default: false
  },
  
  // Offered Section Type
  sectionTypeOffered: {
    type: String,
    enum: ['supporters', 'standard', 'standing_room', 'deweys', 'highroller', 'goal_zone', 'See Notes'],
    required: true
  },
  
  // Desired Section Type
  sectionTypeDesired: {
    type: String,
    enum: ['supporters', 'standard', 'standing_room', 'deweys', 'highroller', 'goal_zone', 'See Notes'],
    required: function() {
      // Traders & Sellers always need a sectionType, Buyers only need sectionType if not selecting "any"
      return !this.anySectionDesired;
    }
  },

  // Section number/identifier (same as SellRequest)
  section: {
    type: mongoose.Schema.Types.Mixed
  },

  // Row letter for standard seating
  row: {
    type: String,
    uppercase: true,
    match: /^[A-T]$/
  },

  // Seat numbers for standard seating
  seats: {
    type: [Number]
  },
});

// Create discriminator models
// These are linked to the base TicketRequest model
const BuyRequest = TicketRequest.discriminator('BuyRequest', buyRequestSchema);
const SellRequest = TicketRequest.discriminator('SellRequest', sellRequestSchema);
const TradeRequest = TicketRequest.discriminator('TradeRequest', tradeRequestSchema);

/**
 * USAGE EXAMPLES:
 *
 * // Create a buy request
 * const buy = await BuyRequest.create({
 *   userId: someUserId,
 *   gameId: someGameId,
 *   sectionTypeDesired: 'supporters',
 *   numTickets: 2,
 *   maxPrice: 25,
 *   firstTimeAttending: true
 * });
 *
 * // Create a sell request - standard seating
 * const sell = await SellRequest.create({
 *   userId: someUserId,
 *   gameId: someGameId,
 *   sectionTypeOffered: 'standard',
 *   sectionNumber: 105,
 *   row: 'C',
 *   seats: [12, 13],
 *   numTickets: 2,
 *   minPrice: 20
 * });
 *
 * // Create a sell request - highroller
 * const sellHighroller = await SellRequest.create({
 *   userId: someUserId,
 *   gameId: someGameId,
 *   sectionTypeOffered: 'highroller',
 *   sectionNumber: 'FC-3',
 *   ticketNumbers: [5, 6],
 *   numTickets: 2,
 *   minPrice: 50
 * });
 *
 * // Create a sell request - deweys
 * const sellDeweys = await SellRequest.create({
 *   userId: someUserId,
 *   gameId: someGameId,
 *   sectionTypeOffered: 'deweys',
 *   sectionNumber: 4,
 *   ticketNumbers: [2, 3, 4],
 *   numTickets: 3,
 *   minPrice: 3
 * });
 */

export { TicketRequest, BuyRequest, SellRequest, TradeRequest };
