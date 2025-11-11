import * as supplierService from '../services/supplier.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

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
  const { email } = req.body;
  const adminId = req.admin.id;

  const supplierEmail = await supplierService.addSupplierEmail(email, adminId);

  res.status(201).json({
    success: true,
    data: supplierEmail,
  });
});

