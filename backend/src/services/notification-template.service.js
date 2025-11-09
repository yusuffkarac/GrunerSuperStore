import prisma from '../config/prisma.js';
import handlebars from 'handlebars';

/**
 * Notification Template Service
 * Notification template'lerini yönetir (CRUD, preview, reset)
 */
class NotificationTemplateService {
  /**
   * Template tanımları ve değişkenleri
   */
  templateDefinitions = {
    'order-status-changed': {
      name: 'Bestellstatus geändert',
      description: 'Benachrichtigung an Kunden bei Statusänderung',
      variables: ['firstName', 'lastName', 'orderNo', 'oldStatusText', 'newStatusText', 'statusMessage', 'total'],
    },
    'order-cancelled': {
      name: 'Bestellung storniert',
      description: 'Benachrichtigung an Kunden bei Stornierung',
      variables: ['firstName', 'lastName', 'orderNo', 'cancelDate', 'cancelReason', 'total'],
    },
    'order-received': {
      name: 'Bestellung erhalten',
      description: 'Benachrichtigung an Kunden bei Bestellungserstellung',
      variables: ['firstName', 'lastName', 'orderNo', 'orderDate', 'total'],
    },
    'campaign-notification': {
      name: 'Kampagne-Benachrichtigung',
      description: 'Benachrichtigung über neue Kampagnen oder Angebote',
      variables: ['firstName', 'lastName', 'campaignName', 'campaignDescription', 'campaignUrl'],
    },
  };

  /**
   * Varsayılan template'leri getir
   */
  getDefaultTemplate(templateName) {
    const defaults = {
      'order-status-changed': {
        title: 'Bestellung {{orderNo}} - Status aktualisiert',
        message: '{{statusMessage}}',
      },
      'order-cancelled': {
        title: 'Bestellung {{orderNo}} storniert',
        message: 'Ihre Bestellung wurde storniert. {{#if cancelReason}}Grund: {{cancelReason}}{{/if}}',
      },
      'order-received': {
        title: 'Bestellung {{orderNo}} erhalten',
        message: 'Vielen Dank für Ihre Bestellung! Wir bearbeiten sie so schnell wie möglich.',
      },
      'campaign-notification': {
        title: 'Neue Kampagne: {{campaignName}}',
        message: '{{campaignDescription}}',
      },
    };
    return defaults[templateName] || { title: '', message: '' };
  }

  /**
   * Tüm template'leri getir
   */
  async getAllTemplates() {
    const settings = await prisma.settings.findFirst();
    const dbTemplates = settings?.notificationTemplates || {};

    const templates = [];

    for (const [key, definition] of Object.entries(this.templateDefinitions)) {
      const dbTemplate = dbTemplates[key];
      const defaultTemplate = this.getDefaultTemplate(key);

      templates.push({
        key,
        name: definition.name,
        description: definition.description,
        variables: definition.variables,
        title: dbTemplate?.title || defaultTemplate.title,
        message: dbTemplate?.message || defaultTemplate.message,
        isCustomized: !!dbTemplate,
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
    const dbTemplates = settings?.notificationTemplates || {};
    const dbTemplate = dbTemplates[templateName];
    const definition = this.templateDefinitions[templateName];
    const defaultTemplate = this.getDefaultTemplate(templateName);

    return {
      key: templateName,
      name: definition.name,
      description: definition.description,
      variables: definition.variables,
      title: dbTemplate?.title || defaultTemplate.title,
      message: dbTemplate?.message || defaultTemplate.message,
      isCustomized: !!dbTemplate,
    };
  }

  /**
   * Template güncelle
   */
  async updateTemplate(templateName, { title, message }) {
    if (!this.templateDefinitions[templateName]) {
      throw new Error(`Template bulunamadı: ${templateName}`);
    }

    if (!title || !message) {
      throw new Error('Title ve message gereklidir');
    }

    const settings = await prisma.settings.findFirst();
    const dbTemplates = settings?.notificationTemplates || {};

    // Template'i güncelle
    dbTemplates[templateName] = {
      title: title.trim(),
      message: message.trim(),
    };

    // Settings'i güncelle
    await prisma.settings.updateMany({
      data: {
        notificationTemplates: dbTemplates,
      },
    });

    return {
      key: templateName,
      title: dbTemplates[templateName].title,
      message: dbTemplates[templateName].message,
    };
  }

  /**
   * Template'i varsayılan haline reset et
   */
  async resetTemplate(templateName) {
    if (!this.templateDefinitions[templateName]) {
      throw new Error(`Template bulunamadı: ${templateName}`);
    }

    const settings = await prisma.settings.findFirst();
    const dbTemplates = settings?.notificationTemplates || {};

    // Template'i DB'den sil (fallback varsayılan değerlere döner)
    delete dbTemplates[templateName];

    await prisma.settings.updateMany({
      data: {
        notificationTemplates: dbTemplates,
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
      orderNo: 'GS-20250115-0001',
      orderDate: new Date().toLocaleString('de-DE'),
      cancelDate: new Date().toLocaleString('de-DE'),
      oldStatusText: 'Ausstehend',
      newStatusText: 'In Vorbereitung',
      statusMessage: 'Wir bereiten Ihre Bestellung gerade vor.',
      total: '16.46',
      cancelReason: 'Produkt nicht verfügbar',
      campaignName: 'Sommer-Sale',
      campaignDescription: 'Bis zu 30% Rabatt auf alle Produkte!',
      campaignUrl: 'https://example.com/campaigns/summer-sale',
    };

    // Template'e özel mock data
    const templateMockData = { ...mockData };

    // Template'e göre gerekli olmayan alanları temizle
    const definition = this.templateDefinitions[templateName];
    if (definition) {
      const allowedKeys = new Set(definition.variables);
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
  async previewTemplate(templateName, { title, message }) {
    if (!this.templateDefinitions[templateName]) {
      throw new Error(`Template bulunamadı: ${templateName}`);
    }

    const mockData = this.getMockData(templateName);

    try {
      // Title ve message template'lerini compile et
      const titleTemplate = handlebars.compile(title || '');
      const messageTemplate = handlebars.compile(message || '');

      // Render et
      const renderedTitle = titleTemplate(mockData);
      const renderedMessage = messageTemplate(mockData);

      return {
        title: renderedTitle,
        message: renderedMessage,
        mockData,
      };
    } catch (error) {
      throw new Error(`Template render hatası: ${error.message}`);
    }
  }

  /**
   * Template'i render et ve bildirim için hazırla (async)
   */
  async renderTemplate(templateName, data) {
    if (!this.templateDefinitions[templateName]) {
      throw new Error(`Template bulunamadı: ${templateName}`);
    }

    const settings = await prisma.settings.findFirst();
    const dbTemplates = settings?.notificationTemplates || {};
    const dbTemplate = dbTemplates[templateName];
    const defaultTemplate = this.getDefaultTemplate(templateName);

    const titleTemplate = dbTemplate?.title || defaultTemplate.title;
    const messageTemplate = dbTemplate?.message || defaultTemplate.message;

    try {
      const titleCompiled = handlebars.compile(titleTemplate);
      const messageCompiled = handlebars.compile(messageTemplate);

      return {
        title: titleCompiled(data),
        message: messageCompiled(data),
      };
    } catch (error) {
      console.error(`Notification template render hatası (${templateName}):`, error);
      // Hata durumunda varsayılan değerleri kullan
      return {
        title: defaultTemplate.title,
        message: defaultTemplate.message,
      };
    }
  }
}

export default new NotificationTemplateService();

