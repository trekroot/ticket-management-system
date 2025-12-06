import User from '../models/User.js';

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
  private: 'username firstName lastName email discordHandle authProvider role createdAt',

  // Public profile - for matched users to see each other
  public: 'firstName discordHandle'
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

// TODO: Implement authentication and authorization middleware for admin routes
/**
 * GET /api/users
 * Get all users (admin only)
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
 *
 * TODO: Protect sensitive fields for non-admins
 *   - Check req.user.role from auth middleware
 *   - If not admin, strip: role, authProvider from req.body
 *   - Admins can update any field
 */
export const updateUser = async (req, res) => {
  try {
    // TODO: Add field protection based on user role
    // if (req.user?.role !== 'admin') {
    //   delete req.body.role;
    //   delete req.body.authProvider;
    // }

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
 * DELETE /api/users/:id
 * Delete an existing user
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted'
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
    const user = await User.findById(req.params.id).select(USER_FIELDS.public);
  
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