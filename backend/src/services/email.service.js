import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Service
 * SMTP ile mail gönderimi, template rendering ve log kaydı
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = {};
    this.baseLayout = null;
  }

  /**
   * SMTP transporter'ı oluştur
   */
  async createTransporter(smtpSettings) {
    if (!smtpSettings || !smtpSettings.host) {
      throw new Error('SMTP ayarları yapılandırılmamış');
    }

    this.transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port || 587,
      secure: smtpSettings.secure || false, // true for 465, false for other ports
      auth: {
        user: smtpSettings.user,
        pass: smtpSettings.pass,
      },
    });

    // Test connection
    try {
      await this.transporter.verify();
      console.log('✅ SMTP bağlantısı başarılı');
      return true;
    } catch (error) {
      console.error('❌ SMTP bağlantı hatası:', error.message);
      throw new Error('SMTP bağlantısı başarısız: ' + error.message);
    }
  }

  /**
   * Base layout'u yükle
   */
  async loadBaseLayout() {
    if (!this.baseLayout) {
      const layoutPath = path.join(__dirname, '../../templates/emails/base-layout.hbs');
      const layoutContent = await fs.readFile(layoutPath, 'utf-8');
      this.baseLayout = handlebars.compile(layoutContent);
    }
    return this.baseLayout;
  }

  /**
   * Template'i yükle ve cache'le
   */
  async loadTemplate(templateName) {
    if (!this.templates[templateName]) {
      const templatePath = path.join(__dirname, '../../templates/emails', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      this.templates[templateName] = handlebars.compile(templateContent);
    }
    return this.templates[templateName];
  }

  /**
   * Template'i render et
   */
  async renderTemplate(templateName, data) {
    try {
      // Template ve base layout'u yükle
      const template = await this.loadTemplate(templateName);
      const baseLayout = await this.loadBaseLayout();

      // İçeriği render et
      const body = template(data);

      // Base layout ile birleştir
      const html = baseLayout({
        body,
        subject: data.subject || '',
        storeName: data.storeName || 'Gruner SuperStore',
        year: new Date().getFullYear(),
      });

      return html;
    } catch (error) {
      console.error(`Template render hatası (${templateName}):`, error);
      throw error;
    }
  }

  /**
   * Mail gönder
   * @param {Object} options - { to, subject, template, data, attachments }
   * @returns {Object} - { success, messageId, error }
   */
  async sendMail(options) {
    const { to, subject, template, data = {}, metadata = {}, attachments = [] } = options;

    // Email log oluştur
    const emailLog = await prisma.emailLog.create({
      data: {
        to,
        subject,
        template,
        status: 'pending',
        metadata,
      },
    });

    try {
      // Settings'den SMTP ayarlarını al
      const settings = await prisma.settings.findFirst();
      if (!settings || !settings.smtpSettings) {
        throw new Error('SMTP ayarları yapılandırılmamış');
      }

      const smtpSettings = settings.smtpSettings;

      // Transporter oluştur (cache'lenmiş değilse)
      if (!this.transporter) {
        await this.createTransporter(smtpSettings);
      }

      // Template'i render et
      const html = await this.renderTemplate(template, {
        ...data,
        subject,
        storeName: smtpSettings.fromName || 'Gruner SuperStore',
      });

      // Mail gönder
      const mailOptions = {
        from: `"${smtpSettings.fromName || 'Gruner SuperStore'}" <${smtpSettings.fromEmail}>`,
        to,
        subject,
        html,
      };

      // Attachments varsa ekle
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const info = await this.transporter.sendMail(mailOptions);

      // Log'u güncelle
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      console.log(`✅ Mail gönderildi: ${to} - ${subject}`);

      return {
        success: true,
        messageId: info.messageId,
        emailLogId: emailLog.id,
      };
    } catch (error) {
      console.error('❌ Mail gönderim hatası:', error);

      // Log'u güncelle
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'failed',
          error: error.message,
        },
      });

      return {
        success: false,
        error: error.message,
        emailLogId: emailLog.id,
      };
    }
  }

  /**
   * Test mail gönder
   */
  async sendTestMail(to, smtpSettings) {
    try {
      // Geçici transporter oluştur
      const tempTransporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: smtpSettings.port || 587,
        secure: smtpSettings.secure || false,
        auth: {
          user: smtpSettings.user,
          pass: smtpSettings.pass,
        },
      });

      // Test et
      await tempTransporter.verify();

      // Test mail gönder
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 30px; border-radius: 8px; }
            h1 { color: #111827; }
            .success { color: #059669; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ SMTP Test erfolgreich!</h1>
            <p class="success">Ihre E-Mail-Einstellungen funktionieren einwandfrei.</p>
            <p>Testdatum: ${new Date().toLocaleString('de-DE')}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Diese E-Mail wurde automatisch von Ihrem Gruner SuperStore Admin-Panel gesendet.
            </p>
          </div>
        </body>
        </html>
      `;

      await tempTransporter.sendMail({
        from: `"${smtpSettings.fromName || 'Gruner SuperStore'}" <${smtpSettings.fromEmail}>`,
        to,
        subject: 'SMTP Test - Gruner SuperStore',
        html,
      });

      return { success: true, message: 'Test-E-Mail erfolgreich gesendet' };
    } catch (error) {
      console.error('Test mail hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email loglarını getir
   */
  async getEmailLogs(filters = {}) {
    const { status, template, limit = 50, offset = 0 } = filters;

    const where = {};
    if (status) where.status = status;
    if (template) where.template = template;

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.emailLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Transporter'ı sıfırla (ayarlar değiştiğinde)
   */
  resetTransporter() {
    this.transporter = null;
  }
}

export default new EmailService();
