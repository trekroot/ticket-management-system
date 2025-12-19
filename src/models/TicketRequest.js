import mongoose from 'mongoose';

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
  
  // Stadium section type - used for matching
  sectionType: {
    type: String,
    enum: ['supporters', 'standard', 'standing_room', 'deweys', 'highroller'],
    required: function() {
      // Sellers always need a section type
      if (this.__t === 'SellRequest') return true;
      // Buyers only need section if not selecting "any"
      if (this.__t === 'BuyRequest') return !this.anySection;
      return true;
    }
  },

  // How many tickets
  numTickets: {
    type: Number,
    required: true,
    min: 1
  },

  // Do the tickets need to be together (adjacent seats)?
  // TODO: ignore ticketsTogether request if only 1 ticket
  ticketsTogether: {
    type: Boolean,
    default: false
  },

  // Free-form notes from the user
  notes: {
    type: String
  },

  // Request lifecycle status
  status: {
    type: String,
    enum: ['open', 'matched', 'completed', 'cancelled'],
    default: 'open'
  },

  // Snapshot of user info at time of creation (preserved if user is deleted)
  userSnapshot: {
    username: String,
    firstName: String,
    lastName: String
  },

}, {
  timestamps: true,           // Adds createdAt and updatedAt automatically
  collection: 'ticketrequests',
  discriminatorKey: '__t'     // This field stores 'BuyRequest' or 'SellRequest'
});

// Index for common queries
ticketRequestSchema.index({ gameId: 1, status: 1 });
ticketRequestSchema.index({ userId: 1 });

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
  anySection: {
    type: Boolean,
    default: false
  },
});

/**
 * DISCRIMINATOR: SellRequest
 *
 * Inherits ALL fields from TicketRequest, plus adds seller-specific fields.
 * When you do `new SellRequest({...})`, Mongoose automatically sets __t: 'SellRequest'
 *
 * Seat details vary by sectionType:
 *   - standard (100-117): sectionNumber, row (A-Z), seats [1-20]
 *   - supporters (118): sectionNumber, row (A-Z), seats [1-20]
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

  // Is this a free donation?
  donatingFree: {
    type: Boolean,
    default: false
  },

  // Section number/identifier
  // - standard: 100-117
  // - supporters: 118-120
  // - deweys: 1-6
  // - highroller: 'FC-1' through 'FC-7'
  // - standing_room: not used
  section: {
    type: mongoose.Schema.Types.Mixed
  },

  // Row letter for standard seating (A-Z)
  // Only applies to standard (100-117) and supporters section 118
  row: {
    type: String,
    uppercase: true,
    match: /^[A-Z]$/
  },

  // Seat numbers for standard seating [1-20]
  // Only applies to standard (100-117) and supporters section 118
  seats: [{
    type: Number,
    min: 1,
    max: 20
  }],
});

// Create discriminator models
// These are linked to the base TicketRequest model
const BuyRequest = TicketRequest.discriminator('BuyRequest', buyRequestSchema);
const SellRequest = TicketRequest.discriminator('SellRequest', sellRequestSchema);

/**
 * USAGE EXAMPLES:
 *
 * // Create a buy request
 * const buy = await BuyRequest.create({
 *   userId: someUserId,
 *   gameId: someGameId,
 *   sectionType: 'supporters',
 *   numTickets: 2,
 *   maxPrice: 25,
 *   firstTimeAttending: true
 * });
 *
 * // Create a sell request - standard seating
 * const sell = await SellRequest.create({
 *   userId: someUserId,
 *   gameId: someGameId,
 *   sectionType: 'standard',
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
 *   sectionType: 'highroller',
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
 *   sectionType: 'deweys',
 *   sectionNumber: 4,
 *   ticketNumbers: [2, 3, 4],
 *   numTickets: 3,
 *   minPrice: 3
 * });
 */

export { TicketRequest, BuyRequest, SellRequest };
