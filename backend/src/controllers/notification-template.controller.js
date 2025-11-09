import notificationTemplateService from '../services/notification-template.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Notification Template Controller
 * Notification template yönetimi için API endpoint'leri
 */
class NotificationTemplateController {
  /**
   * GET /api/admin/notification-templates
   * Tüm template'leri listele
   */
  getAllTemplates = asyncHandler(async (req, res) => {
    const templates = await notificationTemplateService.getAllTemplates();

    res.status(200).json({
      success: true,
      data: templates,
    });
  });

  /**
   * GET /api/admin/notification-templates/:name
   * Tek template getir
   */
  getTemplate = asyncHandler(async (req, res) => {
    const { name } = req.params;

    const template = await notificationTemplateService.getTemplate(name);

    res.status(200).json({
      success: true,
      data: template,
    });
  });

  /**
   * PUT /api/admin/notification-templates/:name
   * Template güncelle
   */
  updateTemplate = asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title und Message sind erforderlich',
      });
    }

    const template = await notificationTemplateService.updateTemplate(name, { title, message });

    res.status(200).json({
      success: true,
      message: 'Template erfolgreich aktualisiert',
      data: template,
    });
  });

  /**
   * POST /api/admin/notification-templates/:name/preview
   * Template preview
   */
  previewTemplate = asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title und Message sind erforderlich',
      });
    }

    const preview = await notificationTemplateService.previewTemplate(name, { title, message });

    res.status(200).json({
      success: true,
      data: preview,
    });
  });

  /**
   * POST /api/admin/notification-templates/:name/reset
   * Template'i varsayılan haline reset et
   */
  resetTemplate = asyncHandler(async (req, res) => {
    const { name } = req.params;

    const template = await notificationTemplateService.resetTemplate(name);

    res.status(200).json({
      success: true,
      message: 'Template erfolgreich zurückgesetzt',
      data: template,
    });
  });
}

export default new NotificationTemplateController();

