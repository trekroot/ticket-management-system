import express from 'express';
import { verifyUserAuthenticated } from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';

const router = express.Router();

/**
 * Notification routes (all require auth)
 * GET    /api/notifications              - Get user's notifications
 * GET    /api/notifications/unread-count - Get unread count for badge
 * PUT    /api/notifications/read-all     - Mark all as read
 * PUT    /api/notifications/:id/read     - Mark single as read
 */

router.use(verifyUserAuthenticated);

router.route('/')
  .get(verifyUserAuthenticated, getNotifications);

router.route('/unread-count')
  .get(verifyUserAuthenticated, getUnreadCount);

router.route('/read-all')
  .put(verifyUserAuthenticated, markAllAsRead);

router.route('/:id/read')
  .put(verifyUserAuthenticated, markAsRead);

export default router;
