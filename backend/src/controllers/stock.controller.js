import * as stockService from '../services/stock.service.js';
import stockPdfService from '../services/stock-pdf.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

/**
 * Kritik stoklu ürünleri getir
 * GET /api/admin/stock/low-stock
 */
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await stockService.getLowStockProducts();
  res.json(products);
});

/**
 * Sipariş geçmişini getir
 * GET /api/admin/stock/history
 */
export const getStockOrderHistory = asyncHandler(async (req, res) => {
  const { productId, status, limit, offset, date } = req.query;

  const result = await stockService.getStockOrderHistory({
    productId,
    status,
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : undefined,
    date,
  });

  res.json(result);
});

/**
 * Yeni sipariş oluştur
 * POST /api/admin/stock/order/:productId
 */
export const createStockOrder = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { orderQuantity, expectedDeliveryDate, note, status } = req.body;
  const adminId = req.admin.id;

  const order = await stockService.createStockOrder(productId, adminId, {
    orderQuantity,
    expectedDeliveryDate,
    note,
    status, // Status parametresini ekle
  });

  // Log kaydı
  await activityLogService.createLog({
    adminId,
    action: 'stock.order.create',
    entityType: 'stock_order',
    entityId: order.id,
    level: 'success',
    message: `Lagerbestellung wurde erstellt: Produkt ${productId} (Menge: ${orderQuantity})`,
    metadata: { orderId: order.id, productId, orderQuantity, status },
    req,
  });

  res.status(201).json({
    success: true,
    data: order,
  });
});

/**
 * Sipariş durumunu güncelle
 * PUT /api/admin/stock/order/:orderId/status
 */
export const updateStockOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, expectedDeliveryDate, actualDeliveryDate, note, orderQuantity } = req.body;
  const adminId = req.admin.id;

  const order = await stockService.updateStockOrderStatus(orderId, status, adminId, {
    expectedDeliveryDate,
    actualDeliveryDate,
    note,
    orderQuantity, // Miktar parametresini ekle
  });

  // Log kaydı
  await activityLogService.createLog({
    adminId,
    action: 'stock.order.update',
    entityType: 'stock_order',
    entityId: order.id,
    level: 'info',
    message: `Lagerbestellung Status wurde aktualisiert: ${orderId} → ${status}`,
    metadata: { orderId: order.id, status, previousStatus: order.previousStatus },
    req,
  });

  res.json({
    success: true,
    data: order,
  });
});

/**
 * Siparişi geri al
 * POST /api/admin/stock/order/:orderId/undo
 */
export const undoStockOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const adminId = req.admin.id;

  const order = await stockService.undoStockOrder(orderId, adminId);

  res.json({
    success: true,
    data: order,
  });
});

/**
 * Ürün tedarikçisini güncelle
 * PUT /api/admin/stock/product/:productId/supplier
 */
export const updateProductSupplier = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { supplier } = req.body;
  const adminId = req.admin.id;

  const product = await stockService.updateProductSupplier(productId, supplier);

  // Log kaydı
  await activityLogService.createLog({
    adminId,
    action: 'product.supplier.update',
    entityType: 'product',
    entityId: productId,
    level: 'info',
    message: `Produktlieferant wurde aktualisiert: Produkt ${productId} → ${supplier}`,
    metadata: { productId, supplier },
    req,
  });

  res.json({
    success: true,
    data: product,
  });
});

/**
 * Yeni sipariş listesi oluştur
 * POST /api/admin/stock/lists
 */
export const createStockOrderList = asyncHandler(async (req, res) => {
  const { name, note, supplierEmail, sendToAdmins, sendToSupplier, orders } = req.body;
  const adminId = req.admin.id;

  const orderList = await stockService.createStockOrderList(adminId, {
    name,
    note,
    supplierEmail,
    sendToAdmins,
    sendToSupplier,
    orders,
  });

  // Log kaydı
  await activityLogService.createLog({
    adminId,
    action: 'stock.list.create',
    entityType: 'stock_order_list',
    entityId: orderList.id,
    level: 'success',
    message: `Bestellliste wurde erstellt: ${name} (${orders?.length || 0} Bestellungen)`,
    metadata: { listId: orderList.id, name, orderCount: orders?.length || 0 },
    req,
  });

  res.status(201).json({
    success: true,
    data: orderList,
  });
});

/**
 * Sipariş listelerini getir
 * GET /api/admin/stock/lists
 */
export const getStockOrderLists = asyncHandler(async (req, res) => {
  const { status, limit, offset, date } = req.query;

  const result = await stockService.getStockOrderLists({
    status,
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : undefined,
    date,
  });

  res.json(result);
});

/**
 * Sipariş listesi detayını getir
 * GET /api/admin/stock/lists/:listId
 */
export const getStockOrderListById = asyncHandler(async (req, res) => {
  const { listId } = req.params;

  const orderList = await stockService.getStockOrderListById(listId);

  res.json({
    success: true,
    data: orderList,
  });
});

/**
 * Sipariş listesi durumunu güncelle
 * PUT /api/admin/stock/lists/:listId/status
 */
export const updateStockOrderListStatus = asyncHandler(async (req, res) => {
  const { listId } = req.params;
  const { status } = req.body;
  const adminId = req.admin.id;

  const orderList = await stockService.updateStockOrderListStatus(listId, status, adminId);

  res.json({
    success: true,
    data: orderList,
  });
});

/**
 * Sipariş listesi PDF'ini indir
 * GET /api/admin/stock/lists/:listId/pdf
 */
export const getStockOrderListPDF = asyncHandler(async (req, res) => {
  const { listId } = req.params;

  const pdfBuffer = await stockPdfService.generateStockOrderListPDF(listId);

  // Liste bilgisini al (dosya adı için)
  const orderList = await stockService.getStockOrderListById(listId);
  const fileName = `Bestellliste-${orderList.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date(orderList.createdAt).toISOString().split('T')[0]}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.send(pdfBuffer);
});

/**
 * Sipariş listesini sil
 * DELETE /api/admin/stock/lists/:listId
 */
export const deleteStockOrderList = asyncHandler(async (req, res) => {
  const { listId } = req.params;
  const adminId = req.admin.id;

  await stockService.deleteStockOrderList(listId, adminId);

  // Log kaydı
  await activityLogService.createLog({
    adminId,
    action: 'stock.list.delete',
    entityType: 'stock_order_list',
    entityId: listId,
    level: 'warning',
    message: `Bestellliste wurde gelöscht: ${listId}`,
    metadata: { listId },
    req,
  });

  res.json({
    success: true,
    message: 'Bestellliste erfolgreich gelöscht',
  });
});

