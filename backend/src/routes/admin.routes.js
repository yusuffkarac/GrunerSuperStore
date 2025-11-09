import express from 'express';
import adminController from '../controllers/admin.controller.js';
import orderController from '../controllers/order.controller.js';
import settingsController from '../controllers/settings.controller.js';
import uploadController from '../controllers/upload.controller.js';
import { authenticateAdmin, requireSuperAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import upload from '../middleware/upload.js';
import { adminLoginValidation, createUserValidation, updateUserValidation, createAdminValidation, updateAdminValidation } from '../validators/admin.validators.js';
import {
  updateOrderStatusValidation,
  orderIdValidation,
  adminCancelOrderValidation,
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

// PUT /api/admin/orders/:id/cancel - Sipariş iptal et (Admin)
router.put(
  '/orders/:id/cancel',
  adminCancelOrderValidation,
  validate,
  adminController.cancelOrder
);

// GET /api/admin/orders/:id/review - Sipariş review'ını getir (admin)
router.get('/orders/:id/review', orderIdValidation, validate, orderController.getReview);

// POST /api/admin/orders/:id/send-invoice - Müşteriye fatura gönder
router.post('/orders/:id/send-invoice', orderIdValidation, validate, orderController.sendInvoice);

// GET /api/admin/orders/:id/delivery-slip - Kurye için teslimat slip PDF'ini indir
router.get('/orders/:id/delivery-slip', orderIdValidation, validate, orderController.getDeliverySlipPDF);

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

// POST /api/admin/products/bulk-update-prices - Toplu fiyat güncelleme
router.post('/products/bulk-update-prices', adminController.bulkUpdatePrices);

// GET /api/admin/bulk-price-updates - Toplu fiyat güncellemelerini listele
router.get('/bulk-price-updates', adminController.getBulkPriceUpdates);

// POST /api/admin/bulk-price-updates/:id/revert - Toplu fiyat güncellemesini geri al
router.post('/bulk-price-updates/:id/revert', adminController.revertBulkPriceUpdate);

// ===============================
// TASK MANAGEMENT
// ===============================

// GET /api/admin/tasks - Eksik bilgileri olan ürünleri kategorilere göre getir
router.get('/tasks', adminController.getTasks);

// POST /api/admin/tasks/ignore - Ürün için kategoriyi görmezden gel
router.post('/tasks/ignore', adminController.ignoreTask);

// DELETE /api/admin/tasks/ignore/:id - Görmezden gelme kaydını kaldır
router.delete('/tasks/ignore/:id', adminController.removeIgnore);

// ===============================
// PRODUCT VARIANT MANAGEMENT
// ===============================

// GET /api/admin/variant-options/all - Tüm global varyant seçeneklerini getir
router.get('/variant-options/all', adminController.getAllVariantOptionNames);

// GET /api/admin/variant-options/:optionName/values - Belirli bir varyant seçeneği için kullanılmış değerleri getir
router.get('/variant-options/:optionName/values', adminController.getVariantOptionValues);

// GET /api/admin/products/:productId/variant-options - Varyant seçeneklerini getir
router.get('/products/:productId/variant-options', adminController.getVariantOptions);

// POST /api/admin/products/:productId/variant-options - Varyant seçeneği oluştur
router.post('/products/:productId/variant-options', adminController.createVariantOption);

// PUT /api/admin/variant-options/:id - Varyant seçeneği güncelle
router.put('/variant-options/:id', adminController.updateVariantOption);

// DELETE /api/admin/variant-options/:id - Varyant seçeneği sil
router.delete('/variant-options/:id', adminController.deleteVariantOption);

// GET /api/admin/products/:productId/variants - Ürünün varyantlarını getir
router.get('/products/:productId/variants', adminController.getProductVariants);

// POST /api/admin/products/:productId/variants - Varyant oluştur
router.post('/products/:productId/variants', adminController.createVariant);

// POST /api/admin/products/:productId/variants/bulk - Toplu varyant oluştur
router.post('/products/:productId/variants/bulk', adminController.createVariantsBulk);

// PUT /api/admin/variants/:id - Varyant güncelle
router.put('/variants/:id', adminController.updateVariant);

// DELETE /api/admin/variants/:id - Varyant sil
router.delete('/variants/:id', adminController.deleteVariant);

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
// USER MANAGEMENT (Super Admin Only)
// ===============================

// GET /api/admin/users - Tüm kullanıcıları listele
router.get('/users', requireSuperAdmin, adminController.getUsers);

// GET /api/admin/users/:id - Kullanıcı detayı
router.get('/users/:id', requireSuperAdmin, adminController.getUserById);

// POST /api/admin/users - Yeni kullanıcı oluştur
router.post('/users', requireSuperAdmin, createUserValidation, validate, adminController.createUser);

// PUT /api/admin/users/:id - Kullanıcı güncelle
router.put('/users/:id', requireSuperAdmin, updateUserValidation, validate, adminController.updateUser);

// PUT /api/admin/users/:id/status - Kullanıcı aktif/pasif yap
router.put('/users/:id/status', requireSuperAdmin, adminController.toggleUserStatus);

// ===============================
// ADMIN MANAGEMENT (Super Admin Only)
// ===============================

// GET /api/admin/admins - Tüm adminleri listele
router.get('/admins', requireSuperAdmin, adminController.getAdmins);

// GET /api/admin/admins/:id - Admin detayı
router.get('/admins/:id', requireSuperAdmin, adminController.getAdminById);

// POST /api/admin/admins - Yeni admin oluştur
router.post('/admins', requireSuperAdmin, createAdminValidation, validate, adminController.createAdmin);

// PUT /api/admin/admins/:id - Admin güncelle
router.put('/admins/:id', requireSuperAdmin, updateAdminValidation, validate, adminController.updateAdmin);

// DELETE /api/admin/admins/:id - Admin sil
router.delete('/admins/:id', requireSuperAdmin, adminController.deleteAdmin);

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
