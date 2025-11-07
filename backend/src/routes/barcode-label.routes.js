import express from 'express';
import barcodeLabelController from '../controllers/barcode-label.controller.js';
import { authenticateAdmin } from '../middleware/admin.js';
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
router.get('/', barcodeLabelController.getAllBarcodeLabels);

// GET /api/admin/barcode-labels/:id - Tek barkod etiketi getir
router.get('/:id', barcodeLabelController.getBarcodeLabelById);

// POST /api/admin/barcode-labels/by-ids - Birden fazla barkod etiketi getir
router.post(
  '/by-ids',
  getBarcodeLabelsByIdsValidation,
  validate,
  barcodeLabelController.getBarcodeLabelsByIds
);

// POST /api/admin/barcode-labels - Barkod etiketi oluştur
router.post(
  '/',
  createBarcodeLabelValidation,
  validate,
  barcodeLabelController.createBarcodeLabel
);

// PUT /api/admin/barcode-labels/:id - Barkod etiketi güncelle
router.put(
  '/:id',
  updateBarcodeLabelValidation,
  validate,
  barcodeLabelController.updateBarcodeLabel
);

// DELETE /api/admin/barcode-labels/:id - Barkod etiketi sil
router.delete('/:id', barcodeLabelController.deleteBarcodeLabel);

// POST /api/admin/barcode-labels/bulk-delete - Toplu barkod etiketi sil
router.post(
  '/bulk-delete',
  bulkDeleteBarcodeLabelValidation,
  validate,
  barcodeLabelController.bulkDeleteBarcodeLabels
);

export default router;
