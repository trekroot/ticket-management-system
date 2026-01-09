import jwt from 'jsonwebtoken';
import admin from '../config/firebase.js';
import User from '../models/User.js';

/**
 * Middleware to verify authentication tokens.
 *
 * Supports two auth methods:
 * 1. JWT (for Wix/iFrame users) - verified locally
 * 2. Firebase ID tokens (for admin/standalone users) - verified with Firebase
 *
 * Client sends token in Authorization header: "Bearer <token>"
 * If valid, req.user contains the MongoDB user document.
 */

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Try to verify token as our JWT first, then fall back to Firebase
 */
async function verifyToken(token) {
  // Try JWT first (cheaper - no network call)
  if (JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        return { user, provider: 'jwt' };
      }
    } catch {
      // Not a valid JWT, try Firebase
    }
  }

  // Fall back to Firebase
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (user) {
      return { user, provider: 'firebase' };
    }
  } catch {
    // Not a valid Firebase token either
  }

  return null;
}

/**
 * Main auth middleware - requires valid token
 */
export async function verifyFirebaseToken(req, res, next) {
  // Dev bypass - skip auth and use a test user
  if (process.env.NODE_ENV === 'dev' && process.env.BYPASS_AUTH === 'true') {
    const testUser = await User.findById(process.env.BYPASS_AUTH_USER_ID);
    if (testUser) {
      req.user = testUser;
      return next();
    }
    return res.status(500).json({ error: 'BYPASS_AUTH enabled but test user not found' });
  }

  const authHeader = req.headers.authorization;

  // Check if Auth header exists and format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Extract token
  const token = authHeader.split(' ')[1];

  try {
    const result = await verifyToken(token);

    if (!result) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    // Attach full MongoDB user to request (has _id, role, etc.)
    req.user = result.user;
    req.authProvider = result.provider;

    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Light middleware - verifies Firebase token only, doesn't require DB user.
 * Use for endpoints like /verifyAccount where we need to check if user exists.
 */
export async function verifyFirebaseTokenOnly(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;  // Firebase data only, not MongoDB user
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth - populates req.user if valid token, otherwise continues
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Extract token
  const token = authHeader.split(' ')[1];

  try {
    const result = await verifyToken(token);
    if (result) {
      req.user = result.user;
      req.authProvider = result.provider;
    }
  } catch (error) {
    console.error('Token verification failed, proceed with empty user', error.message);
  }
  next();
}
