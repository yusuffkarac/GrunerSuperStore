import orderService from '../services/order.service.js';
import invoiceService from '../services/invoice.service.js';
import queueService from '../services/queue.service.js';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

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

  // ===============================
  // INVOICE ENDPOINTS
  // ===============================

  // GET /api/orders/:id/invoice - Fatura PDF'ini indir
  getInvoicePDF = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Support both user and admin tokens (from authenticateFlexible middleware)
    const userId = req.user?.id || null;
    const isAdmin = req.isAdmin === true || req.admin?.role === 'admin';

    // Sipariş kontrolü - kullanıcı kendi siparişini veya admin tüm siparişleri görebilir
    const order = await orderService.getOrderById(id, userId, isAdmin);

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    // Müşteri ise, admin'in invoice gönderip göndermediğini kontrol et
    if (!isAdmin && userId) {
      // Email log'da bu sipariş için invoice email'i gönderilmiş mi kontrol et
      // Prisma JSON field query için PostgreSQL JSON path syntax kullanıyoruz
      const invoiceEmail = await prisma.$queryRaw`
        SELECT id FROM email_logs
        WHERE template = 'invoice'
        AND status = 'sent'
        AND metadata->>'orderId' = ${id}
        LIMIT 1
      `;

      if (!invoiceEmail || invoiceEmail.length === 0) {
        throw new ForbiddenError('Rechnung wurde noch nicht freigegeben. Bitte warten Sie auf die Bestätigung des Administrators.');
      }
    }

    // PDF oluştur
    const pdfBuffer = await invoiceService.generateInvoicePDF(id);

    // PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Rechnung-${order.orderNo}.pdf"`
    );
    res.send(pdfBuffer);
  });

  // POST /api/orders/admin/:id/send-invoice - Müşteriye fatura gönder (Admin)
  sendInvoice = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Sipariş bilgilerini getir
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    // PDF oluştur
    const pdfBuffer = await invoiceService.generateInvoicePDF(id);

    // Buffer'ı base64 string'e çevir (queue serialize için)
    const pdfBase64 = pdfBuffer.toString('base64');

    // Mail gönder (attachment ile)
    await queueService.addEmailJob({
      to: order.user.email,
      subject: `Rechnung für Bestellung ${order.orderNo}`,
      template: 'invoice',
      data: {
        firstName: order.user.firstName,
        lastName: order.user.lastName,
        orderNo: order.orderNo,
        orderDate: new Date(order.createdAt).toLocaleString('de-DE'),
        total: parseFloat(order.total).toFixed(2),
      },
      attachments: [
        {
          filename: `Rechnung-${order.orderNo}.pdf`,
          content: pdfBase64, // Base64 string olarak gönder
          contentType: 'application/pdf',
        },
      ],
      metadata: { orderId: order.id, type: 'invoice' },
      priority: 2,
    });

    res.status(200).json({
      success: true,
      message: 'Rechnung wurde erfolgreich per E-Mail versendet',
    });
  });

  // GET /api/orders/:id/delivery-slip - Kurye için teslimat slip PDF'ini indir
  getDeliverySlipPDF = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Admin routes'da olduğu için admin olduğunu biliyoruz
    // Sipariş kontrolü - admin tüm siparişleri görebilir
    const order = await orderService.getOrderById(id, null, true);

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    // PDF oluştur
    const pdfBuffer = await invoiceService.generateDeliverySlipPDF(id);

    // PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Lieferschein-${order.orderNo}.pdf"`
    );
    res.send(pdfBuffer);
  });
}

export default new OrderController();
