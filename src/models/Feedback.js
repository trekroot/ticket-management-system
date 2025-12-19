import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    // UserId and Snapshot of user info at time of creation (preserved if user is deleted)
    
    userSnapshot: {
    username: String,
    firstName: String,
    lastName: String
  },
}, { timestamps: true, collection: 'feedback' });

feedbackSchema.index({ date: 1 });

export default mongoose.model('Feedback', feedbackSchema);