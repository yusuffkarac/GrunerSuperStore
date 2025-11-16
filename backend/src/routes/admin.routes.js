import express from 'express';
import adminController from '../controllers/admin.controller.js';
import orderController from '../controllers/order.controller.js';
import settingsController from '../controllers/settings.controller.js';
import uploadController from '../controllers/upload.controller.js';
import magazineController from '../controllers/magazine.controller.js';
import * as roleController from '../controllers/role.controller.js';
import * as expiryController from '../controllers/expiry.controller.js';
import * as stockController from '../controllers/stock.controller.js';
import * as supplierController from '../controllers/supplier.controller.js';
import { authenticateAdmin, requireSuperAdmin, requirePermission } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import upload from '../middleware/upload.js';
import { adminLoginValidation, createUserValidation, updateUserValidation, createAdminValidation, updateAdminValidation } from '../validators/admin.validators.js';
import {
  updateOrderStatusValidation,
  orderIdValidation,
  adminCancelOrderValidation,
} from '../validators/order.validators.js';
import { createAddressValidation, updateAddressValidation } from '../validators/user.validator.js';

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

// GET /api/admin/dashboard/trends - Dashboard trend verileri
router.get('/dashboard/trends', adminController.getDashboardTrends);

// GET /api/admin/dashboard/top-products - En çok satan ürünler
router.get('/dashboard/top-products', adminController.getTopSellingProducts);

// GET /api/admin/dashboard/category-stats - Kategori istatistikleri
router.get('/dashboard/category-stats', adminController.getCategoryStats);

// GET /api/admin/dashboard/order-status-distribution - Sipariş durumu dağılımı
router.get('/dashboard/order-status-distribution', adminController.getOrderStatusDistribution);

// GET /api/admin/dashboard/revenue-stats - Gelir istatistikleri
router.get('/dashboard/revenue-stats', adminController.getRevenueStats);

// GET /api/admin/dashboard/daily-order-counts - Günlük sipariş sayıları
router.get('/dashboard/daily-order-counts', adminController.getDailyOrderCounts);

// GET /api/admin/dashboard/hourly-distribution - Saatlik sipariş dağılımı
router.get('/dashboard/hourly-distribution', adminController.getHourlyOrderDistribution);

// GET /api/admin/dashboard/customer-growth - Müşteri büyümesi trendi
router.get('/dashboard/customer-growth', adminController.getCustomerGrowthTrend);

// GET /api/admin/dashboard/cancellation-rate - İptal oranı trendi
router.get('/dashboard/cancellation-rate', adminController.getCancellationRateTrend);

// GET /api/admin/dashboard/top-customers - En aktif müşteriler
router.get('/dashboard/top-customers', adminController.getTopCustomers);

// GET /api/admin/dashboard/order-completion-time - Sipariş tamamlama süresi
router.get('/dashboard/order-completion-time', adminController.getOrderCompletionTime);

// GET /api/admin/dashboard/monthly-comparison - Aylık karşılaştırma
router.get('/dashboard/monthly-comparison', adminController.getMonthlyComparison);

// GET /api/admin/dashboard/average-cart-value - Ortalama sepet değeri trendi
router.get('/dashboard/average-cart-value', adminController.getAverageCartValueTrend);

// ===============================
// ORDER MANAGEMENT
// ===============================

// GET /api/admin/orders/stats - Sipariş istatistikleri
router.get('/orders/stats', requirePermission('order_management_view'), adminController.getOrderStats);

// GET /api/admin/orders - Tüm siparişleri listele
router.get('/orders', requirePermission('order_management_view'), adminController.getAllOrders);

// GET /api/admin/orders/:id - Sipariş detayı
router.get('/orders/:id', requirePermission('order_management_view'), orderIdValidation, validate, adminController.getOrderById);

// PUT /api/admin/orders/:id/status - Sipariş durumu güncelle
router.put(
  '/orders/:id/status',
  requirePermission('order_management_edit'),
  updateOrderStatusValidation,
  validate,
  adminController.updateOrderStatus
);

// PUT /api/admin/orders/:id/cancel - Sipariş iptal et (Admin)
router.put(
  '/orders/:id/cancel',
  requirePermission('order_management_cancel'),
  adminCancelOrderValidation,
  validate,
  adminController.cancelOrder
);

// GET /api/admin/orders/:id/review - Sipariş review'ını getir (admin)
router.get('/orders/:id/review', requirePermission('order_management_view'), orderIdValidation, validate, orderController.getReview);

// GET /api/admin/orders/:id/invoice - Fatura PDF'ini indir/görüntüle (Admin)
router.get('/orders/:id/invoice', requirePermission('order_management_view'), orderIdValidation, validate, orderController.getInvoicePDF);

// POST /api/admin/orders/:id/send-invoice - Müşteriye fatura gönder
router.post('/orders/:id/send-invoice', requirePermission('order_management_edit'), orderIdValidation, validate, orderController.sendInvoice);

// GET /api/admin/orders/:id/delivery-slip - Kurye için teslimat slip PDF'ini indir
router.get('/orders/:id/delivery-slip', requirePermission('order_management_view'), orderIdValidation, validate, orderController.getDeliverySlipPDF);

// ===============================
// PRODUCT MANAGEMENT
// ===============================

// GET /api/admin/products - Tüm ürünleri listele
router.get('/products', requirePermission('product_management_view'), adminController.getProducts);

// GET /api/admin/products/missing-data - Eksik bilgisi olan ürünleri getir (/:id'den ÖNCE olmalı)
router.get('/products/missing-data', requirePermission('product_management_view'), adminController.getProductsWithMissingData);

// GET /api/admin/products/ignored - Gözardı edilen ürünleri getir (/:id'den ÖNCE olmalı)
router.get('/products/ignored', requirePermission('product_management_view'), adminController.getIgnoredProducts);

// GET /api/admin/products/:id - Ürün detayı
router.get('/products/:id', requirePermission('product_management_view'), adminController.getProductById);

// POST /api/admin/products - Ürün oluştur
router.post('/products', requirePermission('product_management_create'), adminController.createProduct);

// PUT /api/admin/products/:id - Ürün güncelle
router.put('/products/:id', requirePermission('product_management_edit'), adminController.updateProduct);

// DELETE /api/admin/products/:id - Ürün sil
router.delete('/products/:id', requirePermission('product_management_delete'), adminController.deleteProduct);

// POST /api/admin/products/bulk-update-prices - Toplu fiyat güncelleme
router.post('/products/bulk-update-prices', requirePermission('product_management_edit'), adminController.bulkUpdatePrices);

// GET /api/admin/bulk-price-updates - Toplu fiyat güncellemelerini getir
router.get('/bulk-price-updates', requirePermission('product_management_view'), adminController.getBulkPriceUpdates);

// POST /api/admin/bulk-price-updates/:id/revert - Toplu fiyat güncellemesini geri al
router.post('/bulk-price-updates/:id/revert', requirePermission('product_management_edit'), adminController.revertBulkPriceUpdate);

// PUT /api/admin/bulk-price-updates/:id/end-date - Toplu fiyat güncellemesinin bitiş tarihini güncelle
router.put('/bulk-price-updates/:id/end-date', requirePermission('product_management_edit'), adminController.updateBulkPriceUpdateEndDate);

// ===============================
// PRODUCT VARIANT MANAGEMENT
// ===============================

// GET /api/admin/variant-options/all - Tüm global varyant seçeneklerini getir
router.get('/variant-options/all', requirePermission('product_management_view'), adminController.getAllVariantOptionNames);

// GET /api/admin/variant-options/:optionName/values - Belirli bir varyant seçeneği için kullanılmış değerleri getir
router.get('/variant-options/:optionName/values', requirePermission('product_management_view'), adminController.getVariantOptionValues);

// GET /api/admin/products/:productId/variant-options - Varyant seçeneklerini getir
router.get('/products/:productId/variant-options', requirePermission('product_management_view'), adminController.getVariantOptions);

// POST /api/admin/products/:productId/variant-options - Varyant seçeneği oluştur
router.post('/products/:productId/variant-options', requirePermission('product_management_edit'), adminController.createVariantOption);

// PUT /api/admin/variant-options/:id - Varyant seçeneği güncelle
router.put('/variant-options/:id', requirePermission('product_management_edit'), adminController.updateVariantOption);

// DELETE /api/admin/variant-options/:id - Varyant seçeneği sil
router.delete('/variant-options/:id', requirePermission('product_management_delete'), adminController.deleteVariantOption);

// GET /api/admin/products/:productId/variants - Ürünün varyantlarını getir
router.get('/products/:productId/variants', requirePermission('product_management_view'), adminController.getProductVariants);

// POST /api/admin/products/:productId/variants - Varyant oluştur
router.post('/products/:productId/variants', requirePermission('product_management_create'), adminController.createVariant);

// POST /api/admin/products/:productId/variants/bulk - Toplu varyant oluştur
router.post('/products/:productId/variants/bulk', requirePermission('product_management_create'), adminController.createVariantsBulk);

// PUT /api/admin/variants/:id - Varyant güncelle
router.put('/variants/:id', requirePermission('product_management_edit'), adminController.updateVariant);

// DELETE /api/admin/variants/:id - Varyant sil
router.delete('/variants/:id', requirePermission('product_management_delete'), adminController.deleteVariant);

// ===============================
// CATEGORY MANAGEMENT
// ===============================

// GET /api/admin/categories - Tüm kategorileri listele
router.get('/categories', requirePermission('product_management_view'), adminController.getCategories);

// GET /api/admin/categories/:id - Kategori detayı
router.get('/categories/:id', requirePermission('product_management_view'), adminController.getCategoryById);

// POST /api/admin/categories - Kategori oluştur
router.post('/categories', requirePermission('product_management_create'), adminController.createCategory);

// PUT /api/admin/categories/:id - Kategori güncelle
router.put('/categories/:id', requirePermission('product_management_edit'), adminController.updateCategory);

// DELETE /api/admin/categories/:id - Kategori sil
router.delete('/categories/:id', requirePermission('product_management_delete'), adminController.deleteCategory);

// ===============================
// USER MANAGEMENT
// ===============================

// GET /api/admin/users - Tüm kullanıcıları listele
router.get('/users', requirePermission('user_management_view'), adminController.getUsers);

// GET /api/admin/users/:id - Kullanıcı detayı
router.get('/users/:id', requirePermission('user_management_view'), adminController.getUserById);

// POST /api/admin/users - Yeni kullanıcı oluştur
router.post('/users', requirePermission('user_management_edit'), createUserValidation, validate, adminController.createUser);

// PUT /api/admin/users/:id - Kullanıcı güncelle
router.put('/users/:id', requirePermission('user_management_edit'), updateUserValidation, validate, adminController.updateUser);

// PUT /api/admin/users/:id/status - Kullanıcı aktif/pasif yap
router.put('/users/:id/status', requirePermission('user_management_edit'), adminController.toggleUserStatus);

// POST /api/admin/users/:userId/addresses - Kullanıcıya adres ekle
router.post(
  '/users/:userId/addresses',
  requirePermission('user_management_edit'),
  createAddressValidation,
  validate,
  adminController.createUserAddress
);

// PUT /api/admin/users/:userId/addresses/:addressId - Kullanıcı adresini güncelle
router.put(
  '/users/:userId/addresses/:addressId',
  requirePermission('user_management_edit'),
  updateAddressValidation,
  validate,
  adminController.updateUserAddress
);

// DELETE /api/admin/users/:userId/addresses/:addressId - Kullanıcı adresini sil
router.delete(
  '/users/:userId/addresses/:addressId',
  requirePermission('user_management_edit'),
  adminController.deleteUserAddress
);

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

// POST /api/admin/admins/:adminId/assign-role - Admin'e rol ata
router.post('/admins/:adminId/assign-role', requireSuperAdmin, roleController.assignRole);

// ===============================
// ROLE & PERMISSION MANAGEMENT (Super Admin Only)
// ===============================

// Rol yönetimi
router.get('/roles', requireSuperAdmin, roleController.getRoles);
router.get('/roles/:id', requireSuperAdmin, roleController.getRole);
router.post('/roles', requireSuperAdmin, roleController.createRole);
router.patch('/roles/:id', requireSuperAdmin, roleController.updateRole);
router.delete('/roles/:id', requireSuperAdmin, roleController.deleteRole);

// İzin yönetimi
router.get('/permissions', requireSuperAdmin, roleController.getPermissions);
router.post('/permissions', requireSuperAdmin, roleController.createPermission);
router.patch('/permissions/:id', requireSuperAdmin, roleController.updatePermission);
router.delete('/permissions/:id', requireSuperAdmin, roleController.deletePermission);

// ===============================
// EXPIRY DATE MANAGEMENT (SKT)
// ===============================

// SKT ayarları
router.get('/expiry/settings', requirePermission('expiry_management_view'), expiryController.getSettings);
router.put('/expiry/settings', requirePermission('expiry_management_settings'), expiryController.updateSettings);

// Kritik ve uyarı ürünleri
router.get('/expiry/critical', requirePermission('expiry_management_view'), expiryController.getCritical);
router.get('/expiry/warning', requirePermission('expiry_management_view'), expiryController.getWarning);

// Etiketleme ve kaldırma işlemleri
router.post('/expiry/label/:productId', requirePermission(['expiry_management_view', 'expiry_management_action']), expiryController.labelProduct);
router.post('/expiry/remove/:productId', requirePermission(['expiry_management_view', 'expiry_management_action']), expiryController.removeProduct);
router.put('/expiry/update-date/:productId', requirePermission(['expiry_management_view', 'expiry_management_action']), expiryController.updateExpiryDate);

// İşlem geçmişi
router.get('/expiry/history', requirePermission('expiry_management_view'), expiryController.getHistory);
router.post('/expiry/undo/:actionId', requirePermission(['expiry_management_view', 'expiry_management_action']), expiryController.undoAction);
router.post('/expiry/check-and-notify', requirePermission('expiry_management_view'), expiryController.checkAndNotifyAdmins);
router.get('/expiry/daily-reminder', requirePermission('expiry_management_view'), expiryController.sendDailyReminder);

// ===============================
// STOCK MANAGEMENT
// ===============================

// Kritik stoklu ürünler
router.get('/stock/low-stock', requirePermission('stock_management_view'), stockController.getLowStockProducts);

// Sipariş geçmişi
router.get('/stock/history', requirePermission('stock_management_view'), stockController.getStockOrderHistory);

// Sipariş işlemleri
router.post('/stock/order/:productId', requirePermission(['stock_management_view', 'stock_management_action']), stockController.createStockOrder);
router.put('/stock/order/:orderId/status', requirePermission(['stock_management_view', 'stock_management_action']), stockController.updateStockOrderStatus);
router.post('/stock/order/:orderId/undo', requirePermission(['stock_management_view', 'stock_management_action']), stockController.undoStockOrder);

// Tedarikçi güncelleme
router.put('/stock/product/:productId/supplier', requirePermission(['stock_management_view', 'stock_management_action']), stockController.updateProductSupplier);

// Sipariş listeleri
router.post('/stock/lists', requirePermission(['stock_management_view', 'stock_management_action']), stockController.createStockOrderList);
router.get('/stock/lists', requirePermission('stock_management_view'), stockController.getStockOrderLists);
router.get('/stock/lists/:listId', requirePermission('stock_management_view'), stockController.getStockOrderListById);
router.put('/stock/lists/:listId/status', requirePermission(['stock_management_view', 'stock_management_action']), stockController.updateStockOrderListStatus);
router.delete('/stock/lists/:listId', requirePermission(['stock_management_view', 'stock_management_action']), stockController.deleteStockOrderList);
router.get('/stock/lists/:listId/pdf', requirePermission('stock_management_view'), stockController.getStockOrderListPDF);

// Supplier email yönetimi
router.get('/suppliers/emails', requirePermission('stock_management_view'), supplierController.getSupplierEmails);
router.post('/suppliers/emails', requirePermission(['stock_management_view', 'stock_management_action']), supplierController.addSupplierEmail);

// ===============================
// MAGAZINE MANAGEMENT
// ===============================

// GET /api/admin/magazines - Tüm dergileri listele
router.get('/magazines', requirePermission('settings_view'), magazineController.getAllMagazines);

// GET /api/admin/magazines/:id - Dergi detayı
router.get('/magazines/:id', requirePermission('settings_view'), magazineController.getMagazineById);

// POST /api/admin/magazines - Yeni dergi oluştur
router.post('/magazines', requirePermission('settings_edit'), magazineController.createMagazine);

// PUT /api/admin/magazines/:id - Dergi güncelle
router.put('/magazines/:id', requirePermission('settings_edit'), magazineController.updateMagazine);

// DELETE /api/admin/magazines/:id - Dergi sil
router.delete('/magazines/:id', requirePermission('settings_edit'), magazineController.deleteMagazine);

// PATCH /api/admin/magazines/:id/toggle - Aktif/Pasif değiştir
router.patch('/magazines/:id/toggle', requirePermission('settings_edit'), magazineController.toggleActive);

// ===============================
// SETTINGS MANAGEMENT
// ===============================

// GET /api/admin/settings - Ayarları getir
router.get('/settings', requirePermission('settings_view'), settingsController.getSettings);

// PUT /api/admin/settings - Ayarları güncelle
router.put('/settings', requirePermission('settings_edit'), settingsController.updateSettings);

// ===============================
// FILE UPLOAD
// ===============================

// POST /api/admin/upload - Tek dosya yükle (genellikle ürün/kategori resimleri için)
router.post('/upload', requirePermission('product_management_edit'), upload.single('file'), uploadController.uploadFile);

// POST /api/admin/upload/multiple - Birden fazla dosya yükle
router.post('/upload/multiple', requirePermission('product_management_edit'), upload.array('files', 10), uploadController.uploadMultiple);

// ===============================
// PRODUCT TASKS (MISSING DATA)
// ===============================

// POST /api/admin/products/:id/ignore-task - Ürünü görev tipinden muaf tut
router.post('/products/:id/ignore-task', requirePermission('product_management_edit'), adminController.ignoreProductTask);

// DELETE /api/admin/products/:id/ignore-task/:category - Ürünün muafiyetini kaldır
router.delete('/products/:id/ignore-task/:category', requirePermission('product_management_edit'), adminController.unignoreProductTask);

export default router;
