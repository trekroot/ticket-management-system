import Feedback from '../models/Feedback.js';
import { appConfig } from '../config/app.js';

/**
 * POST /api/feedback
 * Create a new feedback submission
 *
 * Body: {
 *   type, email, subject, message, frontendVersion, backendVersion
 * }
 * Note: userId comes from authenticated user (req.user), not request body
 */
export const createFeedback = async (req, res) => {
    try {
        // Use authenticated user's ID and snapshot their info for audit trail
        req.body.backendVersion = appConfig.backendVersion;
        const feedbackSubmission = await Feedback.create({
            ...req.body,
            userId: req.user._id,
            userSnapshot: {
                username: req.user.username,
                firstName: req.user.firstName,
                lastName: req.user.lastName
            }
        });

        await feedbackSubmission.populate('userId', 'username firstName lastName');

        res.status(201).json({
            success: true,
            data: feedbackSubmission
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                error: messages
            });
        }
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

