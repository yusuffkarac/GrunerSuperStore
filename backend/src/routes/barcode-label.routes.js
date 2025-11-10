import express from 'express';
import barcodeLabelController from '../controllers/barcode-label.controller.js';
import { authenticateAdmin, requirePermission } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import {
  createBarcodeLabelValidation,
  updateBarcodeLabelValidation,
  getBarcodeLabelsByIdsValidation,
  bulkDeleteBarcodeLabelValidation,
} from '../validators/barcode-label.validators.js';

const router = express.Router();

// ===============================
// PROTECTED ENDPOINTS (Admin Only)
// ===============================

// Admin authentication gerekli
router.use(authenticateAdmin);

// GET /api/admin/barcode-labels - Tüm barkod etiketlerini listele
router.get('/', requirePermission('barcode_label_view'), barcodeLabelController.getAllBarcodeLabels);

// GET /api/admin/barcode-labels/:id - Tek barkod etiketi getir
router.get('/:id', requirePermission('barcode_label_view'), barcodeLabelController.getBarcodeLabelById);

// POST /api/admin/barcode-labels/by-ids - Birden fazla barkod etiketi getir
router.post(
  '/by-ids',
  requirePermission('barcode_label_view'),
  getBarcodeLabelsByIdsValidation,
  validate,
  barcodeLabelController.getBarcodeLabelsByIds
);

// POST /api/admin/barcode-labels - Barkod etiketi oluştur
router.post(
  '/',
  requirePermission('barcode_label_create'),
  createBarcodeLabelValidation,
  validate,
  barcodeLabelController.createBarcodeLabel
);

// PUT /api/admin/barcode-labels/:id - Barkod etiketi güncelle
router.put(
  '/:id',
  requirePermission('barcode_label_edit'),
  updateBarcodeLabelValidation,
  validate,
  barcodeLabelController.updateBarcodeLabel
);

// DELETE /api/admin/barcode-labels/:id - Barkod etiketi sil
router.delete('/:id', requirePermission('barcode_label_delete'), barcodeLabelController.deleteBarcodeLabel);

// POST /api/admin/barcode-labels/bulk-delete - Toplu barkod etiketi sil
router.post(
  '/bulk-delete',
  requirePermission('barcode_label_delete'),
  bulkDeleteBarcodeLabelValidation,
  validate,
  barcodeLabelController.bulkDeleteBarcodeLabels
);

export default router;
