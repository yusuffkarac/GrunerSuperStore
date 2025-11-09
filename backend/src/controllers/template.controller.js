import templateService from '../services/template.service.js';
import emailService from '../services/email.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Template Controller
 * Email template yönetimi için API endpoint'leri
 */
class TemplateController {
  /**
   * GET /api/admin/templates
   * Tüm template'leri listele
   */
  getAllTemplates = asyncHandler(async (req, res) => {
    const templates = await templateService.getAllTemplates();

    res.status(200).json({
      success: true,
      data: templates,
    });
  });

  /**
   * GET /api/admin/templates/:name
   * Tek template getir
   */
  getTemplate = asyncHandler(async (req, res) => {
    const { name } = req.params;

    const template = await templateService.getTemplate(name);

    res.status(200).json({
      success: true,
      data: template,
    });
  });

  /**
   * PUT /api/admin/templates/:name
   * Template güncelle
   */
  updateTemplate = asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { subject, body } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Subject ve body gereklidir',
      });
    }

    const template = await templateService.updateTemplate(name, { subject, body });

    // EmailService cache'ini temizle (template güncellendi)
    emailService.clearTemplateCache(name);

    res.status(200).json({
      success: true,
      message: 'Template başarıyla güncellendi',
      data: template,
    });
  });

  /**
   * POST /api/admin/templates/:name/preview
   * Template preview
   */
  previewTemplate = asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { subject, body } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Subject ve body gereklidir',
      });
    }

    const preview = await templateService.previewTemplate(name, { subject, body });

    res.status(200).json({
      success: true,
      data: preview,
    });
  });

  /**
   * POST /api/admin/templates/:name/reset
   * Template'i dosyadan reset et
   */
  resetTemplate = asyncHandler(async (req, res) => {
    const { name } = req.params;

    const template = await templateService.resetTemplate(name);

    // EmailService cache'ini temizle (template reset edildi)
    emailService.clearTemplateCache(name);

    res.status(200).json({
      success: true,
      message: 'Template başarıyla sıfırlandı',
      data: template,
    });
  });

  /**
   * POST /api/admin/templates/:name/test
   * Test maili gönder
   */
  sendTestEmail = asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { subject, body, toEmail } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Subject ve body gereklidir',
      });
    }

    if (!toEmail || !toEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir e-posta adresi gereklidir',
      });
    }

    // Template'i render et
    const emailData = await templateService.sendTestEmail(name, { subject, body, toEmail });

    // Mail gönder
    const result = await emailService.sendEmail({
      to: toEmail,
      subject: emailData.subject,
      html: emailData.html,
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Test-E-Mail erfolgreich gesendet',
        data: {
          to: toEmail,
          subject: emailData.subject,
          messageId: result.messageId,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'E-Mail konnte nicht gesendet werden',
      });
    }
  });
}

export default new TemplateController();

