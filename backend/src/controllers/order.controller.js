import orderService from '../services/order.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class OrderController {
  // POST /api/orders - Sipariş oluştur
  createOrder = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const orderData = req.body;

    const order = await orderService.createOrder(userId, orderData);

    // Mail gönderimini asenkron başlat (response'u bekletmemek için)
    orderService.sendOrderEmails(order).catch((err) => {
      console.error('Mail gönderim hatası:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Bestellung erfolgreich aufgegeben',
      data: { order },
    });
  });

  // GET /api/orders - Kullanıcının siparişlerini listele
  getOrders = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const filters = {
      status: req.query.status,
      type: req.query.type,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await orderService.getOrders(userId, filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/orders/:id - Sipariş detayı
  getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await orderService.getOrderById(id, userId);

    res.status(200).json({
      success: true,
      data: { order },
    });
  });

  // PUT /api/orders/:id/cancel - Sipariş iptal et
  cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await orderService.cancelOrder(id, userId);

    res.status(200).json({
      success: true,
      message: 'Bestellung erfolgreich storniert',
      data: { order },
    });
  });

  // ===============================
  // ADMIN ENDPOINTS
  // ===============================

  // GET /api/orders/admin/all - Tüm siparişleri listele (Admin)
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

  // PUT /api/orders/:id/status - Sipariş durumu güncelle (Admin)
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

  // GET /api/orders/admin/stats - Sipariş istatistikleri (Admin)
  getOrderStats = asyncHandler(async (req, res) => {
    const stats = await orderService.getOrderStats();

    res.status(200).json({
      success: true,
      data: { stats },
    });
  });

  // ===============================
  // REVIEW ENDPOINTS
  // ===============================

  // POST /api/orders/:id/review - Sipariş için review oluştur
  createReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    const review = await orderService.createReview(id, userId, { rating, comment });

    res.status(201).json({
      success: true,
      message: 'Bewertung erfolgreich erstellt',
      data: { review },
    });
  });

  // GET /api/orders/:id/review - Sipariş review'ını getir
  getReview = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const review = await orderService.getReview(id);

    res.status(200).json({
      success: true,
      data: { review },
    });
  });
}

export default new OrderController();
