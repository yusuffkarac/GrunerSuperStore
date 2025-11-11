import prisma from '../config/prisma.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Template Service
 * Email template'lerini yönetir (CRUD, preview, reset)
 */
class TemplateService {
  /**
   * Template tanımları ve değişkenleri
   */
  templateDefinitions = {
    'email-verification': {
      name: 'E-Mail-Bestätigung',
      description: 'Bestätigungscode, der beim Registrieren gesendet wird',
      variables: ['firstName', 'lastName', 'verificationCode', 'storeName'],
    },
    'email-change-verification': {
      name: 'E-Mail-Änderung Bestätigung',
      description: 'Bestätigungscode für E-Mail-Adressänderung',
      variables: ['firstName', 'lastName', 'currentEmail', 'newEmail', 'verificationCode', 'storeName'],
    },
    welcome: {
      name: 'Willkommen',
      description: 'Willkommensnachricht nach E-Mail-Bestätigung',
      variables: ['firstName', 'lastName', 'shopUrl', 'storeName'],
    },
    'password-reset': {
      name: 'Passwort zurücksetzen',
      description: 'E-Mail für Passwort-Reset-Anfrage',
      variables: ['firstName', 'lastName', 'resetUrl', 'storeName'],
    },
    'order-received': {
      name: 'Bestellung erhalten',
      description: 'E-Mail an Kunden bei Bestellungserstellung',
      variables: [
        'firstName',
        'lastName',
        'orderNo',
        'orderDate',
        'deliveryType',
        'address',
        'items',
        'subtotal',
        'discount',
        'deliveryFee',
        'total',
        'paymentType',
        'note',
        'storeName',
      ],
    },
    'order-status-changed': {
      name: 'Bestellstatus geändert',
      description: 'E-Mail an Kunden bei Statusänderung',
      variables: [
        'firstName',
        'lastName',
        'orderNo',
        'orderDate',
        'oldStatusText',
        'newStatusText',
        'statusMessage',
        'total',
        'itemCount',
        'items',
        'storeName',
      ],
    },
    'order-cancelled': {
      name: 'Bestellung storniert',
      description: 'E-Mail an Kunden bei Stornierung',
      variables: [
        'firstName',
        'lastName',
        'orderNo',
        'orderDate',
        'cancelDate',
        'total',
        'items',
        'cancelReason',
        'customerMessage',
        'refundInfo',
        'shopUrl',
        'storeName',
      ],
    },
    'order-notification-admin': {
      name: 'Neue Bestellung (Admin)',
      description: 'E-Mail an Admins bei neuer Bestellung',
      variables: [
        'orderNo',
        'orderDate',
        'customerName',
        'customerEmail',
        'customerPhone',
        'deliveryType',
        'address',
        'items',
        'itemCount',
        'total',
        'paymentType',
        'note',
        'adminOrderUrl',
      ],
    },
    invoice: {
      name: 'Rechnung',
      description: 'E-Mail an Kunden bei Rechnungsversand',
      variables: ['firstName', 'lastName', 'orderNo', 'orderDate', 'total', 'storeName'],
    },
    'expiry-completion-notification': {
      name: 'MHD-Verwaltung abgeschlossen',
      description: 'E-Mail an Admins bei abgeschlossener MHD-Verwaltung',
      variables: ['productCount', 'products', 'date', 'storeName'],
    },
    'expiry-daily-reminder': {
      name: 'MHD-Verwaltung: Tägliche Erinnerung',
      description: 'E-Mail an Admins mit Anzahl der heute zu bearbeitenden Produkte',
      variables: ['date', 'criticalCount', 'warningCount', 'totalCount', 'storeName'],
    },
  };

  /**
   * Dosyadan template oku
   */
  async loadTemplateFromFile(templateName) {
    try {
      const templatePath = path.join(__dirname, '../../templates/emails', `${templateName}.hbs`);
      const content = await fs.readFile(templatePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Template dosyası okunamadı (${templateName}):`, error.message);
      return null;
    }
  }

  /**
   * Subject'i dosyadan oku (varsayılan subject'ler)
   */
  getDefaultSubject(templateName) {
    const subjects = {
      'email-verification': 'E-Mail-Adresse bestätigen',
      welcome: 'Willkommen bei Gruner SuperStore!',
      'password-reset': 'Passwort zurücksetzen',
      'order-received': 'Bestellung erfolgreich aufgegeben',
      'order-status-changed': 'Bestellung {{orderNo}} - Status aktualisiert',
      'order-cancelled': 'Bestellung {{orderNo}} storniert',
      'order-notification-admin': 'Neue Bestellung: {{orderNo}}',
      invoice: 'Rechnung für Bestellung {{orderNo}}',
      'expiry-completion-notification': 'MHD-Verwaltung abgeschlossen - {{productCount}} Produkt(e)',
      'expiry-daily-reminder': 'MHD-Verwaltung: {{totalCount}} Produkt(e) müssen heute bearbeitet werden',
    };
    return subjects[templateName] || 'E-Mail von Gruner SuperStore';
  }

  /**
   * Tüm template'leri getir
   */
  async getAllTemplates() {
    const settings = await prisma.settings.findFirst();
    const dbTemplates = settings?.emailTemplates || {};

    const templates = [];

    for (const [key, definition] of Object.entries(this.templateDefinitions)) {
      const dbTemplate = dbTemplates[key];
      const fileContent = await this.loadTemplateFromFile(key);

      templates.push({
        key,
        name: definition.name,
        description: definition.description,
        variables: definition.variables,
        subject: dbTemplate?.subject || this.getDefaultSubject(key),
        body: dbTemplate?.body || fileContent || '',
        isCustomized: !!dbTemplate,
        hasFileFallback: !!fileContent,
      });
    }

    return templates;
  }

  /**
   * Tek template getir
   */
  async getTemplate(templateName) {
    if (!this.templateDefinitions[templateName]) {
      throw new Error(`Template bulunamadı: ${templateName}`);
    }

    const settings = await prisma.settings.findFirst();
    const dbTemplates = settings?.emailTemplates || {};
    const dbTemplate = dbTemplates[templateName];
    const definition = this.templateDefinitions[templateName];
    const fileContent = await this.loadTemplateFromFile(templateName);

    return {
      key: templateName,
      name: definition.name,
      description: definition.description,
      variables: definition.variables,
      subject: dbTemplate?.subject || this.getDefaultSubject(templateName),
      body: dbTemplate?.body || fileContent || '',
      isCustomized: !!dbTemplate,
      hasFileFallback: !!fileContent,
    };
  }

  /**
   * Template güncelle
   */
  async updateTemplate(templateName, { subject, body }) {
    if (!this.templateDefinitions[templateName]) {
      throw new Error(`Template bulunamadı: ${templateName}`);
    }

    if (!subject || !body) {
      throw new Error('Subject ve body gereklidir');
    }

    const settings = await prisma.settings.findFirst();
    const dbTemplates = settings?.emailTemplates || {};

    // Template'i güncelle
    dbTemplates[templateName] = {
      subject: subject.trim(),
      body: body.trim(),
    };

    // Settings'i güncelle
    await prisma.settings.updateMany({
      data: {
        emailTemplates: dbTemplates,
      },
    });

    // EmailService cache'ini temizlemek için resetTransporter çağrılabilir
    // Ancak burada direkt erişim yok, controller'dan çağrılmalı

    return {
      key: templateName,
      subject: dbTemplates[templateName].subject,
      body: dbTemplates[templateName].body,
    };
  }

  /**
   * Template'i dosyadan reset et
   */
  async resetTemplate(templateName) {
    if (!this.templateDefinitions[templateName]) {
      throw new Error(`Template bulunamadı: ${templateName}`);
    }

    const settings = await prisma.settings.findFirst();
    const dbTemplates = settings?.emailTemplates || {};

    // Template'i DB'den sil (fallback dosyaya döner)
    delete dbTemplates[templateName];

    await prisma.settings.updateMany({
      data: {
        emailTemplates: dbTemplates,
      },
    });

    return this.getTemplate(templateName);
  }

  /**
   * Preview için mock data oluştur
   */
  getMockData(templateName) {
    const mockData = {
      firstName: 'Max',
      lastName: 'Mustermann',
      verificationCode: '123456',
      resetUrl: 'https://example.com/reset-password?token=abc123',
      shopUrl: 'https://example.com',
      orderNo: 'GS-20250115-0001',
      orderDate: new Date().toLocaleString('de-DE'),
      cancelDate: new Date().toLocaleString('de-DE'),
      deliveryType: 'Lieferung',
      address: 'Musterstraße 123, 71332 Waiblingen',
      items: [
        {
          productName: 'Bio Tomaten',
          variantName: '500g',
          quantity: 2,
          price: '4.99',
        },
        {
          productName: 'Bio Gurken',
          quantity: 1,
          price: '2.49',
        },
      ],
      subtotal: '12.47',
      discount: '1.00',
      deliveryFee: '4.99',
      total: '16.46',
      paymentType: 'Bargeld',
      note: 'Bitte klingeln Sie zweimal.',
      oldStatusText: 'Ausstehend',
      newStatusText: 'In Vorbereitung',
      statusMessage: 'Wir bereiten Ihre Bestellung gerade vor.',
      itemCount: 2,
      cancelReason: 'Produkt nicht verfügbar',
      customerMessage: 'Wir entschuldigen uns für die Unannehmlichkeiten.',
      refundInfo: 'Die Rückerstattung wird innerhalb von 5-7 Werktagen bearbeitet.',
      customerName: 'Max Mustermann',
      customerEmail: 'max.mustermann@example.com',
      customerPhone: '+49 711 123456',
      adminOrderUrl: 'https://admin.example.com/orders/123',
      storeName: 'Gruner SuperStore',
    };

    // Template'e özel mock data
    const templateMockData = { ...mockData };

    // Template'e göre gerekli olmayan alanları temizle
    const definition = this.templateDefinitions[templateName];
    if (definition) {
      const allowedKeys = new Set(['storeName', ...definition.variables]);
      Object.keys(templateMockData).forEach((key) => {
        if (!allowedKeys.has(key)) {
          delete templateMockData[key];
        }
      });
    }

    return templateMockData;
  }

  /**
   * Template'i preview için render et
   */
  async previewTemplate(templateName, { subject, body }) {
    if (!this.templateDefinitions[templateName]) {
      throw new Error(`Template bulunamadı: ${templateName}`);
    }

    const mockData = this.getMockData(templateName);

    try {
      // Base layout'u yükle
      const baseLayoutPath = path.join(__dirname, '../../templates/emails/base-layout.hbs');
      const baseLayoutContent = await fs.readFile(baseLayoutPath, 'utf-8');
      const baseLayout = handlebars.compile(baseLayoutContent);

      // Body template'ini compile et
      const bodyTemplate = handlebars.compile(body || '');

      // Body'yi render et
      const renderedBody = bodyTemplate(mockData);

      // Subject'i render et
      const subjectTemplate = handlebars.compile(subject || '');
      const renderedSubject = subjectTemplate(mockData);

      // Base layout ile birleştir
      const html = baseLayout({
        body: renderedBody,
        subject: renderedSubject,
        storeName: mockData.storeName,
        year: new Date().getFullYear(),
      });

      return {
        html,
        subject: renderedSubject,
        mockData,
      };
    } catch (error) {
      throw new Error(`Template render hatası: ${error.message}`);
    }
  }

  /**
   * Test maili gönder
   */
  async sendTestEmail(templateName, { subject, body, toEmail }) {
    if (!this.templateDefinitions[templateName]) {
      throw new Error(`Template bulunamadı: ${templateName}`);
    }

    if (!toEmail || !toEmail.includes('@')) {
      throw new Error('Geçerli bir e-posta adresi gereklidir');
    }

    const mockData = this.getMockData(templateName);

    try {
      // Base layout'u yükle
      const baseLayoutPath = path.join(__dirname, '../../templates/emails/base-layout.hbs');
      const baseLayoutContent = await fs.readFile(baseLayoutPath, 'utf-8');
      const baseLayout = handlebars.compile(baseLayoutContent);

      // Body template'ini compile et
      const bodyTemplate = handlebars.compile(body || '');

      // Body'yi render et
      const renderedBody = bodyTemplate(mockData);

      // Subject'i render et
      const subjectTemplate = handlebars.compile(subject || '');
      const renderedSubject = subjectTemplate(mockData);

      // Base layout ile birleştir
      const html = baseLayout({
        body: renderedBody,
        subject: renderedSubject,
        storeName: mockData.storeName,
        year: new Date().getFullYear(),
      });

      return {
        subject: renderedSubject,
        html,
        toEmail,
      };
    } catch (error) {
      throw new Error(`Test maili hazırlanırken hata: ${error.message}`);
    }
  }
}

export default new TemplateService();
