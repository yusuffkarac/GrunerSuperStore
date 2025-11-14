import prisma from '../config/prisma.js';

/**
 * User agent'dan device type tespiti
 */
function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();
  
  // Mobile cihazlar
  const mobilePatterns = [
    /android/i,
    /webos/i,
    /iphone/i,
    /ipad/i,
    /ipod/i,
    /blackberry/i,
    /windows phone/i,
    /mobile/i,
  ];

  if (mobilePatterns.some(pattern => pattern.test(ua))) {
    return 'mobile';
  }

  // Desktop cihazlar
  const desktopPatterns = [
    /windows/i,
    /macintosh/i,
    /linux/i,
    /x11/i,
  ];

  if (desktopPatterns.some(pattern => pattern.test(ua))) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * IP adresini request'ten al
 */
function getIpAddress(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    null
  );
}

/**
 * Log kaydetme fonksiyonu - Retry mekanizması ile
 */
async function createLog({
  userId = null,
  adminId = null,
  action,
  entityType = null,
  entityId = null,
  level = 'info',
  message,
  metadata = null,
  req = null,
}) {
  const maxRetries = 3;
  const retryDelay = 100; // ms
  
  // IP adresi ve user agent'ı req'den al
  const ipAddress = req ? getIpAddress(req) : null;
  const userAgent = req?.headers['user-agent'] || null;
  const deviceType = detectDeviceType(userAgent);

  const logData = {
    userId,
    adminId,
    action,
    entityType,
    entityId,
    level,
    message,
    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    ipAddress,
    userAgent,
    deviceType,
  };

  // Retry mekanizması - hızlı ardışık isteklerde connection pool sorunlarını çözmek için
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const log = await prisma.activityLog.create({
        data: logData,
      });

      return log;
    } catch (error) {
      // Son deneme ise veya retry edilemeyecek bir hata ise
      if (attempt === maxRetries || 
          error.code === 'P2002' || // Unique constraint violation - retry etme
          error.code === 'P2025') { // Record not found - retry etme
        console.error('❌ Fehler beim Erstellen des Aktivitätsprotokolls:', {
          action,
          userId,
          adminId,
          entityType,
          entityId,
          attempt,
          error: error.message || error,
          errorCode: error.code,
        });
        return null;
      }

      // Retry için bekle (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return null;
}

/**
 * Log listesi - filtreleme ve pagination
 */
async function getLogs({
  page = 1,
  limit = 50,
  userId = null,
  adminId = null,
  action = null,
  entityType = null,
  level = null,
  startDate = null,
  endDate = null,
  searchEmail = null,
  searchIp = null,
  userType = null, // 'customer' veya 'admin'
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) {
  const skip = (page - 1) * limit;

  // Where koşulları
  const where = {};

  if (userId) {
    where.userId = userId;
  }

  if (adminId) {
    where.adminId = adminId;
  }

  // userType filtrelemesi
  if (userType === 'customer') {
    where.userId = { not: null };
    where.adminId = null;
  } else if (userType === 'admin') {
    where.adminId = { not: null };
    where.userId = null;
  }

  // Eğer userId ve adminId yoksa, searchEmail ile arama yap
  if (!userId && !adminId && searchEmail) {
    where.OR = [
      { user: { email: { contains: searchEmail, mode: 'insensitive' } } },
      { admin: { email: { contains: searchEmail, mode: 'insensitive' } } },
    ];
  }

  if (action) {
    where.action = action;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (level) {
    where.level = level;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  if (searchIp) {
    where.ipAddress = { contains: searchIp, mode: 'insensitive' };
  }

  // Sıralama
  const orderBy = {};
  orderBy[sortBy] = sortOrder;

  // Logları getir
  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
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
        admin: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Log detayı
 */
async function getLogById(id) {
  return await prisma.activityLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      admin: {
        select: {
          id: true,
          firstName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Log istatistikleri
 */
async function getLogStats({ startDate = null, endDate = null } = {}) {
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) {
      dateFilter.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.createdAt.lte = new Date(endDate);
    }
  }

  // Seviye dağılımı
  const levelStats = await prisma.activityLog.groupBy({
    by: ['level'],
    where: dateFilter,
    _count: {
      id: true,
    },
  });

  // Günlük log sayısı (son 30 gün)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyStats = await prisma.activityLog.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    _count: {
      id: true,
    },
  });

  // Toplam log sayısı
  const totalLogs = await prisma.activityLog.count({
    where: dateFilter,
  });

  // Müşteri vs Admin işlemleri
  const userTypeStats = await prisma.activityLog.groupBy({
    by: ['userId', 'adminId'],
    where: dateFilter,
    _count: {
      id: true,
    },
  });

  let customerLogs = 0;
  let adminLogs = 0;

  userTypeStats.forEach((stat) => {
    if (stat.userId) {
      customerLogs += stat._count.id;
    }
    if (stat.adminId) {
      adminLogs += stat._count.id;
    }
  });

  return {
    totalLogs,
    levelStats: levelStats.map((stat) => ({
      level: stat.level,
      count: stat._count.id,
    })),
    dailyStats: dailyStats.map((stat) => ({
      date: stat.createdAt,
      count: stat._count.id,
    })),
    userTypeStats: {
      customer: customerLogs,
      admin: adminLogs,
    },
  };
}

/**
 * 20 günden eski logları temizle
 */
async function cleanOldLogs() {
  const twentyDaysAgo = new Date();
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

  const result = await prisma.activityLog.deleteMany({
    where: {
      createdAt: {
        lt: twentyDaysAgo,
      },
    },
  });

  return {
    deletedCount: result.count,
    deletedBefore: twentyDaysAgo,
  };
}

export default {
  createLog,
  getLogs,
  getLogById,
  getLogStats,
  cleanOldLogs,
  detectDeviceType,
  getIpAddress,
};

