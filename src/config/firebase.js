import admin from 'firebase-admin';
import { createRequire } from 'module';

// TODO: Add support for qa vs PROD

const require = createRequire(import.meta.url);

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
