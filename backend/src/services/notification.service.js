import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import realtimeService from './realtime.service.js';

class NotificationService {
  /**
   * Tekil bildirim oluştur
   */
  async createNotification(userId, notificationData) {
    const { type, title, message, actionUrl, metadata } = notificationData;

    if (!title || !message) {
      throw new ValidationError('Title und Message sind erforderlich');
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type || 'info',
        title,
        message,
        actionUrl: actionUrl || null,
        metadata: metadata || null,
      },
    });

    // Real-time bildirim gönder
    realtimeService.broadcastNotification(userId, notification);

    return notification;
  }

  /**
   * Toplu bildirim oluştur
   * @param {Array<string>|null} userIds - null ise tüm aktif kullanıcılar
   */
  async createBulkNotifications(userIds, notificationData) {
    const { type, title, message, actionUrl, metadata } = notificationData;

    if (!title || !message) {
      throw new ValidationError('Title und Message sind erforderlich');
    }

    // Hedef kullanıcıları belirle
    let targetUserIds = userIds;
    if (!targetUserIds || targetUserIds.length === 0) {
      // Tüm aktif kullanıcıları al
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      throw new ValidationError('Keine Benutzer gefunden');
    }

    // Toplu bildirim oluştur - createMany kullanarak daha verimli
    const notificationType = type || 'info';
    const now = new Date();

    // createMany kullanarak toplu insert
    await prisma.notification.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        type: notificationType,
        title,
        message,
        actionUrl: actionUrl || null,
        metadata: metadata || null,
        createdAt: now,
        updatedAt: now,
      })),
    });

    // Oluşturulan bildirimleri getir (real-time gönderim için)
    const notifications = await prisma.notification.findMany({
      where: {
        userId: { in: targetUserIds },
        title,
        message,
        createdAt: {
          gte: new Date(now.getTime() - 1000), // 1 saniye içinde oluşturulanlar
        },
      },
      orderBy: { createdAt: 'desc' },
      take: targetUserIds.length,
    });

    // Her kullanıcıya real-time bildirim gönder (asenkron, await etme)
    notifications.forEach((notification) => {
      try {
        realtimeService.broadcastNotification(notification.userId, notification);
      } catch (error) {
        // Real-time gönderim hatası kritik değil, log at
        console.error(`Real-time bildirim gönderilemedi (userId=${notification.userId}):`, error.message);
      }
    });

    return notifications;
  }

  /**
   * Kullanıcı bildirimlerini getir (pagination)
   */
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Bildirimi okundu işaretle
   */
  async markAsRead(notificationId, userId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundError('Benachrichtigung nicht gefunden');
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Okunmamış sayıyı güncellemek için real-time bildirim gönder
    const unreadCount = await this.getUnreadCount(userId);
    realtimeService.broadcastUnreadCount(userId, unreadCount);

    return updated;
  }

  /**
   * Tüm bildirimleri okundu işaretle
   */
  async markAllAsRead(userId) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Okunmamış sayıyı güncellemek için real-time bildirim gönder
    const unreadCount = await this.getUnreadCount(userId);
    realtimeService.broadcastUnreadCount(userId, unreadCount);

    return result;
  }

  /**
   * Okunmamış bildirim sayısı
   */
  async getUnreadCount(userId) {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * 30 günden eski bildirimleri sil
   */
  async deleteOldNotifications() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    return result;
  }

  /**
   * Admin: Tüm bildirimleri listele
   */
  async getAllNotifications(options = {}) {
    const { page = 1, limit = 50, userId, type, isRead } = options;
    const skip = (page - 1) * limit;

    const where = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead === 'true' || isRead === true;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Bildirimi sil
   */
  async deleteNotification(notificationId) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Benachrichtigung nicht gefunden');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }
}

export default new NotificationService();

