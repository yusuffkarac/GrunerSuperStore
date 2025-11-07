import barcodeLabelService from '../services/barcode-label.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class BarcodeLabelController {
  // ===============================
  // ADMIN ENDPOINTS
  // ===============================

  // GET /api/admin/barcode-labels - Tüm barkod etiketlerini listele
  getAllBarcodeLabels = asyncHandler(async (req, res) => {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await barcodeLabelService.getAllBarcodeLabels(filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/admin/barcode-labels/:id - Tek barkod etiketi getir
  getBarcodeLabelById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const label = await barcodeLabelService.getBarcodeLabelById(id);

    res.status(200).json({
      success: true,
      data: { label },
    });
  });

  // POST /api/admin/barcode-labels/by-ids - Birden fazla barkod etiketi getir
  getBarcodeLabelsByIds = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const labels = await barcodeLabelService.getBarcodeLabelsByIds(ids);

    res.status(200).json({
      success: true,
      data: { labels },
    });
  });

  // POST /api/admin/barcode-labels - Barkod etiketi oluştur
  createBarcodeLabel = asyncHandler(async (req, res) => {
    const label = await barcodeLabelService.createBarcodeLabel(req.body);

    res.status(201).json({
      success: true,
      data: { label },
      message: 'Barkod etiketi başarıyla oluşturuldu',
    });
  });

  // PUT /api/admin/barcode-labels/:id - Barkod etiketi güncelle
  updateBarcodeLabel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const label = await barcodeLabelService.updateBarcodeLabel(id, req.body);

    res.status(200).json({
      success: true,
      data: { label },
      message: 'Barkod etiketi başarıyla güncellendi',
    });
  });

  // DELETE /api/admin/barcode-labels/:id - Barkod etiketi sil
  deleteBarcodeLabel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await barcodeLabelService.deleteBarcodeLabel(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // POST /api/admin/barcode-labels/bulk-delete - Toplu barkod etiketi sil
  bulkDeleteBarcodeLabels = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const result = await barcodeLabelService.deleteBarcodeLabels(ids);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { deletedCount: result.deletedCount },
    });
  });
}

export default new BarcodeLabelController();
