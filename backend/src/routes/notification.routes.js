import express from 'express';
import notificationController from '../controllers/notification.controller.js';
import { authenticate, authenticateSSE, authenticateFlexible } from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  createNotificationValidation,
  notificationIdValidation,
} from '../validators/notification.validators.js';

const router = express.Router();

// ===============================
// KULLANICI ENDPOINTS
// ===============================

// GET /api/notifications/stream - SSE stream (özel auth - admin token destekli)
router.get('/stream', authenticateFlexible, notificationController.getStream);

// Diğer route'lar authentication gerektirir (admin token destekli)
router.use(authenticateFlexible);

// GET /api/notifications - Kullanıcı bildirimlerini listele
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread-count - Okunmamış sayı
router.get('/unread-count', notificationController.getUnreadCount);

// PUT /api/notifications/:id/read - Bildirimi okundu işaretle
router.put('/:id/read', notificationIdValidation, validate, notificationController.markAsRead);

// PUT /api/notifications/read-all - Tümünü okundu işaretle
router.put('/read-all', notificationController.markAllAsRead);

export default router;

