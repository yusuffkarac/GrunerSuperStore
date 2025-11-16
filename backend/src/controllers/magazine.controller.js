import magazineService from '../services/magazine.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

class MagazineController {
  // GET /api/magazines/active - Public endpoint (Kullanıcılar için aktif dergiler)
  getActiveMagazines = asyncHandler(async (req, res) => {
    const magazines = await magazineService.getActiveMagazines();

    res.status(200).json({
      success: true,
      data: { magazines },
    });
  });

  // GET /api/admin/magazines - Admin endpoint (Tüm dergiler)
  getAllMagazines = asyncHandler(async (req, res) => {
    const magazines = await magazineService.getAllMagazines();

    res.status(200).json({
      success: true,
      data: { magazines },
    });
  });

  // GET /api/admin/magazines/:id - Admin endpoint (Tek dergi detayı)
  getMagazineById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const magazine = await magazineService.getMagazineById(id);

    res.status(200).json({
      success: true,
      data: { magazine },
    });
  });

  // POST /api/admin/magazines - Admin endpoint (Yeni dergi oluştur)
  createMagazine = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const { title, pdfUrl, startDate, endDate, isActive } = req.body;

    // pdfUrl'i extract et - obje ise data.url'den, string ise direkt kullan
    let extractedPdfUrl = pdfUrl;
    if (pdfUrl && typeof pdfUrl === 'object' && pdfUrl.data && pdfUrl.data.url) {
      extractedPdfUrl = pdfUrl.data.url;
    } else if (pdfUrl && typeof pdfUrl === 'object' && pdfUrl.url) {
      extractedPdfUrl = pdfUrl.url;
    }

    // Validasyon
    if (!title || !extractedPdfUrl || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Titel, PDF-URL, Startdatum und Enddatum sind erforderlich',
      });
    }

    const magazine = await magazineService.createMagazine({
      title,
      pdfUrl: extractedPdfUrl,
      startDate,
      endDate,
      isActive,
    });

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'magazine.create',
      entityType: 'magazine',
      entityId: magazine.id,
      level: 'info',
      message: `Neues Magazin erstellt: ${title}`,
      metadata: { magazineId: magazine.id, title, startDate, endDate },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Magazin erfolgreich erstellt',
      data: { magazine },
    });
  });

  // PUT /api/admin/magazines/:id - Admin endpoint (Dergi güncelle)
  updateMagazine = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const { id } = req.params;
    const { title, pdfUrl, startDate, endDate, isActive } = req.body;

    // pdfUrl'i extract et - obje ise data.url'den, string ise direkt kullan
    let extractedPdfUrl = pdfUrl;
    if (pdfUrl && typeof pdfUrl === 'object' && pdfUrl.data && pdfUrl.data.url) {
      extractedPdfUrl = pdfUrl.data.url;
    } else if (pdfUrl && typeof pdfUrl === 'object' && pdfUrl.url) {
      extractedPdfUrl = pdfUrl.url;
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (extractedPdfUrl !== undefined) updateData.pdfUrl = extractedPdfUrl;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (isActive !== undefined) updateData.isActive = isActive;

    const magazine = await magazineService.updateMagazine(id, updateData);

    // Log kaydı
    const changedFields = Object.keys(req.body).filter(key => req.body[key] !== undefined);
    await activityLogService.createLog({
      adminId,
      action: 'magazine.update',
      entityType: 'magazine',
      entityId: magazine.id,
      level: 'info',
      message: `Magazin aktualisiert: ${magazine.title}`,
      metadata: { magazineId: magazine.id, changedFields },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Magazin erfolgreich aktualisiert',
      data: { magazine },
    });
  });

  // DELETE /api/admin/magazines/:id - Admin endpoint (Dergi sil)
  deleteMagazine = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const { id } = req.params;

    // Silmeden önce dergi bilgisini al (log için)
    const magazine = await magazineService.getMagazineById(id);

    await magazineService.deleteMagazine(id);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'magazine.delete',
      entityType: 'magazine',
      entityId: id,
      level: 'warning',
      message: `Magazin gelöscht: ${magazine.title}`,
      metadata: { magazineId: id, title: magazine.title },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Magazin erfolgreich gelöscht',
    });
  });

  // PATCH /api/admin/magazines/:id/toggle - Admin endpoint (Aktif/Pasif değiştir)
  toggleActive = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const { id } = req.params;

    const magazine = await magazineService.toggleActive(id);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'magazine.toggle',
      entityType: 'magazine',
      entityId: magazine.id,
      level: 'info',
      message: `Magazin ${magazine.isActive ? 'aktiviert' : 'deaktiviert'}: ${magazine.title}`,
      metadata: { magazineId: magazine.id, isActive: magazine.isActive },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Magazin erfolgreich ${magazine.isActive ? 'aktiviert' : 'deaktiviert'}`,
      data: { magazine },
    });
  });
}

export default new MagazineController();
