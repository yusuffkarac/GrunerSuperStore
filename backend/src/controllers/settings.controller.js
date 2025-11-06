import settingsService from '../services/settings.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

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
    const { guestCanViewProducts, homepageSettings } = req.body;

    const settings = await settingsService.updateSettings({
      guestCanViewProducts,
      homepageSettings,
    });

    res.status(200).json({
      success: true,
      message: 'Einstellungen erfolgreich aktualisiert',
      data: { settings },
    });
  });
}

export default new SettingsController();
