import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// TODO: Add support for qa vs PROD

const require = createRequire(import.meta.url);

// HOLD IN CASE NEEDED 
// const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

// Resolve path relative to project root (not this file's location)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.resolve(__dirname, '../../', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
