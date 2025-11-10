import express from 'express';
import notificationController from '../controllers/notification.controller.js';
import { authenticateAdmin, requirePermission } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  createNotificationValidation,
  notificationIdValidation,
} from '../validators/notification.validators.js';

const router = express.Router();

// Admin authentication gerekli
router.use(authenticateAdmin);

// POST /api/admin/notifications - Bildirim gönderme
router.post('/', requirePermission('notification_management_create'), createNotificationValidation, validate, notificationController.createNotification);

// GET /api/admin/notifications - Tüm bildirimleri listele (admin)
router.get('/', requirePermission('notification_management_view'), notificationController.getAllNotifications);

// DELETE /api/admin/notifications/:id - Bildirimi sil (admin)
router.delete('/:id', requirePermission('notification_management_delete'), notificationIdValidation, validate, notificationController.deleteNotification);

export default router;

