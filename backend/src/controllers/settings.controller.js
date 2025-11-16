import settingsService from '../services/settings.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';
import path from 'path';

class SettingsController {
  // GET /api/settings - Public endpoint
  getSettings = asyncHandler(async (req, res) => {
    const settings = await settingsService.getSettings();

    res.status(200).json({
      success: true,
      data: { settings },
    });
  });

  // PUT /api/admin/settings - Admin only
  updateSettings = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const {
      guestCanViewProducts,
      showOutOfStockProducts,
      homepageSettings,
      orderIdFormat,
      themeColors,
      minOrderAmount,
      freeShippingThreshold,
      shippingRules,
      deliverySettings,
      paymentOptions,
      orderLimits,
      storeSettings,
      smtpSettings,
      emailNotificationSettings,
      barcodeLabelSettings,
      customerCancellationSettings,
      footerSettings,
      cookieSettings,
    } = req.body;

    const settings = await settingsService.updateSettings({
      guestCanViewProducts,
      showOutOfStockProducts,
      homepageSettings,
      orderIdFormat,
      themeColors,
      minOrderAmount,
      freeShippingThreshold,
      shippingRules,
      deliverySettings,
      paymentOptions,
      orderLimits,
      storeSettings,
      smtpSettings,
      emailNotificationSettings,
      barcodeLabelSettings,
      customerCancellationSettings,
      footerSettings,
      cookieSettings,
    });

    // Log kaydı - hangi ayarların değiştiğini belirle
    const changedSettings = Object.keys(req.body).filter(key => req.body[key] !== undefined);
    
    await activityLogService.createLog({
      adminId,
      action: 'settings.update',
      entityType: 'settings',
      entityId: settings.id,
      level: 'info',
      message: `Einstellungen wurden aktualisiert: ${changedSettings.join(', ')}`,
      metadata: { changedSettings, settingsId: settings.id },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Einstellungen erfolgreich aktualisiert',
      data: { settings },
    });
  });

  // POST /api/admin/settings/weekly-discount-magazine/upload - PDF yükle
  uploadWeeklyDiscountMagazine = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine PDF-Datei hochgeladen',
      });
    }

    // PDF URL'sini oluştur
    const pdfUrl = `/uploads/weekly-discounts/${req.file.filename}`;

    // Settings'ten mevcut storeSettings'i al
    const settings = await settingsService.getSettings();
    const currentStoreSettings = settings.storeSettings || {};

    // weeklyDiscountMagazine'ı güncelle
    const updatedStoreSettings = {
      ...currentStoreSettings,
      weeklyDiscountMagazine: {
        ...(currentStoreSettings.weeklyDiscountMagazine || {}),
        pdfUrl: pdfUrl,
      },
    };

    // Settings'i güncelle
    const updatedSettings = await settingsService.updateSettings({
      storeSettings: updatedStoreSettings,
    });

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'settings.weekly_discount_magazine.upload',
      entityType: 'settings',
      entityId: updatedSettings.id,
      level: 'info',
      message: 'Haftalık indirimler dergisi PDF yüklendi',
      metadata: { pdfUrl, filename: req.file.filename },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'PDF erfolgreich hochgeladen',
      data: {
        pdfUrl: pdfUrl,
        filename: req.file.filename,
        size: req.file.size,
      },
    });
  });
}

export default new SettingsController();
