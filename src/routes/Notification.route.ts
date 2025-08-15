import express from 'express';
import { NotificationController } from '../controllers/Notification.controller';
import { isAuthenticated } from '../middlewares/auth/auth.middleware';

const router = express.Router();


router.use(isAuthenticated);

// Lấy thông báo của user
router.get('/:role/:userId', NotificationController.getUserNotifications);

// Đánh dấu thông báo đã đọc
router.put('/:notificationId/read', NotificationController.markAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.put('/read-all', NotificationController.markAllAsRead);

// Lấy số thông báo chưa đọc
router.get('/:role/:userId/unread-count', NotificationController.getUnreadCount);

// Xóa thông báo
router.delete('/:notificationId', NotificationController.deleteNotification);

export default router;
