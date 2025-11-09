import notificationService from '../services/notification.service.js';
import realtimeService from '../services/realtime.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class NotificationController {
  // GET /api/notifications - Kullanıcı bildirimlerini listele
  getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page, limit, unreadOnly } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      unreadOnly: unreadOnly === 'true',
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/notifications/unread-count - Okunmamış sayı
  getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  });

  // PUT /api/notifications/:id/read - Bildirimi okundu işaretle
  markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await notificationService.markAsRead(id, userId);

    res.status(200).json({
      success: true,
      message: 'Benachrichtigung als gelesen markiert',
      data: { notification },
    });
  });

  // PUT /api/notifications/read-all - Tümünü okundu işaretle
  markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'Alle Benachrichtigungen als gelesen markiert',
    });
  });

  // GET /api/notifications/stream - SSE stream
  getStream = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // SSE bağlantısı ekle
    realtimeService.addClient(userId, res);

    // İlk okunmamış sayıyı gönder
    const unreadCount = await notificationService.getUnreadCount(userId);
    realtimeService.broadcastUnreadCount(userId, unreadCount);

    // Bağlantı kapandığında temizleme zaten realtimeService'de yapılıyor
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

