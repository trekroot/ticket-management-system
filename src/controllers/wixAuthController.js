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
  // Must match Wix format: timestamp + JSON.stringify(payload)
  const message = timestamp + JSON.stringify(payload);
  const expectedSignature = createHmac('sha256', WIX_SHARED_SECRET)
    .update(message)
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
export const authenticateWixUser = async (req, res) => {
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
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    // Verify timestamp freshness (prevent replay attacks)
    const age = Date.now() - (timestamp * 1000);
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
    console.log(payload);
    const { wixUserId, email, firstName, lastName, username } = payload;

    // Find existing user by Wix member ID or email
    let user = await User.findOne({
      $or: [
        ...(wixUserId ? [{ wixUserId }] : []),
        { email }
      ]
    });

    if (user) {
      // Link Wix ID if not already linked (don't overwrite authProvider)
      if (!user.wixUserId) {
        user.wixUserId = wixUserId;
        user.notes = `${user.notes || ''}[${new Date().toISOString()}] Linked wixUserId via cross-login\n`
        await user.save();
      }
    } else {
      console.log(`Create new user from WiX, email: ${email}`)
      user = await User.create({
        wixUserId: wixUserId,
        email: email,
        firstName: firstName || 'Update Name - Acct from DU Site',
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

    // Return user without firebaseUid
    const userResponse = user.toObject();
    delete userResponse.firebaseUid;

    res.json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('WiX auth error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
