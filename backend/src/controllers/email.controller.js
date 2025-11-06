import emailService from '../services/email.service.js';
import queueService from '../services/queue.service.js';

/**
 * Email Controller
 * Admin panelden mail yönetimi
 */
class EmailController {
  /**
   * Test mail gönder
   * POST /api/admin/email/test
   */
  async sendTestEmail(req, res) {
    try {
      const { to, smtpSettings } = req.body;

      if (!to) {
        return res.status(400).json({
          success: false,
          message: 'E-Mail-Adresse ist erforderlich',
        });
      }

      if (!smtpSettings || !smtpSettings.host || !smtpSettings.user || !smtpSettings.pass) {
        return res.status(400).json({
          success: false,
          message: 'SMTP-Einstellungen sind unvollständig',
        });
      }

      const result = await emailService.sendTestMail(to, smtpSettings);

      if (result.success) {
        return res.json({
          success: true,
          message: result.message,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Test-E-Mail konnte nicht gesendet werden',
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Test email hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Senden der Test-E-Mail',
        error: error.message,
      });
    }
  }

  /**
   * Email loglarını getir
   * GET /api/admin/email/logs
   */
  async getEmailLogs(req, res) {
    try {
      const { status, template, limit, offset } = req.query;

      const result = await emailService.getEmailLogs({
        status,
        template,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      });

      return res.json({
        success: true,
        data: result.logs,
        total: result.total,
      });
    } catch (error) {
      console.error('Email logs hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Laden der E-Mail-Logs',
        error: error.message,
      });
    }
  }

  /**
   * Queue istatistiklerini getir
   * GET /api/admin/email/queue-stats
   */
  async getQueueStats(req, res) {
    try {
      const stats = await queueService.getQueueStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Queue stats hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Laden der Warteschlangen-Statistiken',
        error: error.message,
      });
    }
  }

  /**
   * Başarısız job'ları yeniden dene
   * POST /api/admin/email/retry-failed
   */
  async retryFailedJobs(req, res) {
    try {
      const result = await queueService.retryFailedJobs();

      if (result.success) {
        return res.json({
          success: true,
          message: result.message,
          retriedCount: result.retriedCount,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: result.message || 'Fehler beim Wiederholen',
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Retry failed jobs hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Wiederholen fehlgeschlagener Jobs',
        error: error.message,
      });
    }
  }

  /**
   * Kuyruğu temizle
   * POST /api/admin/email/clean-queue
   */
  async cleanQueue(req, res) {
    try {
      const result = await queueService.cleanQueue();

      if (result.success) {
        return res.json({
          success: true,
          message: result.message,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: result.message || 'Fehler beim Bereinigen',
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Clean queue hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Bereinigen der Warteschlange',
        error: error.message,
      });
    }
  }
}

export default new EmailController();
