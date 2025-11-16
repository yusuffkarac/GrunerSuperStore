import notificationService from '../services/notification.service.js';
import realtimeService from '../services/realtime.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import prisma from '../config/prisma.js';

class NotificationController {
  // GET /api/notifications - Kullanıcı veya admin bildirimlerini listele
  getNotifications = asyncHandler(async (req, res) => {
    const { page, limit, unreadOnly } = req.query;

    // User token varsa user bildirimleri
    if (req.user) {
      const result = await notificationService.getUserNotifications(req.user.id, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        unreadOnly: unreadOnly === 'true',
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    }

    // Admin token varsa admin bildirimleri
    if (req.admin) {
      const result = await notificationService.getAdminNotifications(req.admin.id, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        unreadOnly: unreadOnly === 'true',
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    }

    // Token yoksa boş liste
    return res.status(200).json({
      success: true,
      data: {
        notifications: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      },
    });
  });

  // GET /api/notifications/unread-count - Okunmamış sayı
  getUnreadCount = asyncHandler(async (req, res) => {
    // User token varsa user okunmamış sayısı
    if (req.user) {
      const count = await notificationService.getUnreadCount(req.user.id);
      return res.status(200).json({
        success: true,
        data: { count },
      });
    }

    // Admin token varsa admin okunmamış sayısı
    if (req.admin) {
      const count = await notificationService.getAdminUnreadCount(req.admin.id);
      return res.status(200).json({
        success: true,
        data: { count },
      });
    }

    // Token yoksa 0
    return res.status(200).json({
      success: true,
      data: { count: 0 },
    });
  });

  // PUT /api/notifications/:id/read - Bildirimi okundu işaretle
  markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // User token varsa user bildirimi
    if (req.user) {
      const notification = await notificationService.markAsRead(id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Benachrichtigung als gelesen markiert',
        data: { notification },
      });
    }

    // Admin token varsa admin bildirimi
    if (req.admin) {
      const notification = await notificationService.markAdminNotificationAsRead(id, req.admin.id);
      return res.status(200).json({
        success: true,
        message: 'Benachrichtigung als gelesen markiert',
        data: { notification },
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Benachrichtigung nicht gefunden',
    });
  });

  // PUT /api/notifications/read-all - Tümünü okundu işaretle
  markAllAsRead = asyncHandler(async (req, res) => {
    // User token varsa user bildirimleri
    if (req.user) {
      await notificationService.markAllAsRead(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Alle Benachrichtigungen als gelesen markiert',
      });
    }

    // Admin token varsa admin bildirimleri
    if (req.admin) {
      await notificationService.markAllAdminNotificationsAsRead(req.admin.id);
      return res.status(200).json({
        success: true,
        message: 'Alle Benachrichtigungen als gelesen markiert',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alle Benachrichtigungen als gelesen markiert',
    });
  });

  // GET /api/notifications/stream - SSE stream
  getStream = asyncHandler(async (req, res) => {
    // User token varsa user SSE
    if (req.user) {
      realtimeService.addClient(req.user.id, res);
      const unreadCount = await notificationService.getUnreadCount(req.user.id);
      realtimeService.broadcastUnreadCount(req.user.id, unreadCount);
      return;
    }

    // Admin token varsa admin SSE
    if (req.admin) {
      realtimeService.addAdminClient(req.admin.id, res);
      const unreadCount = await notificationService.getAdminUnreadCount(req.admin.id);
      realtimeService.broadcastAdminUnreadCount(req.admin.id, unreadCount);
      return;
    }

    // Token yoksa bağlantıyı kapat
    res.status(200).end();
  });

  // ===============================
  // ADMIN ENDPOINTS
  // ===============================

  // POST /api/admin/notifications - Bildirim gönderme
  createNotification = asyncHandler(async (req, res) => {
    const { userIds, type, title, message, actionUrl, metadata } = req.body;

    // Boş string'leri null'a çevir
    const cleanActionUrl = actionUrl && actionUrl.trim() !== '' ? actionUrl.trim() : null;
    const cleanUserIds = userIds && Array.isArray(userIds) && userIds.length > 0 ? userIds : null;

    let notifications;
    if (cleanUserIds) {
      // Belirli kullanıcılara gönder
      notifications = await notificationService.createBulkNotifications(cleanUserIds, {
        type,
        title,
        message,
        actionUrl: cleanActionUrl,
        metadata,
      });
    } else {
      // Tüm kullanıcılara gönder
      notifications = await notificationService.createBulkNotifications(null, {
        type,
        title,
        message,
        actionUrl: cleanActionUrl,
        metadata,
      });
    }

    res.status(201).json({
      success: true,
      message: `${notifications.length} Benachrichtigung(en) gesendet`,
      data: { notifications },
    });
  });

  // GET /api/admin/notifications - Tüm bildirimleri listele (admin)
  getAllNotifications = asyncHandler(async (req, res) => {
    const { page, limit, userId, type, isRead } = req.query;

    const result = await notificationService.getAllNotifications({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      userId,
      type,
      isRead,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // DELETE /api/admin/notifications/:id - Bildirimi sil (admin)
  deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await notificationService.deleteNotification(id);

    res.status(200).json({
      success: true,
      message: 'Benachrichtigung erfolgreich gelöscht',
    });
  });
}

export default new NotificationController();

