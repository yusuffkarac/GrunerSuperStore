import adminService from '../services/admin.service.js';
import orderService from '../services/order.service.js';
import productService from '../services/product.service.js';
import categoryService from '../services/category.service.js';
import userService from '../services/user.service.js';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

class AdminController {
  // POST /api/admin/auth/login - Admin girişi
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await adminService.login({ email, password });

    // Log kaydı
    if (result.admin) {
      await activityLogService.createLog({
        adminId: result.admin.id,
        action: 'admin.login',
        entityType: 'admin',
        entityId: result.admin.id,
        level: 'success',
        message: `Administrator hat sich angemeldet: ${email}`,
        metadata: { email },
        req,
      });
    }

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

  // GET /api/admin/dashboard/trends - Dashboard trend verileri
  getDashboardTrends = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const trends = await adminService.getDashboardTrends(startDate, endDate);

    res.status(200).json({
      success: true,
      data: { trends },
    });
  });

  // GET /api/admin/dashboard/top-products - En çok satan ürünler
  getTopSellingProducts = asyncHandler(async (req, res) => {
    const { limit, startDate, endDate } = req.query;

    const products = await adminService.getTopSellingProducts(limit, startDate, endDate);

    res.status(200).json({
      success: true,
      data: { products },
    });
  });

  // GET /api/admin/dashboard/category-stats - Kategori istatistikleri
  getCategoryStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const stats = await adminService.getCategoryStats(startDate, endDate);

    res.status(200).json({
      success: true,
      data: { stats },
    });
  });

  // GET /api/admin/dashboard/order-status-distribution - Sipariş durumu dağılımı
  getOrderStatusDistribution = asyncHandler(async (req, res) => {
    const distribution = await adminService.getOrderStatusDistribution();

    res.status(200).json({
      success: true,
      data: { distribution },
    });
  });

  // GET /api/admin/dashboard/revenue-stats - Gelir istatistikleri
  getRevenueStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const stats = await adminService.getRevenueStats(startDate, endDate);

    res.status(200).json({
      success: true,
      data: { stats },
    });
  });

  // GET /api/admin/dashboard/daily-order-counts - Günlük sipariş sayıları
  getDailyOrderCounts = asyncHandler(async (req, res) => {
    const { days } = req.query;

    const counts = await adminService.getDailyOrderCounts(days || 7);

    res.status(200).json({
      success: true,
      data: { counts },
    });
  });

  // GET /api/admin/dashboard/hourly-distribution - Saatlik sipariş dağılımı
  getHourlyOrderDistribution = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const distribution = await adminService.getHourlyOrderDistribution(startDate, endDate);

    res.status(200).json({
      success: true,
      data: { distribution },
    });
  });

  // GET /api/admin/dashboard/customer-growth - Müşteri büyümesi trendi
  getCustomerGrowthTrend = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const trend = await adminService.getCustomerGrowthTrend(startDate, endDate);

    res.status(200).json({
      success: true,
      data: { trend },
    });
  });

  // GET /api/admin/dashboard/cancellation-rate - İptal oranı trendi
  getCancellationRateTrend = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const trend = await adminService.getCancellationRateTrend(startDate, endDate);

    res.status(200).json({
      success: true,
      data: { trend },
    });
  });

  // GET /api/admin/dashboard/top-customers - En aktif müşteriler
  getTopCustomers = asyncHandler(async (req, res) => {
    const { limit, startDate, endDate } = req.query;

    const customers = await adminService.getTopCustomers(limit, startDate, endDate);

    res.status(200).json({
      success: true,
      data: { customers },
    });
  });

  // GET /api/admin/dashboard/order-completion-time - Sipariş tamamlama süresi
  getOrderCompletionTime = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const data = await adminService.getOrderCompletionTime(startDate, endDate);

    res.status(200).json({
      success: true,
      data,
    });
  });

  // GET /api/admin/dashboard/monthly-comparison - Aylık karşılaştırma
  getMonthlyComparison = asyncHandler(async (req, res) => {
    const comparison = await adminService.getMonthlyComparison();

    res.status(200).json({
      success: true,
      data: { comparison },
    });
  });

  // GET /api/admin/dashboard/average-cart-value - Ortalama sepet değeri trendi
  getAverageCartValueTrend = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const trend = await adminService.getAverageCartValueTrend(startDate, endDate);

    res.status(200).json({
      success: true,
      data: { trend },
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
    const adminId = req.admin?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht autorisiert',
      });
    }

    const order = await orderService.updateOrderStatus(id, status);

    // Log kaydı - asenkron yap (fire-and-forget)
    activityLogService.createLog({
      adminId,
      action: 'order.update_status',
      entityType: 'order',
      entityId: order.id,
      level: 'info',
      message: `Bestellstatus wurde aktualisiert: ${order.orderNo} → ${status}`,
      metadata: { 
        orderNo: order.orderNo, 
        orderId: order.id,
        oldStatus: order.previousStatus || order.status, 
        newStatus: status 
      },
      req,
    }).catch((logError) => {
      console.error('❌ [ADMIN.ORDER.UPDATE_STATUS] Log kaydı hatası (async):', {
        error: logError.message || logError,
        adminId,
        orderId: order.id,
        status,
      });
    });

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
    const adminId = req.admin?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht autorisiert',
      });
    }

    const order = await orderService.adminCancelOrder(id, cancellationData);

    // Log kaydı - asenkron yap (fire-and-forget)
    activityLogService.createLog({
      adminId,
      action: 'order.cancel',
      entityType: 'order',
      entityId: order.id,
      level: 'warning',
      message: `Bestellung wurde storniert: ${order.orderNo}`,
      metadata: { 
        orderNo: order.orderNo, 
        orderId: order.id,
        cancellationReason: cancellationData.cancellationReason || null,
        showReasonToCustomer: cancellationData.showCancellationReasonToCustomer || false,
      },
      req,
    }).catch((logError) => {
      console.error('❌ [ADMIN.ORDER.CANCEL] Log kaydı hatası (async):', {
        error: logError.message || logError,
        adminId,
        orderId: order.id,
      });
    });

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
    const adminId = req.admin.id;
    const product = await productService.createProduct(req.body);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'product.create',
      entityType: 'product',
      entityId: product.id,
      level: 'success',
      message: `Produkt wurde erstellt: ${product.name} (ID: ${product.id}${product.barcode ? `, Barcode: ${product.barcode}` : ''})`,
      metadata: { productId: product.id, name: product.name, price: product.price, barcode: product.barcode },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Produkt erfolgreich erstellt',
      data: { product },
    });
  });

  // PUT /api/admin/products/:id - Ürün güncelle
  updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin.id;

    const product = await productService.updateProduct(id, req.body);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'product.update',
      entityType: 'product',
      entityId: product.id,
      level: 'info',
      message: `Produkt wurde aktualisiert: ${product.name} (ID: ${product.id}${product.barcode ? `, Barcode: ${product.barcode}` : ''})`,
      metadata: { productId: product.id, name: product.name, barcode: product.barcode },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Produkt erfolgreich aktualisiert',
      data: { product },
    });
  });

  // DELETE /api/admin/products/:id - Ürün sil
  deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Silmeden önce product bilgisini al (log için)
    const productBeforeDelete = await productService.getProductById(id);
    
    const result = await productService.deleteProduct(id);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'product.delete',
      entityType: 'product',
      entityId: id,
      level: 'warning',
      message: `Produkt wurde gelöscht: ${productBeforeDelete.name} (ID: ${id}${productBeforeDelete.barcode ? `, Barcode: ${productBeforeDelete.barcode}` : ''})`,
      metadata: { productId: id, name: productBeforeDelete.name, barcode: productBeforeDelete.barcode },
      req,
    });

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
    const adminId = req.admin.id;
    const category = await categoryService.createCategory(req.body);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'category.create',
      entityType: 'category',
      entityId: category.id,
      level: 'success',
      message: `Kategorie wurde erstellt: ${category.name} (${category.id})`,
      metadata: { categoryId: category.id, name: category.name },
      req,
    });

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
  // USER ADDRESS MANAGEMENT
  // ===============================

  // POST /api/admin/users/:userId/addresses - Kullanıcıya adres ekle
  createUserAddress = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const adminId = req.admin.id;
    const addressData = req.body;

    const address = await userService.createAddress(userId, addressData);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'admin.create_user_address',
      entityType: 'address',
      entityId: address.id,
      level: 'info',
      message: `Adresse für Benutzer hinzugefügt: ${address.street} ${address.houseNumber}, ${address.city}`,
      metadata: { addressId: address.id, userId, city: address.city },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Adresse erfolgreich hinzugefügt',
      data: { address },
    });
  });

  // PUT /api/admin/users/:userId/addresses/:addressId - Kullanıcı adresini güncelle
  updateUserAddress = asyncHandler(async (req, res) => {
    const { userId, addressId } = req.params;
    const adminId = req.admin.id;
    const addressData = req.body;

    const address = await userService.updateAddress(userId, addressId, addressData);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'admin.update_user_address',
      entityType: 'address',
      entityId: address.id,
      level: 'info',
      message: `Adresse für Benutzer aktualisiert: ${address.street} ${address.houseNumber}, ${address.city}`,
      metadata: { addressId: address.id, userId, city: address.city },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Adresse erfolgreich aktualisiert',
      data: { address },
    });
  });

  // DELETE /api/admin/users/:userId/addresses/:addressId - Kullanıcı adresini sil
  deleteUserAddress = asyncHandler(async (req, res) => {
    const { userId, addressId } = req.params;
    const adminId = req.admin.id;

    // Silmeden önce adres bilgisini al (log için)
    const addressBeforeDelete = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!addressBeforeDelete) {
      return res.status(404).json({
        success: false,
        message: 'Adresse nicht gefunden',
      });
    }

    await userService.deleteAddress(userId, addressId);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'admin.delete_user_address',
      entityType: 'address',
      entityId: addressId,
      level: 'warning',
      message: `Adresse für Benutzer gelöscht: ${addressBeforeDelete.street} ${addressBeforeDelete.houseNumber}, ${addressBeforeDelete.city}`,
      metadata: { addressId, userId, city: addressBeforeDelete.city },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Adresse erfolgreich gelöscht',
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
    if (includeVariants && updateType === 'permanent') { // Variants sadece permanent updates için
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

  // GET /api/admin/bulk-price-updates - Toplu fiyat güncellemelerini getir
  getBulkPriceUpdates = asyncHandler(async (req, res) => {
    const { page, limit, filter } = req.query;

    const result = await productService.getBulkPriceUpdates({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      filter: filter || 'all',
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // POST /api/admin/bulk-price-updates/:id/revert - Toplu fiyat güncellemesini geri al
  revertBulkPriceUpdate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin.id;

    const result = await productService.revertBulkPriceUpdate(id, adminId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // PUT /api/admin/bulk-price-updates/:id/end-date - Toplu fiyat güncellemesinin bitiş tarihini güncelle
  updateBulkPriceUpdateEndDate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { temporaryPriceEndDate } = req.body;

    if (!temporaryPriceEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Enddatum ist erforderlich',
      });
    }

    const result = await productService.updateBulkPriceUpdateEndDate(id, temporaryPriceEndDate);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // GET /api/admin/products/missing-data - Eksik bilgisi olan ürünleri getir
  getProductsWithMissingData = asyncHandler(async (req, res) => {
    const { missingType, page, limit, search, categoryId } = req.query;

    if (!missingType) {
      return res.status(400).json({
        success: false,
        message: 'missingType parametresi gereklidir',
      });
    }

    const result = await productService.getProductsWithMissingData(missingType, {
      page,
      limit,
      search,
      categoryId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // POST /api/admin/products/:id/ignore-task - Ürünü görev tipinden muaf tut
  ignoreProductTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'category parametresi gereklidir',
      });
    }

    const result = await productService.ignoreProductTask(id, category);

    res.status(200).json({
      success: true,
      message: 'Ürün görev tipinden muaf tutuldu',
      data: { taskIgnore: result },
    });
  });

  // DELETE /api/admin/products/:id/ignore-task/:category - Ürünün muafiyetini kaldır
  unignoreProductTask = asyncHandler(async (req, res) => {
    const { id, category } = req.params;

    const result = await productService.unignoreProductTask(id, category);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // GET /api/admin/products/ignored - Gözardı edilen ürünleri getir
  getIgnoredProducts = asyncHandler(async (req, res) => {
    const { taskType, page, limit, search, categoryId } = req.query;

    const result = await productService.getIgnoredProducts(taskType || null, {
      page,
      limit,
      search,
      categoryId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}

export default new AdminController();
