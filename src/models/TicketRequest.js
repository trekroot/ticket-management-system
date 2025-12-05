import mongoose from 'mongoose';

/**
 * BASE SCHEMA: TicketRequest
 *
 * This is the parent schema containing fields shared by BOTH buy and sell requests.
 * We use Mongoose discriminators to create "child" models (BuyRequest, SellRequest)
 * that inherit these fields and add their own type-specific fields.
 *
 * All documents are stored in a single 'ticketrequests' collection.
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
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },

  // Stadium section (e.g., "Section 101", "General Admission", "Supporters Section")
  section: {
    type: String,
    enum: ['Supporters Section', 'Non-Supporters Section', 'Specialty Seating'],
    required: true
  },

  // How many tickets
  numTickets: {
    type: Number,
    required: true,
    min: 1
  },

  // Do the tickets need to be together (adjacent seats)?
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
 *   section: 'Section 101',
 *   numTickets: 2,
 *   maxPrice: 25,
 *   firstTimeAttending: true
 * });
 *
 * // Create a sell request
 * const sell = await SellRequest.create({
 *   userId: someUserId,
 *   gameId: someGameId,
 *   section: 'Section 101',
 *   numTickets: 2,
 *   minPrice: 20,
 *   donatingFree: false
 * });
 *
 * // Query all requests for a game (both buy and sell)
 * const allRequests = await TicketRequest.find({ gameId: someGameId });
 *
 * // Query only buy requests
 * const buyRequests = await BuyRequest.find({ gameId: someGameId });
 *
 * // Query only sell requests
 * const sellRequests = await SellRequest.find({ gameId: someGameId });
 *
 * // Populate user and game data
 * const detailed = await BuyRequest.findById(id)
 *   .populate('userId', 'username email')  // Only get username and email from User
 *   .populate('gameId', 'opponent date');  // Only get opponent and date from Game
 */

export { TicketRequest, BuyRequest, SellRequest };
