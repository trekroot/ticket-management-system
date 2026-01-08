import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: true, sparse: true }, // Links to Firebase Auth
  wixUserId: { type: String, unique: true, sparse: true }, // Links to Wix Member
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  discordHandle: { type: String },
  authProvider: { type: String, enum: ['google', 'email', 'dirigounion'], default: 'email' },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  termsAccepted: { type: Date, default: null },
  notes: { type: String },
  // Soft delete - deactivated accounts
  deactivated: { type: Boolean, default: false },
  deactivatedAt: { type: Date },
}, {
  timestamps: true,
  collection: 'users',
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      delete ret.notes;
      // NOTE: If adding local auth later, add passwordHash field to schema
      // and delete ret.passwordHash here to prevent exposure
      return ret;
    }
  }
});

export default mongoose.model('User', userSchema);