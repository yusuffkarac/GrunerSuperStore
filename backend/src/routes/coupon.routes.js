import express from 'express';
import couponController from '../controllers/coupon.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { authenticateAdmin, requirePermission } from '../middleware/admin.js';
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
router.get('/generate-code', requirePermission('marketing_coupons'), couponController.generateCouponCode);

// GET /api/coupons - Tüm kuponları listele
router.get('/', requirePermission('marketing_coupons'), couponController.getAllCoupons);

// GET /api/coupons/:id - Kupon detayı
router.get('/:id', requirePermission('marketing_coupons'), couponController.getCouponById);

// GET /api/coupons/:id/stats - Kupon istatistikleri
router.get('/:id/stats', requirePermission('marketing_coupons'), couponController.getCouponStats);

// POST /api/coupons - Kupon oluştur
router.post('/', requirePermission('marketing_coupons'), createCouponValidation, validate, couponController.createCoupon);

// PUT /api/coupons/:id - Kupon güncelle
router.put('/:id', requirePermission('marketing_coupons'), updateCouponValidation, validate, couponController.updateCoupon);

// DELETE /api/coupons/:id - Kupon sil
router.delete('/:id', requirePermission('marketing_coupons'), couponController.deleteCoupon);

export default router;

