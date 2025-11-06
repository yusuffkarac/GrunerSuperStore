import express from 'express';
import adminController from '../controllers/admin.controller.js';
import settingsController from '../controllers/settings.controller.js';
import uploadController from '../controllers/upload.controller.js';
import { authenticateAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import upload from '../middleware/upload.js';
import { adminLoginValidation, createUserValidation, updateUserValidation } from '../validators/admin.validators.js';
import {
  updateOrderStatusValidation,
  orderIdValidation,
} from '../validators/order.validators.js';

const router = express.Router();

// ===============================
// AUTH ENDPOINTS (Public)
// ===============================

// POST /api/admin/login - Admin girişi (alternatif endpoint)
router.post('/login', adminLoginValidation, validate, adminController.login);

// POST /api/admin/auth/login - Admin girişi
router.post('/auth/login', adminLoginValidation, validate, adminController.login);

// ===============================
// PROTECTED ENDPOINTS (Admin Only)
// ===============================

// Admin authentication gerekli
router.use(authenticateAdmin);

// GET /api/admin/auth/me - Admin bilgilerini getir
router.get('/auth/me', adminController.getMe);

// ===============================
// DASHBOARD
// ===============================

// GET /api/admin/dashboard/stats - Dashboard istatistikleri
router.get('/dashboard/stats', adminController.getDashboardStats);

// GET /api/admin/dashboard/recent-orders - Son siparişler
router.get('/dashboard/recent-orders', adminController.getRecentOrders);

// GET /api/admin/dashboard/low-stock - Düşük stoklu ürünler
router.get('/dashboard/low-stock', adminController.getLowStockProducts);

// ===============================
// ORDER MANAGEMENT
// ===============================

// GET /api/admin/orders/stats - Sipariş istatistikleri
router.get('/orders/stats', adminController.getOrderStats);

// GET /api/admin/orders - Tüm siparişleri listele
router.get('/orders', adminController.getAllOrders);

// GET /api/admin/orders/:id - Sipariş detayı
router.get('/orders/:id', orderIdValidation, validate, adminController.getOrderById);

// PUT /api/admin/orders/:id/status - Sipariş durumu güncelle
router.put(
  '/orders/:id/status',
  updateOrderStatusValidation,
  validate,
  adminController.updateOrderStatus
);

// ===============================
// PRODUCT MANAGEMENT
// ===============================

// GET /api/admin/products - Tüm ürünleri listele
router.get('/products', adminController.getProducts);

// GET /api/admin/products/:id - Ürün detayı
router.get('/products/:id', adminController.getProductById);

// POST /api/admin/products - Ürün oluştur
router.post('/products', adminController.createProduct);

// PUT /api/admin/products/:id - Ürün güncelle
router.put('/products/:id', adminController.updateProduct);

// DELETE /api/admin/products/:id - Ürün sil
router.delete('/products/:id', adminController.deleteProduct);

// ===============================
// CATEGORY MANAGEMENT
// ===============================

// GET /api/admin/categories - Tüm kategorileri listele
router.get('/categories', adminController.getCategories);

// GET /api/admin/categories/:id - Kategori detayı
router.get('/categories/:id', adminController.getCategoryById);

// POST /api/admin/categories - Kategori oluştur
router.post('/categories', adminController.createCategory);

// PUT /api/admin/categories/:id - Kategori güncelle
router.put('/categories/:id', adminController.updateCategory);

// DELETE /api/admin/categories/:id - Kategori sil
router.delete('/categories/:id', adminController.deleteCategory);

// ===============================
// USER MANAGEMENT
// ===============================

// GET /api/admin/users - Tüm kullanıcıları listele
router.get('/users', adminController.getUsers);

// GET /api/admin/users/:id - Kullanıcı detayı
router.get('/users/:id', adminController.getUserById);

// POST /api/admin/users - Yeni kullanıcı oluştur
router.post('/users', createUserValidation, validate, adminController.createUser);

// PUT /api/admin/users/:id - Kullanıcı güncelle
router.put('/users/:id', updateUserValidation, validate, adminController.updateUser);

// PUT /api/admin/users/:id/status - Kullanıcı aktif/pasif yap
router.put('/users/:id/status', adminController.toggleUserStatus);

// ===============================
// SETTINGS MANAGEMENT
// ===============================

// PUT /api/admin/settings - Ayarları güncelle
router.put('/settings', settingsController.updateSettings);

// ===============================
// FILE UPLOAD
// ===============================

// POST /api/admin/upload - Tek dosya yükle
router.post('/upload', upload.single('file'), uploadController.uploadFile);

// POST /api/admin/upload/multiple - Birden fazla dosya yükle
router.post('/upload/multiple', upload.array('files', 10), uploadController.uploadMultiple);

export default router;
