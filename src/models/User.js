import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  discordHandle: { type: String },
  authProvider: { type: String, enum: ['google', 'email', 'dirigounion'], default: 'email' },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true, collection: 'users' });

export default mongoose.model('User', userSchema);