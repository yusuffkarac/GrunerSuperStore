import faqService from '../services/faq.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

class FAQController {
  // GET /api/faqs/active - Public endpoint (Kullanıcılar için aktif FAQ'lar)
  getActiveFAQs = asyncHandler(async (req, res) => {
    const result = await faqService.getActiveFAQs();

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/admin/faqs - Admin endpoint (Tüm FAQ'lar)
  getAllFAQs = asyncHandler(async (req, res) => {
    const faqs = await faqService.getAllFAQs();

    res.status(200).json({
      success: true,
      data: { faqs },
    });
  });

  // GET /api/admin/faqs/:id - Admin endpoint (Tek FAQ detayı)
  getFAQById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const faq = await faqService.getFAQById(id);

    res.status(200).json({
      success: true,
      data: { faq },
    });
  });

  // POST /api/admin/faqs - Admin endpoint (Yeni FAQ oluştur)
  createFAQ = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const { question, answer, category, sortOrder, isActive } = req.body;

    // Validasyon
    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Frage und Antwort sind erforderlich',
      });
    }

    const faq = await faqService.createFAQ({
      question,
      answer,
      category,
      sortOrder,
      isActive,
    });

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'faq.create',
      entityType: 'faq',
      entityId: faq.id,
      level: 'info',
      message: `Neue FAQ erstellt: ${question.substring(0, 50)}...`,
      metadata: { faqId: faq.id, question: faq.question },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'FAQ erfolgreich erstellt',
      data: { faq },
    });
  });

  // PUT /api/admin/faqs/:id - Admin endpoint (FAQ güncelle)
  updateFAQ = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const { id } = req.params;
    const { question, answer, category, sortOrder, isActive } = req.body;

    const updateData = {};
    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (category !== undefined) updateData.category = category;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const faq = await faqService.updateFAQ(id, updateData);

    // Log kaydı
    const changedFields = Object.keys(req.body).filter(key => req.body[key] !== undefined);
    await activityLogService.createLog({
      adminId,
      action: 'faq.update',
      entityType: 'faq',
      entityId: faq.id,
      level: 'info',
      message: `FAQ aktualisiert: ${faq.question.substring(0, 50)}...`,
      metadata: { faqId: faq.id, changedFields },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'FAQ erfolgreich aktualisiert',
      data: { faq },
    });
  });

  // DELETE /api/admin/faqs/:id - Admin endpoint (FAQ sil)
  deleteFAQ = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const { id } = req.params;

    // Silmeden önce FAQ bilgisini al (log için)
    const faq = await faqService.getFAQById(id);

    await faqService.deleteFAQ(id);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'faq.delete',
      entityType: 'faq',
      entityId: id,
      level: 'warning',
      message: `FAQ gelöscht: ${faq.question.substring(0, 50)}...`,
      metadata: { faqId: id, question: faq.question },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'FAQ erfolgreich gelöscht',
    });
  });

  // PATCH /api/admin/faqs/:id/toggle - Admin endpoint (Aktif/Pasif değiştir)
  toggleActive = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const { id } = req.params;

    const faq = await faqService.toggleActive(id);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'faq.toggle',
      entityType: 'faq',
      entityId: faq.id,
      level: 'info',
      message: `FAQ ${faq.isActive ? 'aktiviert' : 'deaktiviert'}: ${faq.question.substring(0, 50)}...`,
      metadata: { faqId: faq.id, isActive: faq.isActive },
      req,
    });

    res.status(200).json({
      success: true,
      message: `FAQ erfolgreich ${faq.isActive ? 'aktiviert' : 'deaktiviert'}`,
      data: { faq },
    });
  });

  // POST /api/admin/faqs/reset-to-defaults - Admin endpoint (Default FAQ'ları yükle)
  resetToDefaults = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;

    const faqs = await faqService.resetToDefaults();

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'faq.reset_to_defaults',
      entityType: 'faq',
      entityId: null,
      level: 'info',
      message: `FAQ auf Standardeinstellungen zurückgesetzt: ${faqs.length} Standard-FAQs geladen`,
      metadata: { count: faqs.length },
      req,
    });

    res.status(200).json({
      success: true,
      message: `${faqs.length} Standard-FAQs erfolgreich geladen`,
      data: { faqs },
    });
  });

  // POST /api/admin/faqs/bulk-import - Admin endpoint (Bulk import)
  bulkImport = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const { faqs, replaceAll } = req.body;

    if (!faqs || !Array.isArray(faqs)) {
      return res.status(400).json({
        success: false,
        message: 'FAQ-Liste ist erforderlich',
      });
    }

    const results = await faqService.bulkImport(faqs, { replaceAll: replaceAll === true });

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'faq.bulk_import',
      entityType: 'faq',
      entityId: null,
      level: 'info',
      message: `FAQ Bulk Import: ${results.created} erstellt, ${results.errors.length} Fehler`,
      metadata: { created: results.created, errors: results.errors.length, replaceAll },
      req,
    });

    res.status(200).json({
      success: true,
      message: `${results.created} FAQ(s) erfolgreich importiert`,
      data: results,
    });
  });
}

export default new FAQController();

