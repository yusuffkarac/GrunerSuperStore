import * as supplierService from '../services/supplier.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

/**
 * Supplier email'lerini getir
 * GET /api/admin/suppliers/emails
 */
export const getSupplierEmails = asyncHandler(async (req, res) => {
  const emails = await supplierService.getSupplierEmails();

  res.json({
    success: true,
    data: emails,
  });
});

/**
 * Yeni supplier email ekle
 * POST /api/admin/suppliers/emails
 */
export const addSupplierEmail = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const adminId = req.admin.id;

  const supplierEmail = await supplierService.addSupplierEmail(name, email, adminId);

  // Log kaydı
  await activityLogService.createLog({
    adminId,
    action: 'supplier.create',
    entityType: 'supplier',
    entityId: supplierEmail.id,
    level: 'success',
    message: `Lieferant wurde hinzugefügt: ${name} (${email})`,
    metadata: { supplierId: supplierEmail.id, name, email },
    req,
  });

  res.status(201).json({
    success: true,
    data: supplierEmail,
  });
});

