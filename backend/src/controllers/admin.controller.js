import adminService from '../services/admin.service.js';
import orderService from '../services/order.service.js';
import productService from '../services/product.service.js';
import categoryService from '../services/category.service.js';
import userService from '../services/user.service.js';
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
}

export default new AdminController();
