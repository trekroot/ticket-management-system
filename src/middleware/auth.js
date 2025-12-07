import admin from '../config/firebase.js';
import User from '../models/User.js';

/**
 * Middleware to verify Firebase ID tokens.
 * 
 * How it works:
 * 1. Client logs in via Firebase (browser/mobile)
 * 2. Client gets an ID token from Firebase
 * 3. Client sends token in Authorization header: "Bearer <token>"
 * 4. This middleware verifies the token with Firebase
 * 5. If valid, req.user contains the decoded token (uid, email, 
 etc.)
*/

export async function verifyFirebaseToken(req, res, next) {
  // Dev bypass - skip Firebase auth and use a test user
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
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
    // Firebase verify: signature, expiry, and project
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Look up the MongoDB user by their Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    // Attach full MongoDB user to request (has _id, role, etc.)
    req.user = user;

    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
