import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';

class AdminService {
  // Admin girişi
  async login({ email, password }) {
    console.log('🔐 [Admin Service] Login attempt for:', email);

    // Admin'i bul
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      console.error('❌ [Admin Service] Admin bulunamadı:', email);
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

    // Admin token oluştur (type: 'admin' ile)
    const token = generateToken({
      adminId: admin.id,
      type: 'admin',
      role: admin.role,
    });

    console.log('✅ [Admin Service] Token oluşturuldu:', token.substring(0, 20) + '...');

    // Admin bilgilerini döndür (passwordHash olmadan)
    const { passwordHash, ...adminWithoutPassword } = admin;

    console.log('✅ [Admin Service] Response hazırlandı:', { admin: adminWithoutPassword.email, token: 'generated' });

    return { admin: adminWithoutPassword, token };
  }

  // Admin bilgilerini getir (token'dan)
  async getMe(adminId) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        firstName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundError('Administrator nicht gefunden');
    }

    return admin;
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
}

export default new AdminService();
