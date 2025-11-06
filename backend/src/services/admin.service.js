import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';

class AdminService {
  // Admin girişi
  async login({ email, password }) {
    // Email'i lowercase'e çevir (+ karakterini korumak için normalizeEmail kullanmıyoruz)
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('🔐 [Admin Service] Login attempt for:', normalizedEmail);

    // Admin'i bul
    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
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
}

export default new AdminService();
