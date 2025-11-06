import couponService from '../services/coupon.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import prisma from '../config/prisma.js';

class CouponController {
  // Kupon kodunu doğrula (Müşteri için)
  validateCoupon = asyncHandler(async (req, res) => {
    const { code, cartItems, subtotal } = req.body;
    const userId = req.user?.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Gutscheincode ist erforderlich',
      });
    }

    // Cart items'dan categoryId'leri almak için product bilgilerini çek
    const productIds = cartItems.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true },
    });

    const cartItemsWithCategory = cartItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        ...item,
        categoryId: product?.categoryId || null,
      };
    });

    const result = await couponService.validateCoupon(
      code,
      userId,
      cartItemsWithCategory,
      parseFloat(subtotal)
    );

    res.json({
      success: true,
      data: {
        coupon: result.coupon,
        discount: result.discount,
      },
    });
  });

  // Tüm kuponları listele (Admin)
  getAllCoupons = asyncHandler(async (req, res) => {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      type: req.query.type,
      isActive: req.query.isActive,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await couponService.getAllCoupons(filters);

    res.json({
      success: true,
      data: result,
    });
  });

  // Tek kupon getir (Admin)
  getCouponById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const coupon = await couponService.getCouponById(id);

    res.json({
      success: true,
      data: { coupon },
    });
  });

  // Kupon oluştur (Admin)
  createCoupon = asyncHandler(async (req, res) => {
    const coupon = await couponService.createCoupon(req.body);

    res.status(201).json({
      success: true,
      message: 'Gutschein erfolgreich erstellt',
      data: { coupon },
    });
  });

  // Kupon güncelle (Admin)
  updateCoupon = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const coupon = await couponService.updateCoupon(id, req.body);

    res.json({
      success: true,
      message: 'Gutschein erfolgreich aktualisiert',
      data: { coupon },
    });
  });

  // Kupon sil (Admin)
  deleteCoupon = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await couponService.deleteCoupon(id);

    res.json({
      success: true,
      message: 'Gutschein erfolgreich gelöscht',
    });
  });

  // Rastgele kupon kodu oluştur (Admin)
  generateCouponCode = asyncHandler(async (req, res) => {
    const { length } = req.query;
    let code = couponService.generateCouponCode(parseInt(length) || 8);

    // Benzersiz olana kadar dene
    let attempts = 0;
    
    while (attempts < 10) {
      const existing = await prisma.coupon.findUnique({
        where: { code },
      });

      if (!existing) {
        break;
      }

      code = couponService.generateCouponCode(parseInt(length) || 8);
      attempts++;
    }

    res.json({
      success: true,
      data: { code },
    });
  });

  // Kupon istatistikleri (Admin)
  getCouponStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const stats = await couponService.getCouponStats(id);

    res.json({
      success: true,
      data: stats,
    });
  });
}

export default new CouponController();

