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
