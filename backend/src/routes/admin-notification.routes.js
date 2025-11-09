import express from 'express';
import notificationController from '../controllers/notification.controller.js';
import { authenticateAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  createNotificationValidation,
  notificationIdValidation,
} from '../validators/notification.validators.js';

const router = express.Router();

// Admin authentication gerekli
router.use(authenticateAdmin);

// POST /api/admin/notifications - Bildirim gönderme
router.post('/', createNotificationValidation, validate, notificationController.createNotification);

// GET /api/admin/notifications - Tüm bildirimleri listele (admin)
router.get('/', notificationController.getAllNotifications);

// DELETE /api/admin/notifications/:id - Bildirimi sil (admin)
router.delete('/:id', notificationIdValidation, validate, notificationController.deleteNotification);

export default router;

