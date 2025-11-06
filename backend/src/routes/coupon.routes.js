import express from 'express';
import couponController from '../controllers/coupon.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  validateCouponValidation,
  createCouponValidation,
  updateCouponValidation,
} from '../validators/coupon.validators.js';

const router = express.Router();

// ===============================
// PUBLIC ENDPOINTS
// ===============================

// POST /api/coupons/validate - Kupon kodunu doğrula (Müşteri için - optional auth)
router.post(
  '/validate',
  optionalAuth,
  validateCouponValidation,
  validate,
  couponController.validateCoupon
);

// ===============================
// ADMIN ENDPOINTS
// ===============================

// Admin authentication gerekli
router.use(authenticateAdmin);

// GET /api/coupons/generate-code - Rastgele kupon kodu oluştur
router.get('/generate-code', couponController.generateCouponCode);

// GET /api/coupons - Tüm kuponları listele
router.get('/', couponController.getAllCoupons);

// GET /api/coupons/:id - Kupon detayı
router.get('/:id', couponController.getCouponById);

// GET /api/coupons/:id/stats - Kupon istatistikleri
router.get('/:id/stats', couponController.getCouponStats);

// POST /api/coupons - Kupon oluştur
router.post('/', createCouponValidation, validate, couponController.createCoupon);

// PUT /api/coupons/:id - Kupon güncelle
router.put('/:id', updateCouponValidation, validate, couponController.updateCoupon);

// DELETE /api/coupons/:id - Kupon sil
router.delete('/:id', couponController.deleteCoupon);

export default router;

