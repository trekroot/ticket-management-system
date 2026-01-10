import User from '../models/User.js';

/**
 * CONTROLLER: adminAuthController
 *
 * Handles admin-specific authentication flows.
 * Used to verify admin status before allowing Firebase login.
 */

/**
 * POST /api/admin/auth/verify-email
 * Verify if an email belongs to an admin user.
 *
 * Security: Returns same response for "not found" and "not admin"
 * to prevent user enumeration.
 */
export const verifyAdminEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        allowed: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Check if user exists AND is an admin
    if (user && user.role === 'admin') {
      return res.json({
        allowed: true
      });
    }

    // Generic response for both "not found" and "not admin"
    return res.json({
      allowed: false
    });
  } catch (error) {
    console.error('Admin email verification failed:', error.message);
    return res.status(500).json({
      allowed: false,
      error: 'Verification failed'
    });
  }
};
