import adminService from '../services/admin.service.js';
import orderService from '../services/order.service.js';
import productService from '../services/product.service.js';
import categoryService from '../services/category.service.js';
import userService from '../services/user.service.js';
import taskService from '../services/task.service.js';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class AdminController {
  // POST /api/admin/auth/login - Admin girişi
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await adminService.login({ email, password });

    res.status(200).json({
      success: true,
      message: 'Erfolgreich angemeldet',
      data: result,
    });
  });

  // GET /api/admin/auth/me - Admin bilgilerini getir
  getMe = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;

    const admin = await adminService.getMe(adminId);

    res.status(200).json({
      success: true,
      data: { admin },
    });
  });

  // GET /api/admin/dashboard/stats - Dashboard istatistikleri
  getDashboardStats = asyncHandler(async (req, res) => {
    const stats = await adminService.getDashboardStats();

    res.status(200).json({
      success: true,
      data: { stats },
    });
  });

  // GET /api/admin/dashboard/recent-orders - Son siparişler
  getRecentOrders = asyncHandler(async (req, res) => {
    const { limit } = req.query;

    const orders = await adminService.getRecentOrders(limit);

    res.status(200).json({
      success: true,
      data: { orders },
    });
  });

  // GET /api/admin/dashboard/low-stock - Düşük stoklu ürünler
  getLowStockProducts = asyncHandler(async (req, res) => {
    const { limit } = req.query;

    const products = await adminService.getLowStockProducts(limit);

    res.status(200).json({
      success: true,
      data: { products },
    });
  });

  // ===============================
  // ORDER MANAGEMENT
  // ===============================

  // GET /api/admin/orders - Tüm siparişleri listele
  getAllOrders = asyncHandler(async (req, res) => {
    const filters = {
      status: req.query.status,
      type: req.query.type,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await orderService.getAllOrders(filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/admin/orders/:id - Sipariş detayı
  getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Admin olarak işaretle
    const order = await orderService.getOrderById(id, null, true);

    res.status(200).json({
      success: true,
      data: { order },
    });
  });

  // PUT /api/admin/orders/:id/status - Sipariş durumu güncelle
  updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const order = await orderService.updateOrderStatus(id, status);

    res.status(200).json({
      success: true,
      message: 'Bestellstatus erfolgreich aktualisiert',
      data: { order },
    });
  });

  // PUT /api/admin/orders/:id/cancel - Sipariş iptal et (Admin)
  cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cancellationData = req.body;

    const order = await orderService.adminCancelOrder(id, cancellationData);

    res.status(200).json({
      success: true,
      message: 'Bestellung erfolgreich storniert',
      data: { order },
    });
  });

  // GET /api/admin/orders/stats - Sipariş istatistikleri
  getOrderStats = asyncHandler(async (req, res) => {
    const stats = await orderService.getOrderStats();

    res.status(200).json({
      success: true,
      data: { stats },
    });
  });

  // ===============================
  // PRODUCT MANAGEMENT
  // ===============================

  // GET /api/admin/products - Tüm ürünleri listele
  getProducts = asyncHandler(async (req, res) => {
    const {
      categoryId,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      isActive,
      isFeatured,
    } = req.query;

    const result = await productService.getProductsForAdmin({
      categoryId,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      isActive,
      isFeatured,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/admin/products/:id - Ürün detayı
  getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden',
      });
    }

    res.status(200).json({
      success: true,
      data: { product },
    });
  });

  // POST /api/admin/products - Ürün oluştur
  createProduct = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.body);

    res.status(201).json({
      success: true,
      message: 'Produkt erfolgreich erstellt',
      data: { product },
    });
  });

  // PUT /api/admin/products/:id - Ürün güncelle
  updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await productService.updateProduct(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Produkt erfolgreich aktualisiert',
      data: { product },
    });
  });

  // DELETE /api/admin/products/:id - Ürün sil
  deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await productService.deleteProduct(id);

    res.status(200).json({
      success: true,
      message: result.message || 'Produkt erfolgreich gelöscht',
      data: result,
    });
  });

  // ===============================
  // CATEGORY MANAGEMENT
  // ===============================

  // GET /api/admin/categories - Tüm kategorileri listele
  getCategories = asyncHandler(async (req, res) => {
    const { isActive, search, sortBy, sortOrder } = req.query;

    const categories = await categoryService.getCategoriesForAdmin({
      isActive,
      search,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      data: { categories },
    });
  });

  // GET /api/admin/categories/:id - Kategori detayı
  getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategorie nicht gefunden',
      });
    }

    res.status(200).json({
      success: true,
      data: { category },
    });
  });

  // POST /api/admin/categories - Kategori oluştur
  createCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      message: 'Kategorie erfolgreich erstellt',
      data: { category },
    });
  });

  // PUT /api/admin/categories/:id - Kategori güncelle
  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await categoryService.updateCategory(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Kategorie erfolgreich aktualisiert',
      data: { category },
    });
  });

  // DELETE /api/admin/categories/:id - Kategori sil
  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await categoryService.deleteCategory(id);

    res.status(200).json({
      success: true,
      message: result.message || 'Kategorie erfolgreich gelöscht',
      data: result,
    });
  });

  // ===============================
  // USER MANAGEMENT
  // ===============================

  // GET /api/admin/users - Tüm kullanıcıları listele
  getUsers = asyncHandler(async (req, res) => {
    const {
      isActive,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await userService.getUsersForAdmin({
      isActive,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/admin/users/:id - Kullanıcı detayı
  getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await userService.getUserByIdForAdmin(id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  // PUT /api/admin/users/:id/status - Kullanıcı aktif/pasif yap
  toggleUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await userService.toggleUserStatus(id);

    res.status(200).json({
      success: true,
      message: `Benutzer wurde ${user.isActive ? 'aktiviert' : 'deaktiviert'}`,
      data: { user },
    });
  });

  // POST /api/admin/users - Yeni kullanıcı oluştur
  createUser = asyncHandler(async (req, res) => {
    const user = await userService.createUserForAdmin(req.body);

    res.status(201).json({
      success: true,
      message: 'Benutzer erfolgreich erstellt',
      data: { user },
    });
  });

  // PUT /api/admin/users/:id - Kullanıcı güncelle
  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await userService.updateUserForAdmin(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Benutzer erfolgreich aktualisiert',
      data: { user },
    });
  });

  // ===============================
  // PRODUCT VARIANT MANAGEMENT
  // ===============================

  // GET /api/admin/products/:productId/variant-options - Varyant seçeneklerini getir
  getVariantOptions = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const options = await adminService.getVariantOptions(productId);

    res.status(200).json({
      success: true,
      data: { options },
    });
  });

  // GET /api/admin/variant-options/all - Tüm global varyant seçeneklerini getir
  getAllVariantOptionNames = asyncHandler(async (req, res) => {
    const options = await adminService.getAllVariantOptionNames();

    res.status(200).json({
      success: true,
      data: { options },
    });
  });

  // GET /api/admin/variant-options/:optionName/values - Belirli bir varyant seçeneği için kullanılmış değerleri getir
  getVariantOptionValues = asyncHandler(async (req, res) => {
    const { optionName } = req.params;

    const values = await adminService.getVariantOptionValues(optionName);

    res.status(200).json({
      success: true,
      data: { values },
    });
  });

  // POST /api/admin/products/:productId/variant-options - Varyant seçeneği oluştur
  createVariantOption = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const option = await adminService.createVariantOption(productId, req.body);

    res.status(201).json({
      success: true,
      message: 'Variant-Option erfolgreich erstellt',
      data: { option },
    });
  });

  // PUT /api/admin/variant-options/:id - Varyant seçeneği güncelle
  updateVariantOption = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const option = await adminService.updateVariantOption(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Variant-Option erfolgreich aktualisiert',
      data: { option },
    });
  });

  // DELETE /api/admin/variant-options/:id - Varyant seçeneği sil
  deleteVariantOption = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await adminService.deleteVariantOption(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // GET /api/admin/products/:productId/variants - Ürünün varyantlarını getir
  getProductVariants = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const variants = await adminService.getProductVariants(productId);

    res.status(200).json({
      success: true,
      data: { variants },
    });
  });

  // POST /api/admin/products/:productId/variants - Varyant oluştur
  createVariant = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const variant = await adminService.createVariant(productId, req.body);

    res.status(201).json({
      success: true,
      message: 'Variant erfolgreich erstellt',
      data: { variant },
    });
  });

  // PUT /api/admin/variants/:id - Varyant güncelle
  updateVariant = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const variant = await adminService.updateVariant(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Variant erfolgreich aktualisiert',
      data: { variant },
    });
  });

  // DELETE /api/admin/variants/:id - Varyant sil
  deleteVariant = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await adminService.deleteVariant(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // POST /api/admin/products/:productId/variants/bulk - Toplu varyant oluştur
  createVariantsBulk = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const variants = await adminService.createVariantsBulk(productId, req.body);

    res.status(201).json({
      success: true,
      message: `${variants.length} Varianten erfolgreich erstellt`,
      data: { variants },
    });
  });

  // ===============================
  // ADMIN MANAGEMENT
  // ===============================

  // GET /api/admin/admins - Tüm adminleri listele
  getAdmins = asyncHandler(async (req, res) => {
    const {
      search,
      role,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await adminService.getAdminsForAdmin({
      search,
      role,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/admin/admins/:id - Admin detayı
  getAdminById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const admin = await adminService.getAdminByIdForAdmin(id);

    res.status(200).json({
      success: true,
      data: { admin },
    });
  });

  // POST /api/admin/admins - Yeni admin oluştur
  createAdmin = asyncHandler(async (req, res) => {
    const admin = await adminService.createAdminForAdmin(req.body);

    res.status(201).json({
      success: true,
      message: 'Administrator erfolgreich erstellt',
      data: { admin },
    });
  });

  // PUT /api/admin/admins/:id - Admin güncelle
  updateAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const admin = await adminService.updateAdminForAdmin(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Administrator erfolgreich aktualisiert',
      data: { admin },
    });
  });

  // DELETE /api/admin/admins/:id - Admin sil
  deleteAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await adminService.deleteAdminForAdmin(id);

    res.status(200).json({
      success: true,
      message: result.message || 'Administrator erfolgreich gelöscht',
      data: result,
    });
  });

  // POST /api/admin/products/bulk-update-prices - Toplu fiyat güncelleme
  bulkUpdatePrices = asyncHandler(async (req, res) => {
    const { type, categoryId, productIds, adjustmentType, adjustmentValue, includeVariants, updateType, temporaryPriceEndDate } = req.body;

    // Ürün fiyatlarını güncelle
    const productResult = await productService.bulkUpdatePrices({
      type,
      categoryId,
      productIds,
      adjustmentType,
      adjustmentValue,
      updateType,
      temporaryPriceEndDate,
      includeVariants,
    });

    let variantResult = { updatedCount: 0 };

    // Varyant fiyatlarını da güncelle (eğer istenmişse)
    // Not: Varyantlar için şu an sadece kalıcı güncelleme destekleniyor
    if (includeVariants && updateType === 'permanent') {
      variantResult = await productService.bulkUpdateVariantPrices({
        type,
        categoryId,
        productIds,
        adjustmentType,
        adjustmentValue,
      });
    }

    res.status(200).json({
      success: true,
      message: updateType === 'temporary' 
        ? 'Temporäre Preise erfolgreich aktualisiert' 
        : 'Preise erfolgreich aktualisiert',
      data: {
        products: productResult,
        variants: variantResult,
        totalUpdated: productResult.updatedCount + variantResult.updatedCount,
        bulkUpdateId: productResult.bulkUpdateId,
      },
    });
  });

  // GET /api/admin/bulk-price-updates - Toplu fiyat güncellemelerini listele
  getBulkPriceUpdates = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, isReverted } = req.query;

    const result = await productService.getBulkPriceUpdates({
      page: parseInt(page),
      limit: parseInt(limit),
      isReverted: isReverted === 'true' ? true : isReverted === 'false' ? false : null,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // POST /api/admin/bulk-price-updates/:id/revert - Toplu fiyat güncellemesini geri al
  revertBulkPriceUpdate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin?.id; // Admin middleware'den geliyor

    if (!adminId) {
      throw new Error('Admin ID bulunamadı');
    }

    const result = await productService.revertBulkPriceUpdate(id, adminId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { revertedCount: result.revertedCount },
    });
  });

  // ===============================
  // TASK MANAGEMENT
  // ===============================

  // GET /api/admin/tasks - Eksik bilgileri olan ürünleri kategorilere göre getir
  getTasks = asyncHandler(async (req, res) => {
    const { category } = req.query;

    const tasks = await taskService.getTasks();

    // Eğer belirli bir kategori filtrelenmişse, sadece o kategoriyi döndür
    if (category && tasks[category]) {
      return res.status(200).json({
        success: true,
        data: {
          [category]: tasks[category],
        },
      });
    }

    res.status(200).json({
      success: true,
      data: tasks,
    });
  });

  // POST /api/admin/tasks/ignore - Ürün için kategoriyi görmezden gel
  ignoreTask = asyncHandler(async (req, res) => {
    const { productId, category } = req.body;

    if (!productId || !category) {
      return res.status(400).json({
        success: false,
        message: 'productId und category sind erforderlich',
      });
    }

    const ignore = await taskService.ignoreTask(productId, category);

    res.status(201).json({
      success: true,
      message: 'Aufgabe erfolgreich ignoriert',
      data: { ignore },
    });
  });

  // DELETE /api/admin/tasks/ignore/:id - Görmezden gelme kaydını kaldır
  removeIgnore = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const ignore = await taskService.removeIgnore(id);

    res.status(200).json({
      success: true,
      message: 'Ignore-Eintrag erfolgreich entfernt',
      data: { ignore },
    });
  });
}

export default new AdminController();
