import express from 'express';
import orderController from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createOrderValidation,
  updateOrderStatusValidation,
  orderIdValidation,
} from '../validators/order.validators.js';

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// ===============================
// KULLANICI ENDPOINTS
// ===============================

// POST /api/orders - Sipariş oluştur
router.post('/', createOrderValidation, validate, orderController.createOrder);

// GET /api/orders - Kullanıcının siparişlerini listele
router.get('/', orderController.getOrders);

// GET /api/orders/:id - Sipariş detayı
router.get('/:id', orderIdValidation, validate, orderController.getOrderById);

// PUT /api/orders/:id/cancel - Sipariş iptal et
router.put('/:id/cancel', orderIdValidation, validate, orderController.cancelOrder);

export default router;
