import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

class CouponService {
  // Kupon kodunu doğrula ve indirim hesapla
  async validateCoupon(code, userId, cartItems, subtotal) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new NotFoundError('Kupon kodu bulunamadı');
    }

    // Aktif kontrolü
    if (!coupon.isActive) {
      throw new ValidationError('Bu kupon kodu aktif değil');
    }

    // Tarih kontrolü
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new ValidationError('Bu kupon kodu geçerli değil');
    }

    // Kullanım limiti kontrolü
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new ValidationError('Bu kupon kodu kullanım limitine ulaştı');
    }

    // Kullanıcı başına kullanım limiti kontrolü
    if (coupon.userUsageLimit !== null && userId) {
      const userUsageCount = await prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId: userId,
        },
      });

      if (userUsageCount >= coupon.userUsageLimit) {
        throw new ValidationError('Bu kupon kodunu daha fazla kullanamazsınız');
      }
    }

    // Kişiye özel kontrolü
    if (coupon.userIds && Array.isArray(coupon.userIds) && coupon.userIds.length > 0) {
      if (!userId || !coupon.userIds.includes(userId)) {
        throw new ValidationError('Bu kupon kodu size özel değil');
      }
    }

    // Min alışveriş tutarı kontrolü
    if (coupon.minPurchase && subtotal < parseFloat(coupon.minPurchase)) {
      throw new ValidationError(
        `Minimum alışveriş tutarı: ${parseFloat(coupon.minPurchase).toFixed(2)} €`
      );
    }

    // Ürün/kategori kontrolü
    if (!coupon.applyToAll) {
      const productIds = cartItems.map((item) => item.productId);
      const categoryIds = cartItems.map((item) => item.categoryId).filter(Boolean);

      let isValid = false;

      // Ürün kontrolü
      if (coupon.productIds && Array.isArray(coupon.productIds) && coupon.productIds.length > 0) {
        isValid = productIds.some((id) => coupon.productIds.includes(id));
      }

      // Kategori kontrolü
      if (!isValid && coupon.categoryIds && Array.isArray(coupon.categoryIds) && coupon.categoryIds.length > 0) {
        isValid = categoryIds.some((id) => coupon.categoryIds.includes(id));
      }

      if (!isValid) {
        throw new ValidationError('Bu kupon kodu sepetinizdeki ürünlere uygulanamaz');
      }
    }

    // İndirim hesapla
    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = (subtotal * parseFloat(coupon.discountPercent || 0)) / 100;
      // Max indirim kontrolü
      if (coupon.maxDiscount && discount > parseFloat(coupon.maxDiscount)) {
        discount = parseFloat(coupon.maxDiscount);
      }
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discount = parseFloat(coupon.discountAmount || 0);
      // İndirim subtotal'dan fazla olamaz
      if (discount > subtotal) {
        discount = subtotal;
      }
    }

    return {
      coupon,
      discount: parseFloat(discount.toFixed(2)),
    };
  }

  // Tüm kuponları listele (Admin için)
  async getAllCoupons({
    page = 1,
    limit = 20,
    search,
    type,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;

    // Where koşulları
    const where = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    // Sıralama
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Kuponları getir
    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
        include: {
          _count: {
            select: {
              orders: true,
              usages: true,
            },
          },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    return {
      coupons,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Tek kupon getir
  async getCouponById(id) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            usages: true,
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundError('Kupon bulunamadı');
    }

    return coupon;
  }

  // Kupon oluştur
  async createCoupon(data) {
    const {
      code,
      name,
      type,
      discountPercent,
      discountAmount,
      startDate,
      endDate,
      minPurchase,
      maxDiscount,
      usageLimit,
      userUsageLimit,
      applyToAll,
      userIds,
      categoryIds,
      productIds,
      isActive,
    } = data;

    // Validasyon
    if (!code) {
      throw new ValidationError('Kupon kodu gereklidir');
    }

    if (!type || !['PERCENTAGE', 'FIXED_AMOUNT'].includes(type)) {
      throw new ValidationError('Geçersiz kupon tipi');
    }

    if (type === 'PERCENTAGE' && (!discountPercent || discountPercent <= 0 || discountPercent > 100)) {
      throw new ValidationError('Geçerli bir indirim yüzdesi giriniz (0-100)');
    }

    if (type === 'FIXED_AMOUNT' && (!discountAmount || discountAmount <= 0)) {
      throw new ValidationError('Geçerli bir indirim tutarı giriniz');
    }

    if (!startDate || !endDate) {
      throw new ValidationError('Başlangıç ve bitiş tarihi gereklidir');
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new ValidationError('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
    }

    // Kod benzersizlik kontrolü
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      throw new ValidationError('Bu kupon kodu zaten kullanılıyor');
    }

    // Kupon oluştur
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        name: name || null,
        type,
        discountPercent: type === 'PERCENTAGE' ? parseFloat(discountPercent) : null,
        discountAmount: type === 'FIXED_AMOUNT' ? parseFloat(discountAmount) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        minPurchase: minPurchase ? parseFloat(minPurchase) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        userUsageLimit: userUsageLimit ? parseInt(userUsageLimit) : 1,
        applyToAll: applyToAll !== false,
        userIds: userIds && Array.isArray(userIds) && userIds.length > 0 ? userIds : null,
        categoryIds: categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0 ? categoryIds : null,
        productIds: productIds && Array.isArray(productIds) && productIds.length > 0 ? productIds : null,
        isActive: isActive !== false,
      },
    });

    return coupon;
  }

  // Kupon güncelle
  async updateCoupon(id, data) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundError('Kupon bulunamadı');
    }

    const {
      code,
      name,
      type,
      discountPercent,
      discountAmount,
      startDate,
      endDate,
      minPurchase,
      maxDiscount,
      usageLimit,
      userUsageLimit,
      applyToAll,
      userIds,
      categoryIds,
      productIds,
      isActive,
    } = data;

    // Validasyon
    if (code && code.toUpperCase() !== coupon.code) {
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (existingCoupon) {
        throw new ValidationError('Bu kupon kodu zaten kullanılıyor');
      }
    }

    if (type && !['PERCENTAGE', 'FIXED_AMOUNT'].includes(type)) {
      throw new ValidationError('Geçersiz kupon tipi');
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      throw new ValidationError('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
    }

    // Güncelle
    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(name !== undefined && { name: name || null }),
        ...(type && { type }),
        ...(type === 'PERCENTAGE' && discountPercent !== undefined
          ? { discountPercent: parseFloat(discountPercent), discountAmount: null }
          : {}),
        ...(type === 'FIXED_AMOUNT' && discountAmount !== undefined
          ? { discountAmount: parseFloat(discountAmount), discountPercent: null }
          : {}),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(minPurchase !== undefined && { minPurchase: minPurchase ? parseFloat(minPurchase) : null }),
        ...(maxDiscount !== undefined && { maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null }),
        ...(usageLimit !== undefined && { usageLimit: usageLimit ? parseInt(usageLimit) : null }),
        ...(userUsageLimit !== undefined && { userUsageLimit: userUsageLimit ? parseInt(userUsageLimit) : 1 }),
        ...(applyToAll !== undefined && { applyToAll: applyToAll }),
        ...(userIds !== undefined && {
          userIds: userIds && Array.isArray(userIds) && userIds.length > 0 ? userIds : null,
        }),
        ...(categoryIds !== undefined && {
          categoryIds: categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0 ? categoryIds : null,
        }),
        ...(productIds !== undefined && {
          productIds: productIds && Array.isArray(productIds) && productIds.length > 0 ? productIds : null,
        }),
        ...(isActive !== undefined && { isActive: isActive }),
      },
    });

    return updatedCoupon;
  }

  // Kupon sil
  async deleteCoupon(id) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundError('Kupon bulunamadı');
    }

    // Kullanım varsa silme
    const usageCount = await prisma.couponUsage.count({
      where: { couponId: id },
    });

    if (usageCount > 0) {
      throw new ValidationError('Bu kupon kullanıldığı için silinemez');
    }

    await prisma.coupon.delete({
      where: { id },
    });

    return { success: true };
  }

  // Rastgele kupon kodu oluştur
  generateCouponCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Kupon kullanım istatistikleri
  async getCouponStats(couponId) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        _count: {
          select: {
            orders: true,
            usages: true,
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundError('Kupon bulunamadı');
    }

    // Toplam indirim tutarı
    const totalDiscount = await prisma.couponUsage.aggregate({
      where: { couponId },
      _sum: { discount: true },
    });

    return {
      coupon,
      totalUsage: coupon._count.usages,
      totalOrders: coupon._count.orders,
      totalDiscount: totalDiscount._sum.discount || 0,
    };
  }
}

export default new CouponService();

