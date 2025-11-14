import settingsService from '../services/settings.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

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
}

export default new SettingsController();
