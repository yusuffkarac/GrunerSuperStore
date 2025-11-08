import prisma from '../config/prisma.js';

class SettingsService {
  // Ayarları getir (tek satır)
  async getSettings() {
    let settings = await prisma.settings.findFirst();

    // Eğer ayarlar yoksa, default ayarları oluştur
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          guestCanViewProducts: true,
          orderIdFormat: {
            prefix: 'GS',
            separator: '-',
            dateFormat: 'YYYYMMDD',
            numberFormat: 'sequential',
            numberPadding: 4,
            resetPeriod: 'daily',
            caseTransform: 'uppercase',
            startFrom: 1,
          },
          // Business defaults
          minOrderAmount: null,
          freeShippingThreshold: null,
          shippingRules: [
            { min: 0, max: 49.99, fee: 4.99, type: 'flat' },
            { min: 50.0, max: null, fee: 0, type: 'flat' },
          ],
          deliverySettings: {
            teslimatAcik: true,
            magazadanTeslimAcik: true,
            teslimatSaatleri: [{ gun: 'Mon-Sun', baslangic: '09:00', bitis: '20:00' }],
            siparisKapanisSaati: '19:30',
          },
          paymentOptions: {
            kartKapida: true,
            nakit: true,
            online: false,
            kapidaOdemeUcreti: { type: 'flat', value: 0 },
          },
          orderLimits: {
            maxSiparisTutari: null,
            maxUrunAdedi: null,
            maxSepetKalemi: null,
          },
          storeSettings: {
            bakimModu: false,
            dilYerelAyar: 'de-DE',
            iletisimBilgileri: null,
            faturaBilgileri: null,
            bannerlar: [],
            seoAyarları: null,
          },
          // Email defaults
          smtpSettings: null,
          emailNotificationSettings: {
            adminEmail: null,
            notifyOnOrderStatus: {
              accepted: true,
              preparing: false,
              shipped: true,
              delivered: true,
              cancelled: true,
            },
          },
          barcodeLabelSettings: {
            labelHeaderFontSize: 16,
            labelPriceFontSize: 46,
            labelPriceCurrencyFontSize: 24,
            labelSkuFontSize: 11,
          },
        },
      });
    }

    return settings;
  }

  // Ayarları güncelle
  async updateSettings(data) {
    let settings = await prisma.settings.findFirst();

    const updateData = {};
    if (data.guestCanViewProducts !== undefined) {
      updateData.guestCanViewProducts = data.guestCanViewProducts;
    }
    if (data.homepageSettings !== undefined) {
      updateData.homepageSettings = data.homepageSettings;
    }
    if (data.orderIdFormat !== undefined) {
      updateData.orderIdFormat = data.orderIdFormat;
    }
    if (data.themeColors !== undefined) {
      updateData.themeColors = data.themeColors;
    }
    if (data.minOrderAmount !== undefined) {
      updateData.minOrderAmount = data.minOrderAmount;
    }
    if (data.freeShippingThreshold !== undefined) {
      updateData.freeShippingThreshold = data.freeShippingThreshold;
    }
    if (data.shippingRules !== undefined) {
      updateData.shippingRules = data.shippingRules;
    }
    if (data.deliverySettings !== undefined) {
      updateData.deliverySettings = data.deliverySettings;
    }
    if (data.paymentOptions !== undefined) {
      updateData.paymentOptions = data.paymentOptions;
    }
    if (data.orderLimits !== undefined) {
      updateData.orderLimits = data.orderLimits;
    }
    if (data.storeSettings !== undefined) {
      updateData.storeSettings = data.storeSettings;
    }
    if (data.smtpSettings !== undefined) {
      updateData.smtpSettings = data.smtpSettings;
    }
    if (data.emailNotificationSettings !== undefined) {
      updateData.emailNotificationSettings = data.emailNotificationSettings;
    }
    if (data.barcodeLabelSettings !== undefined) {
      updateData.barcodeLabelSettings = data.barcodeLabelSettings;
    }

    // Eğer ayarlar yoksa önce oluştur
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          guestCanViewProducts: data.guestCanViewProducts ?? true,
          homepageSettings: data.homepageSettings ?? null,
          orderIdFormat: data.orderIdFormat ?? {
            prefix: 'GS',
            separator: '-',
            dateFormat: 'YYYYMMDD',
            numberFormat: 'sequential',
            numberPadding: 4,
            resetPeriod: 'daily',
            caseTransform: 'uppercase',
            startFrom: 1,
          },
          themeColors: data.themeColors ?? null,
          minOrderAmount: data.minOrderAmount ?? null,
          freeShippingThreshold: data.freeShippingThreshold ?? null,
          shippingRules: data.shippingRules ?? [
            { min: 0, max: 49.99, fee: 4.99, type: 'flat' },
            { min: 50.0, max: null, fee: 0, type: 'flat' },
          ],
          deliverySettings: data.deliverySettings ?? {
            teslimatAcik: true,
            magazadanTeslimAcik: true,
            teslimatSaatleri: [{ gun: 'Mon-Sun', baslangic: '09:00', bitis: '20:00' }],
            siparisKapanisSaati: '19:30',
          },
          paymentOptions: data.paymentOptions ?? {
            kartKapida: true,
            nakit: true,
            online: false,
            kapidaOdemeUcreti: { type: 'flat', value: 0 },
          },
          orderLimits: data.orderLimits ?? {
            maxSiparisTutari: null,
            maxUrunAdedi: null,
            maxSepetKalemi: null,
          },
          storeSettings: data.storeSettings ?? {
            bakimModu: false,
            dilYerelAyar: 'de-DE',
            iletisimBilgileri: null,
            faturaBilgileri: null,
            bannerlar: [],
            seoAyarları: null,
          },
          smtpSettings: data.smtpSettings ?? null,
          emailNotificationSettings: data.emailNotificationSettings ?? {
            adminEmail: null,
            notifyOnOrderStatus: {
              accepted: true,
              preparing: false,
              shipped: true,
              delivered: true,
              cancelled: true,
            },
          },
          barcodeLabelSettings: data.barcodeLabelSettings ?? {
            labelHeaderFontSize: 16,
            labelPriceFontSize: 46,
            labelPriceCurrencyFontSize: 24,
            labelSkuFontSize: 11,
          },
        },
      });
    } else {
      // Varsa güncelle
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return settings;
  }
}

export default new SettingsService();
