import { createHmac } from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * CONTROLLER: wixAuthController
 *
 * Handles authentication for users coming from Wix iFrame.
 * Verifies HMAC signature from Wix, finds/creates user, returns JWT.
 */

const WIX_SHARED_SECRET = process.env.WIX_SHARED_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes for HMAC timestamp
const JWT_EXPIRES_IN = '7d';

/**
 * Verify HMAC signature from Wix
 */
function verifySignature(payload, timestamp, signature) {
  const expectedSignature = createHmac('sha256', WIX_SHARED_SECRET)
    .update(`${JSON.stringify(payload)}:${timestamp}`)
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * POST /api/auth/wix
 * Authenticate a Wix member and return a JWT
 *
 * Body: { payload, timestamp, signature }
 * - payload: { id, loginEmail, firstName, lastName }
 * - timestamp: Unix timestamp (ms) when token was generated
 * - signature: HMAC-SHA256 signature
 */
export const authenticateWixMember = async (req, res) => {
  try {
    const { payload, timestamp, signature } = req.body;

    // Validate request body
    if (!payload || !timestamp || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: payload, timestamp, signature'
      });
    }

    // Check secrets are configured
    if (!WIX_SHARED_SECRET || !JWT_SECRET) {
      console.error('WIX_SHARED_SECRET or JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    // Verify timestamp freshness (prevent replay attacks)
    const age = Date.now() - timestamp;
    if (age > TOKEN_MAX_AGE_MS || age < 0) {
      return res.status(401).json({
        success: false,
        error: 'Token expired or invalid timestamp'
      });
    }

    // Verify HMAC signature
    if (!verifySignature(payload, timestamp, signature)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    const { id: wixMemberId, loginEmail, firstName, lastName } = payload;

    // Find existing user by Wix member ID or email
    let user = await User.findOne({
      $or: [
        { wixMemberId },
        { email: loginEmail }
      ]
    });

    if (user) {
      // Link Wix ID if not already linked
      if (!user.wixMemberId) {
        user.wixMemberId = wixMemberId;
        user.authProvider = 'dirigounion';
        await user.save();
      }
    } else {
      // Create new user from Wix member data
      // Generate username from email (before @)
      const baseUsername = loginEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      let username = baseUsername;
      let counter = 1;

      // Ensure unique username
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter++}`;
      }

      user = await User.create({
        wixMemberId,
        email: loginEmail,
        firstName: firstName || 'Member',
        lastName: lastName || '',
        username,
        authProvider: 'dirigounion'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        authProvider: 'dirigounion'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        termsAccepted: user.termsAccepted
      }
    });
  } catch (error) {
    console.error('Wix auth error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
