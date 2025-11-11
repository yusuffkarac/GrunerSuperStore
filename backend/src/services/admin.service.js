import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/errors.js';

class AdminService {
  // Admin girişi
  async login({ email, password }) {
    // Email'i lowercase'e çevir (+ karakterini korumak için normalizeEmail kullanmıyoruz)
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('🔐 [Admin Service] Login attempt for:', normalizedEmail);

    // Admin'i bul (role ve permissions ile birlikte)
    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
      include: {
        adminRole: {
          include: {
            permissions: {
              include: {
                permission: {
                  select: {
                    id: true,
                    name: true,
                    displayName: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!admin) {
      console.error('❌ [Admin Service] Admin bulunamadı:', normalizedEmail);
      throw new UnauthorizedError('Ungültige Anmeldedaten');
    }

    console.log('✅ [Admin Service] Admin bulundu:', admin.id);

    // Şifre kontrolü
    const isPasswordValid = await comparePassword(password, admin.passwordHash);

    if (!isPasswordValid) {
      console.error('❌ [Admin Service] Şifre yanlış');
      throw new UnauthorizedError('Ungültige Anmeldedaten');
    }

    console.log('✅ [Admin Service] Şifre doğru');

    // İzinleri düz array'e dönüştür
    const permissions = admin.adminRole?.permissions?.map(rp => rp.permission) || [];

    // Admin token oluştur (type: 'admin' ile)
    const token = generateToken({
      adminId: admin.id,
      type: 'admin',
      role: admin.role,
    });

    console.log('✅ [Admin Service] Token oluşturuldu:', token.substring(0, 20) + '...');

    // Admin bilgilerini döndür (passwordHash olmadan, permissions ile)
    const { passwordHash, ...adminWithoutPassword } = admin;
    const adminData = {
      ...adminWithoutPassword,
      permissions,
    };

    console.log('✅ [Admin Service] Response hazırlandı:', { admin: adminData.email, token: 'generated', permissionsCount: permissions.length });

    return { admin: adminData, token };
  }

  // Admin bilgilerini getir (token'dan)
  async getMe(adminId) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        adminRole: {
          include: {
            permissions: {
              include: {
                permission: {
                  select: {
                    id: true,
                    name: true,
                    displayName: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundError('Administrator nicht gefunden');
    }

    // İzinleri düz array'e dönüştür
    const permissions = admin.adminRole?.permissions?.map(rp => rp.permission) || [];

    return {
      id: admin.id,
      firstName: admin.firstName,
      email: admin.email,
      role: admin.role,
      roleId: admin.roleId,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      adminRole: admin.adminRole,
      permissions,
    };
  }

  // Dashboard istatistikleri
  async getDashboardStats() {
    const [
      totalUsers,
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      totalRevenue,
      todayOrders,
      recentOrders,
    ] = await Promise.all([
      // Toplam kullanıcı sayısı
      prisma.user.count(),

      // Toplam sipariş sayısı
      prisma.order.count(),

      // Bekleyen siparişler
      prisma.order.count({ where: { status: 'pending' } }),

      // Toplam ürün sayısı
      prisma.product.count({ where: { isActive: true } }),

      // Düşük stoklu ürünler
      prisma.$queryRaw`
        SELECT COUNT(*)::int
        FROM products
        WHERE is_active = true
        AND stock <= COALESCE(low_stock_level, 0)
        AND low_stock_level IS NOT NULL
      `.then((result) => result[0]?.count || 0),

      // Toplam gelir (iptal edilmemiş siparişler)
      prisma.order.aggregate({
        where: { status: { not: 'cancelled' } },
        _sum: { total: true },
      }),

      // Bugünkü siparişler
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Son siparişler
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
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
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      totalRevenue: totalRevenue._sum.total || 0,
      todayOrders,
      recentOrders,
    };
  }

  // Son siparişleri getir
  async getRecentOrders(limit = 10) {
    return await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            productName: true,
            quantity: true,
          },
        },
      },
    });
  }

  // Düşük stoklu ürünleri getir
  async getLowStockProducts(limit = 20) {
    // Limit'i integer'a çevir
    const limitInt = parseInt(limit) || 20;

    // Prisma'da bir alanı başka bir alanla karşılaştırmak için raw SQL kullanıyoruz
    const products = await prisma.$queryRaw`
      SELECT
        p.id,
        p.name,
        p.stock,
        p.low_stock_level as "lowStockLevel",
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      AND p.stock <= COALESCE(p.low_stock_level, 0)
      AND p.low_stock_level IS NOT NULL
      ORDER BY p.stock ASC
      LIMIT ${limitInt}
    `;

    // Sonuçları Prisma formatına çevir
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      stock: Number(product.stock),
      lowStockLevel: product.lowStockLevel ? Number(product.lowStockLevel) : null,
      category: product.category_name
        ? {
            name: product.category_name,
          }
        : null,
    }));
  }

  // Dashboard trend verileri
  async getDashboardTrends(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Günlük sipariş ve gelir verilerini al
    const trends = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0)::decimal as revenue
      FROM orders
      WHERE created_at >= ${start}
      AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;

    return trends.map((trend) => ({
      date: trend.date.toISOString().split('T')[0],
      orders: Number(trend.orders),
      revenue: Number(trend.revenue),
    }));
  }

  // En çok satan ürünler
  async getTopSellingProducts(limit = 10, startDate, endDate) {
    const limitInt = parseInt(limit) || 10;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const topProducts = await prisma.$queryRaw`
      SELECT
        oi.product_id as "productId",
        oi.product_name as "productName",
        c.name as "categoryName",
        SUM(oi.quantity)::int as "salesCount",
        COALESCE(SUM(oi.price * oi.quantity), 0)::decimal as revenue
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.created_at >= ${start}
      AND o.created_at <= ${end}
      AND o.status != 'cancelled'
      GROUP BY oi.product_id, oi.product_name, c.name
      ORDER BY "salesCount" DESC
      LIMIT ${limitInt}
    `;

    return topProducts.map((product) => ({
      productId: product.productId,
      productName: product.productName,
      categoryName: product.categoryName || '-',
      salesCount: Number(product.salesCount),
      revenue: Number(product.revenue),
    }));
  }

  // Kategori bazlı istatistikler
  async getCategoryStats(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const categoryStats = await prisma.$queryRaw`
      SELECT
        c.id as "categoryId",
        c.name as "categoryName",
        COUNT(DISTINCT o.id)::int as "orderCount",
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)::decimal as "totalRevenue"
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= ${start} AND o.created_at <= ${end}
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      HAVING COUNT(DISTINCT o.id) > 0
      ORDER BY "totalRevenue" DESC
    `;

    return categoryStats.map((stat) => ({
      categoryId: stat.categoryId,
      categoryName: stat.categoryName,
      orderCount: Number(stat.orderCount),
      totalRevenue: Number(stat.totalRevenue),
      averageOrderValue: stat.orderCount > 0 ? Number(stat.totalRevenue) / Number(stat.orderCount) : 0,
    }));
  }

  // Sipariş durumu dağılımı
  async getOrderStatusDistribution() {
    const distribution = await prisma.$queryRaw`
      SELECT
        status,
        COUNT(*)::int as count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `;

    return distribution.map((item) => ({
      status: item.status,
      count: Number(item.count),
    }));
  }

  // Detaylı gelir istatistikleri
  async getRevenueStats(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Önceki dönem için tarih aralığı hesapla
    const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - periodDays);
    const previousEnd = new Date(start);

    const [currentPeriod, previousPeriod, totalOrders] = await Promise.all([
      // Mevcut dönem
      prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          status: { not: 'cancelled' },
        },
        _sum: { total: true },
        _count: { id: true },
        _avg: { total: true },
      }),
      // Önceki dönem
      prisma.order.aggregate({
        where: {
          createdAt: { gte: previousStart, lt: previousEnd },
          status: { not: 'cancelled' },
        },
        _sum: { total: true },
        _count: { id: true },
        _avg: { total: true },
      }),
      // Toplam sipariş sayısı
      prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          status: { not: 'cancelled' },
        },
      }),
    ]);

    const currentRevenue = Number(currentPeriod._sum.total || 0);
    const previousRevenue = Number(previousPeriod._sum.total || 0);
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return {
      totalRevenue: currentRevenue,
      averageOrderValue: Number(currentPeriod._avg.total || 0),
      totalOrders,
      previousPeriodRevenue: previousRevenue,
      revenueChange: Number(revenueChange.toFixed(2)),
    };
  }

  // Günlük sipariş sayısı (son 7 gün)
  async getDailyOrderCounts(days = 7) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const dailyCounts = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as count
      FROM orders
      WHERE created_at >= ${start}
      AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;

    return dailyCounts.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      count: Number(item.count),
    }));
  }

  // Saatlik sipariş dağılımı
  async getHourlyOrderDistribution(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const hourlyDistribution = await prisma.$queryRaw`
      SELECT
        EXTRACT(HOUR FROM created_at)::int as hour,
        COUNT(*)::int as count
      FROM orders
      WHERE created_at >= ${start}
      AND created_at <= ${end}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `;

    return hourlyDistribution.map((item) => ({
      hour: Number(item.hour),
      count: Number(item.count),
    }));
  }

  // Müşteri büyümesi trendi
  async getCustomerGrowthTrend(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const growthTrend = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as "newCustomers"
      FROM users
      WHERE created_at >= ${start}
      AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;

    return growthTrend.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      newCustomers: Number(item.newCustomers),
    }));
  }

  // İptal oranı trendi
  async getCancellationRateTrend(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const cancellationTrend = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as "totalOrders",
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as "cancelledOrders"
      FROM orders
      WHERE created_at >= ${start}
      AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;

    return cancellationTrend.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      totalOrders: Number(item.totalOrders),
      cancelledOrders: Number(item.cancelledOrders),
      cancellationRate: item.totalOrders > 0 
        ? ((Number(item.cancelledOrders) / Number(item.totalOrders)) * 100).toFixed(2)
        : 0,
    }));
  }

  // En aktif müşteriler
  async getTopCustomers(limit = 10, startDate, endDate) {
    const limitInt = parseInt(limit) || 10;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const topCustomers = await prisma.$queryRaw`
      SELECT
        u.id as "userId",
        u.first_name || ' ' || u.last_name as "customerName",
        u.email,
        COUNT(DISTINCT o.id)::int as "orderCount",
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)::decimal as "totalSpent"
      FROM users u
      INNER JOIN orders o ON u.id = o.user_id
      WHERE o.created_at >= ${start}
      AND o.created_at <= ${end}
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY "totalSpent" DESC
      LIMIT ${limitInt}
    `;

    return topCustomers.map((customer) => ({
      userId: customer.userId,
      customerName: customer.customerName,
      email: customer.email,
      orderCount: Number(customer.orderCount),
      totalSpent: Number(customer.totalSpent),
    }));
  }

  // Sipariş tamamlama süresi analizi
  async getOrderCompletionTime(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const completionTimes = await prisma.$queryRaw`
      SELECT
        o.id,
        o.created_at as "orderDate",
        o.updated_at as "completedDate",
        EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600 as "hoursToComplete"
      FROM orders o
      WHERE o.status = 'delivered'
      AND o.created_at >= ${start}
      AND o.created_at <= ${end}
      ORDER BY o.created_at DESC
    `;

    const times = completionTimes.map((item) => Number(item.hoursToComplete));
    const avgTime = times.length > 0 
      ? times.reduce((a, b) => a + b, 0) / times.length 
      : 0;

    return {
      averageHours: Number(avgTime.toFixed(2)),
      totalDelivered: times.length,
      completionTimes: completionTimes.map((item) => ({
        orderId: item.id,
        hoursToComplete: Number(item.hoursToComplete.toFixed(2)),
      })),
    };
  }

  // Aylık karşılaştırma
  async getMonthlyComparison() {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [currentMonthData, lastMonthData] = await Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: { gte: currentMonth },
          status: { not: 'cancelled' },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: lastMonth, lt: currentMonth },
          status: { not: 'cancelled' },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    return {
      currentMonth: {
        revenue: Number(currentMonthData._sum.total || 0),
        orders: currentMonthData._count.id,
      },
      lastMonth: {
        revenue: Number(lastMonthData._sum.total || 0),
        orders: lastMonthData._count.id,
      },
      revenueChange: lastMonthData._sum.total > 0
        ? (((currentMonthData._sum.total || 0) - (lastMonthData._sum.total || 0)) / (lastMonthData._sum.total || 0)) * 100
        : 0,
      ordersChange: lastMonthData._count.id > 0
        ? (((currentMonthData._count.id || 0) - lastMonthData._count.id) / lastMonthData._count.id) * 100
        : 0,
    };
  }

  // Ortalama sepet değeri trendi
  async getAverageCartValueTrend(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const cartValueTrend = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as "orderCount",
        COALESCE(AVG(CASE WHEN status != 'cancelled' THEN total ELSE NULL END), 0)::decimal as "avgCartValue"
      FROM orders
      WHERE created_at >= ${start}
      AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;

    return cartValueTrend.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      avgCartValue: Number(item.avgCartValue || 0).toFixed(2),
      orderCount: Number(item.orderCount),
    }));
  }

  // ===============================
  // PRODUCT VARIANT MANAGEMENT
  // ===============================

  // Varyant seçeneklerini getir (bir ürün için)
  async getVariantOptions(productId) {
    const options = await prisma.productVariantOption.findMany({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
    });

    return options;
  }

  // Tüm ürünlerdeki benzersiz varyant seçeneklerini getir (global seçenekler)
  async getAllVariantOptionNames() {
    const options = await prisma.productVariantOption.findMany({
      select: {
        name: true,
        displayOrder: true,
      },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });

    return options;
  }

  // Belirli bir varyant seçeneği için daha önce kullanılmış tüm değerleri getir
  async getVariantOptionValues(optionName) {
    // Önce bu isimdeki tüm varyant seçeneklerini bul
    const options = await prisma.productVariantOption.findMany({
      where: {
        name: optionName,
      },
      select: {
        id: true,
      },
    });

    if (options.length === 0) {
      return [];
    }

    const optionIds = options.map((opt) => opt.id);

    // Bu seçenekler için kullanılmış tüm benzersiz değerleri getir
    const values = await prisma.productVariantValue.findMany({
      where: {
        optionId: {
          in: optionIds,
        },
      },
      select: {
        value: true,
      },
      distinct: ['value'],
      orderBy: { value: 'asc' },
    });

    return values.map((v) => v.value);
  }

  // Varyant seçeneği oluştur
  async createVariantOption(productId, data) {
    const { name, displayOrder } = data;

    const option = await prisma.productVariantOption.create({
      data: {
        productId,
        name,
        displayOrder: displayOrder || 0,
      },
    });

    return option;
  }

  // Varyant seçeneği güncelle
  async updateVariantOption(optionId, data) {
    const option = await prisma.productVariantOption.findUnique({
      where: { id: optionId },
    });

    if (!option) {
      throw new NotFoundError('Variant-Option nicht gefunden');
    }

    const updated = await prisma.productVariantOption.update({
      where: { id: optionId },
      data: {
        name: data.name,
        displayOrder: data.displayOrder,
      },
    });

    return updated;
  }

  // Varyant seçeneği sil
  async deleteVariantOption(optionId) {
    const option = await prisma.productVariantOption.findUnique({
      where: { id: optionId },
    });

    if (!option) {
      throw new NotFoundError('Variant-Option nicht gefunden');
    }

    await prisma.productVariantOption.delete({
      where: { id: optionId },
    });

    return { message: 'Variant-Option wurde gelöscht' };
  }

  // Ürünün varyantlarını getir
  async getProductVariants(productId) {
    const variants = await prisma.productVariant.findMany({
      where: { productId },
      include: {
        values: {
          include: {
            option: {
              select: {
                id: true,
                name: true,
                displayOrder: true,
              },
            },
          },
          orderBy: {
            option: {
              displayOrder: 'asc',
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return variants;
  }

  // Varyant oluştur
  async createVariant(productId, data) {
    const { name, price, stock, sku, imageUrls, isActive, values } = data;

    // Varyant oluştur
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        sku: sku || null,
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
        isActive: isActive !== undefined ? isActive : true,
        values: {
          create: values.map((val) => ({
            optionId: val.optionId,
            value: val.value,
          })),
        },
      },
      include: {
        values: {
          include: {
            option: {
              select: {
                id: true,
                name: true,
                displayOrder: true,
              },
            },
          },
        },
      },
    });

    return variant;
  }

  // Varyant güncelle
  async updateVariant(variantId, data) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundError('Variant nicht gefunden');
    }

    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.stock !== undefined) updateData.stock = parseInt(data.stock);
    if (data.sku !== undefined) updateData.sku = data.sku || null;
    if (data.imageUrls !== undefined) {
      updateData.imageUrls = Array.isArray(data.imageUrls) ? data.imageUrls : [];
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Values güncelleme
    if (data.values !== undefined) {
      // Mevcut values'ları sil
      await prisma.productVariantValue.deleteMany({
        where: { variantId },
      });

      // Yeni values'ları ekle
      updateData.values = {
        create: data.values.map((val) => ({
          optionId: val.optionId,
          value: val.value,
        })),
      };
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
      include: {
        values: {
          include: {
            option: {
              select: {
                id: true,
                name: true,
                displayOrder: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  // Varyant sil
  async deleteVariant(variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundError('Variant nicht gefunden');
    }

    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    return { message: 'Variant wurde gelöscht' };
  }

  // Toplu varyant oluştur (kombinasyonlar)
  async createVariantsBulk(productId, data) {
    const { options, combinations } = data;

    // Önce varyant seçeneklerini oluştur (yoksa)
    const existingOptions = await prisma.productVariantOption.findMany({
      where: { productId },
    });

    const optionMap = {};
    for (const opt of options) {
      let option = existingOptions.find((o) => o.name === opt.name);
      if (!option) {
        option = await prisma.productVariantOption.create({
          data: {
            productId,
            name: opt.name,
            displayOrder: opt.displayOrder || 0,
          },
        });
      }
      optionMap[opt.name] = option.id;
    }

    // Kombinasyonları oluştur
    const createdVariants = [];
    for (const combo of combinations) {
      const { name, price, stock, sku, imageUrls, values: comboValues } = combo;

      // Values array'ini oluştur
      const values = Object.entries(comboValues).map(([optionName, value]) => ({
        optionId: optionMap[optionName],
        value: value,
      }));

      const variant = await prisma.productVariant.create({
        data: {
          productId,
          name,
          price: parseFloat(price),
          stock: parseInt(stock) || 0,
          sku: sku || null,
          imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
          isActive: true,
          values: {
            create: values,
          },
        },
        include: {
          values: {
            include: {
              option: {
                select: {
                  id: true,
                  name: true,
                  displayOrder: true,
                },
              },
            },
          },
        },
      });

      createdVariants.push(variant);
    }

    return createdVariants;
  }

  // ===============================
  // ADMIN MANAGEMENT
  // ===============================

  // Tüm adminleri listele
  async getAdminsForAdmin(filters = {}) {
    const {
      search,
      role,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    // WHERE koşulları
    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    // Toplam sayı
    const total = await prisma.admin.count({ where });

    // Adminleri getir
    const admins = await prisma.admin.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        email: true,
        role: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        adminRole: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: parseInt(limit),
    });

    return {
      admins,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin detayını getir
  async getAdminByIdForAdmin(adminId) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        firstName: true,
        email: true,
        role: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        adminRole: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: {
              include: {
                permission: {
                  select: {
                    id: true,
                    name: true,
                    displayName: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundError('Administrator nicht gefunden');
    }

    return admin;
  }

  // Admin oluştur
  async createAdminForAdmin(data) {
    const { firstName, email, password, role = 'admin', roleId } = data;

    // Email kontrolü
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingAdmin) {
      throw new ConflictError('E-Mail bereits registriert');
    }

    // roleId varsa rol kontrolü yap
    if (roleId) {
      const roleExists = await prisma.adminRole.findUnique({
        where: { id: roleId },
      });

      if (!roleExists) {
        throw new NotFoundError('Rol bulunamadı');
      }
    }

    // Şifreyi hash'le
    const passwordHash = await hashPassword(password);

    // Admin oluştur
    const admin = await prisma.admin.create({
      data: {
        firstName,
        email: email.toLowerCase().trim(),
        passwordHash,
        role, // Eski sistem için fallback
        ...(roleId && { roleId }), // Yeni rol sistemi
      },
      include: {
        adminRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return admin;
  }

  // Admin güncelle
  async updateAdminForAdmin(adminId, data) {
    const { firstName, email, password, role, roleId } = data;

    // Admin'i bul
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!existingAdmin) {
      throw new NotFoundError('Administrator nicht gefunden');
    }

    // Email değişiyorsa kontrol et
    if (email && email.toLowerCase().trim() !== existingAdmin.email) {
      const emailExists = await prisma.admin.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (emailExists) {
        throw new ConflictError('E-Mail bereits registriert');
      }
    }

    // roleId varsa rol kontrolü yap
    if (roleId !== undefined) {
      if (roleId) {
        const roleExists = await prisma.adminRole.findUnique({
          where: { id: roleId },
        });

        if (!roleExists) {
          throw new NotFoundError('Rol bulunamadı');
        }
      }
    }

    // Güncelleme verilerini hazırla
    const updateData = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (role !== undefined) updateData.role = role; // Eski sistem için fallback
    if (roleId !== undefined) updateData.roleId = roleId || null; // Yeni rol sistemi (null = rol kaldır)
    if (password !== undefined) {
      updateData.passwordHash = await hashPassword(password);
    }

    // Admin'i güncelle
    const admin = await prisma.admin.update({
      where: { id: adminId },
      data: updateData,
      include: {
        adminRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return admin;
  }

  // Admin sil
  async deleteAdminForAdmin(adminId) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundError('Administrator nicht gefunden');
    }

    await prisma.admin.delete({
      where: { id: adminId },
    });

    return { message: 'Administrator wurde gelöscht' };
  }
}

export default new AdminService();
