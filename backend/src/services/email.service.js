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
   * Önce DB'den oku, yoksa dosyadan oku (fallback)
   */
  async loadTemplate(templateName) {
    // Cache'de varsa direkt döndür
    if (this.templates[templateName]) {
      return this.templates[templateName];
    }

    let templateContent = null;
    let fromDB = false;

    try {
      // Önce DB'den oku
      const settings = await prisma.settings.findFirst();
      const dbTemplates = settings?.emailTemplates || {};
      const dbTemplate = dbTemplates[templateName];

      if (dbTemplate && dbTemplate.body) {
        templateContent = dbTemplate.body;
        fromDB = true;
        console.log(`📧 Template DB'den yüklendi: ${templateName}`);
      } else {
        // DB'de yoksa dosyadan oku (fallback)
        const templatePath = path.join(__dirname, '../../templates/emails', `${templateName}.hbs`);
        templateContent = await fs.readFile(templatePath, 'utf-8');
        console.log(`📧 Template dosyadan yüklendi: ${templateName}`);
      }
    } catch (error) {
      console.error(`⚠️  Template yükleme hatası (${templateName}):`, error.message);
      // Hata durumunda dosyadan tekrar dene
      try {
        const templatePath = path.join(__dirname, '../../templates/emails', `${templateName}.hbs`);
        templateContent = await fs.readFile(templatePath, 'utf-8');
        console.log(`📧 Template fallback dosyadan yüklendi: ${templateName}`);
      } catch (fallbackError) {
        throw new Error(`Template yüklenemedi: ${templateName} - ${fallbackError.message}`);
      }
    }

    // Template'i compile et ve cache'le
    // Eğer DB'den yüklendiyse ve compile hatası varsa, dosyadan yükle
    try {
    this.templates[templateName] = handlebars.compile(templateContent);
    return this.templates[templateName];
    } catch (compileError) {
      console.error(`⚠️  Template compile hatası (${templateName}):`, compileError.message);
      
      // Eğer DB'den yüklendiyse ve compile hatası varsa, dosyadan yükle
      if (fromDB) {
        console.log(`📧 DB template'i geçersiz, dosyadan yükleniyor: ${templateName}`);
        try {
          const templatePath = path.join(__dirname, '../../templates/emails', `${templateName}.hbs`);
          templateContent = await fs.readFile(templatePath, 'utf-8');
          this.templates[templateName] = handlebars.compile(templateContent);
          console.log(`✅ Template dosyadan başarıyla yüklendi: ${templateName}`);
          return this.templates[templateName];
        } catch (fallbackError) {
          throw new Error(`Template compile ve fallback hatası (${templateName}): ${compileError.message}`);
        }
      } else {
        throw new Error(`Template compile hatası (${templateName}): ${compileError.message}`);
      }
    }
  }

  /**
   * Template cache'ini temizle
   */
  clearTemplateCache(templateName = null) {
    if (templateName) {
      delete this.templates[templateName];
    } else {
      this.templates = {};
    }
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
      // Eğer compile/render hatası varsa, cache'i temizle ve tekrar dene
      const isTemplateError = error.message && (
        error.message.includes('Parse error') || 
        error.message.includes('template') ||
        error.message.includes('Handlebars')
      );
      
      if (isTemplateError) {
        console.error(`⚠️  Template render hatası (${templateName}), cache temizleniyor:`, error.message);
        // Cache'i temizle
        this.clearTemplateCache(templateName);
        
        // Tekrar dene (dosyadan yüklenecek)
        try {
          const template = await this.loadTemplate(templateName);
          const baseLayout = await this.loadBaseLayout();
          
          const body = template(data);
          const html = baseLayout({
            body,
            subject: data.subject || '',
            storeName: data.storeName || 'Gruner SuperStore',
            year: new Date().getFullYear(),
          });
          
          console.log(`✅ Template başarıyla render edildi (cache temizlendikten sonra): ${templateName}`);
          return html;
        } catch (retryError) {
          console.error(`❌ Template render retry hatası (${templateName}):`, retryError.message);
          throw retryError;
        }
      }
      
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

      // Attachments varsa ekle ve Buffer'ları düzelt
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map((attachment) => {
          // Eğer content Buffer değilse ve string ise, base64'ten Buffer'a çevir (queue'dan geldiğinde)
          if (attachment.content && typeof attachment.content === 'string' && !Buffer.isBuffer(attachment.content)) {
            try {
              // Base64 string'i Buffer'a çevir
              return {
                ...attachment,
                content: Buffer.from(attachment.content, 'base64'),
              };
            } catch (e) {
              // Base64 değilse olduğu gibi kullan
              console.warn('⚠️  Attachment content base64 decode edilemedi:', e.message);
              return attachment;
            }
          }
          // Zaten Buffer ise olduğu gibi kullan
          return attachment;
        });
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
   * Direkt HTML ile mail gönder (test için)
   */
  async sendEmail({ to, subject, html }) {
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

      // Mail gönder
      const mailOptions = {
        from: `"${smtpSettings.fromName || 'Gruner SuperStore'}" <${smtpSettings.fromEmail}>`,
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Test-Mail gönderildi: ${to} - ${subject}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('❌ Test-Mail gönderim hatası:', error);
      return {
        success: false,
        error: error.message,
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
    // Template cache'ini de temizle
    this.clearTemplateCache();
  }
}

export default new EmailService();
