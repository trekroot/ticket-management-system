import { TicketRequest } from '../models/TicketRequest.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { logAdminAction } from '../services/adminAuditService.js';

/**
 * CONTROLLER: userController
 *
 * Handles user-related operations such as registration, login, and profile management.
 * Users can buy and sell tickets for games.
 *
 * Note: passwordHash and __v are always stripped by schema's toJSON transform
 */

/**
 * Field projections for different contexts
 * Use with .select() to control what fields are returned
 */
const USER_FIELDS = {
  // Full profile - for user viewing their own account
  private: 'username firstName lastName email discordHandle authProvider role createdAt termsAccepted',

  // Public profile - for matched users to see each other
  public: 'firstName lastName discordHandle'
};

/**
 * GET /api/users/:id
 * Get a single user by their MongoDB ObjectId
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(USER_FIELDS.private);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/users/firebase/:firebaseUid
 * Get a single user by their MongoDB ObjectId
 */
export const getUserByFirebaseId = async (req, res) => {
  try {
    const user = await User.findOne({firebaseUid: req.params.firebaseUid}).select(USER_FIELDS.private);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Firebase ID User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user Firebase ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// TODO: Implement authentication and authorization middleware for admin routes
/**
 * GET /api/users
 * Get all users (admin only, see router)
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/users
 * Create a new user
 *
 * Note: In production, password should be hashed before storing.
 * This will likely be handled by auth middleware/service.
 */
export const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    // Handle duplicate key error (username or email already exists)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * PUT /api/users/:id
 * Update an existing user
 */
export const updateUser = async (req, res) => {
  try {
    if (req.body?.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'User is not authorized to make this change.'
      });
    }

    // Get user before update for audit logging
    const userBefore = await User.findById(req.params.id);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Log if admin updated someone else's account
    if (userBefore) {
      const isOwner = req.user._id.toString() === req.params.id;

      if (req.user.role === 'admin' && !isOwner) {
        await logAdminAction({
          adminId: req.user._id,
          action: 'update_user',
          targetType: 'User',
          targetId: req.params.id,
          affectedUserIds: [req.params.id],
          changes: {
            before: userBefore.toObject(),
            after: user.toObject()
          },
          notes: req.body.adminNotes
        });
      }
    }

    // Cascade snapshot updates to user's non-completed tickets (best effort)
    // This keeps active ticket info in sync with current profile
    try {
      const snapshotFields = ['discordHandle', 'username', 'firstName', 'lastName'];
      const hasSnapshotChanges = snapshotFields.some(
        field => req.body[field] !== undefined && req.body[field] !== userBefore?.[field]
      );

      if (hasSnapshotChanges) {
        const newSnapshot = {
          discordHandle: user.discordHandle,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        };

        // Update userSnapshot on user's own active tickets
        await TicketRequest.updateMany(
          { userId: req.params.id, status: { $in: ['open', 'matched'] } },
          { userSnapshot: newSnapshot }
        );

        // Update counterpartySnapshot on matched tickets where this user is the counterparty
        // Only for accepted matches (counterpartySnapshot is set at acceptance)
        const userTickets = await TicketRequest.find({ userId: req.params.id }).select('_id');
        const userTicketIds = userTickets.map(t => t._id);

        // Find accepted matches involving this user's tickets
        const activeMatches = await Match.find({
          status: 'accepted',
          $or: [
            { initiatorTicketId: { $in: userTicketIds } },
            { matchedTicketId: { $in: userTicketIds } }
          ]
        });

        // For each match, update counterpartySnapshot on the OTHER ticket
        const counterpartySnapshot = {
          ...newSnapshot,
          email: user.email
        };

        await Promise.all(activeMatches.map(match => {
          const isInitiator = userTicketIds.some(id => id.equals(match.initiatorTicketId));
          const otherTicketId = isInitiator ? match.matchedTicketId : match.initiatorTicketId;

          return TicketRequest.findByIdAndUpdate(otherTicketId, {
            counterpartySnapshot
          });
        }));
      }
    } catch (cascadeError) {
      console.error('Failed to cascade snapshot updates:', cascadeError.message);
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * PUT /api/users/:id/deactivate
 * Soft delete - deactivate user and cancel their open tickets
 */
export const deactivateUser = async (req, res) => {
  try {
    // Get user before for audit logging
    const userBefore = await User.findById(req.params.id);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        deactivated: true,
        deactivatedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Cancel all open and matched ticket requests for this user
    // (completed tickets are historical records, keep them)
    const ticketResult = await TicketRequest.updateMany(
      { userId: req.params.id, status: { $in: ['open', 'matched'] } },
      { status: 'deactivated' }
    );

    // Log if admin deactivated someone else's account
    if (userBefore) {
      const isOwner = req.user._id.toString() === req.params.id;

      if (req.user.role === 'admin' && !isOwner) {
        await logAdminAction({
          adminId: req.user._id,
          action: 'deactivate_user',
          targetType: 'User',
          targetId: req.params.id,
          affectedUserIds: [req.params.id],
          changes: {
            before: { deactivated: userBefore.deactivated },
            after: { deactivated: true, ticketsCancelled: ticketResult.modifiedCount }
          },
          notes: req.body.adminNotes
        });
      }
    }

    res.json({
      success: true,
      message: 'User deactivated',
      ticketsCancelled: ticketResult.modifiedCount
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE /api/users/:id
 * HARD Delete - permanently remove user and their ticket requests
 * Use for GDPR/privacy compliance when user requests full deletion
 */
export const deleteUser = async (req, res) => {
  try {
    // Get user before delete for audit logging
    const userBefore = await User.findById(req.params.id);

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Cancel all open and matched ticket requests for this user
    const ticketResult = await TicketRequest.updateMany(
      { userId: req.params.id, status: { $in: ['open', 'matched'] } },
      { status: 'deactivated' }
    );

    // Log if admin deleted someone else's account
    if (userBefore) {
      const isOwner = req.user._id.toString() === req.params.id;

      if (req.user.role === 'admin' && !isOwner) {
        await logAdminAction({
          adminId: req.user._id,
          action: 'delete_user',
          targetType: 'User',
          targetId: req.params.id,
          affectedUserIds: [req.params.id],
          changes: {
            before: userBefore.toObject(),
            after: null
          },
          notes: req.body.adminNotes
        });
      }
    }

    res.json({
      success: true,
      message: 'User permanently deleted',
      ticketsDeleted: ticketResult.modifiedCount
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/users/:id/public
 * Get a user's profile for public use by other users
 */
export const getUserPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(USER_FIELDS.public).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.lastName = user.lastName?.charAt(0) || '';

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


/**
 * GET /api/users/verifyAccount/:firebaseUid
 * Check if a user has a valid account
 */
export const verifyUserExists = async (req, res) => {
  try {
    const user = await User.findOne({firebaseUid: req.params.firebaseUid});

    if (!user) {
      // Return 200 so frontend can handle registration flow without error
      return res.json({
        success: true,
        exists: false
      });
    }

    res.json({
      success: true,
      exists: true,
      user
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        exists: false,
        error: 'Invalid user ID format'
      });
    }

    res.status(500).json({
      success: false,
      exists: false,
      error: error.message
    });
  }
};

/**
 * POST /api/users/:id/accept-tos
 * Record user acceptance of Terms of Service
 */
export const acceptTermsOfService = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { termsAccepted: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};