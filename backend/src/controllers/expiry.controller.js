import * as expiryService from '../services/expiry.service.js';

/**
 * SKT ayarlarını getir
 * GET /admin/expiry/settings
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await expiryService.getExpirySettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

/**
 * Günlük görev panosu
 * GET /admin/expiry/dashboard
 */
export const getDashboard = async (req, res, next) => {
  try {
    const data = await expiryService.getExpiryDashboardData();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * SKT ayarlarını güncelle
 * PUT /admin/expiry/settings
 */
export const updateSettings = async (req, res, next) => {
  try {
    const settings = await expiryService.updateExpirySettings(req.body);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

/**
 * Kritik ürünleri getir (son gün - kırmızı)
 * GET /admin/expiry/critical
 */
export const getCritical = async (req, res, next) => {
  try {
    const products = await expiryService.getCriticalProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
};

/**
 * Uyarı ürünlerini getir (warning days - turuncu)
 * GET /admin/expiry/warning
 */
export const getWarning = async (req, res, next) => {
  try {
    const products = await expiryService.getWarningProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
};

/**
 * Ürünü etiketle (indirim etiketi yapıştırıldı)
 * POST /admin/expiry/label/:productId
 */
export const labelProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { note } = req.body;
    const adminId = req.admin.id;

    const action = await expiryService.labelProduct(productId, adminId, note);
    res.json(action);
  } catch (error) {
    next(error);
  }
};

/**
 * Ürünü raftan kaldır
 * POST /admin/expiry/remove/:productId
 */
export const removeProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const {
      excludeFromCheck,
      note,
      newExpiryDate,
      action: actionLabel,
      mode,
      scenario,
    } = req.body;
    const adminId = req.admin.id;

    const normalizedExclude =
      scenario === 'out_of_stock'
        ? true
        : (typeof excludeFromCheck === 'boolean' ? excludeFromCheck : false);

    const action = await expiryService.removeProduct(
      productId,
      adminId,
      normalizedExclude,
      note,
      newExpiryDate || null,
      {
        action: actionLabel || mode,
        scenario,
      }
    );
    res.json(action);
  } catch (error) {
    next(error);
  }
};

/**
 * İşlem geçmişini getir
 * GET /admin/expiry/history
 */
export const getHistory = async (req, res, next) => {
  try {
    const { adminId, productId, actionType, limit, offset, date } = req.query;

    const filters = {
      ...(adminId && { adminId }),
      ...(productId && { productId }),
      ...(actionType && { actionType }),
      ...(limit && { limit: parseInt(limit) }),
      ...(offset && { offset: parseInt(offset) }),
      ...(date && { date }),
    };

    const history = await expiryService.getActionHistory(filters);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

/**
 * Ürünün SKT tarihini güncelle
 * PUT /admin/expiry/update-date/:productId
 */
export const updateExpiryDate = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { newExpiryDate, note } = req.body;
    const adminId = req.admin.id;

    if (!newExpiryDate) {
      return res.status(400).json({ error: 'Yeni SKT tarihi gereklidir' });
    }

    const action = await expiryService.updateExpiryDate(productId, adminId, newExpiryDate, note);
    res.json(action);
  } catch (error) {
    next(error);
  }
};

/**
 * İşlemi geri al
 * POST /admin/expiry/undo/:actionId
 */
export const undoAction = async (req, res, next) => {
  try {
    const { actionId } = req.params;
    const adminId = req.admin.id;

    const action = await expiryService.undoAction(actionId, adminId);
    res.json(action);
  } catch (error) {
    next(error);
  }
};

/**
 * Günlük MHD bildirimi gönder
 * GET /admin/expiry/daily-reminder
 */
export const sendDailyReminder = async (req, res, next) => {
  try {
    const result = await expiryService.notifyDailyExpiryProducts();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * MHD biten ürünleri kontrol et ve adminlere mail gönder
 * POST /admin/expiry/check-and-notify
 */
export const checkAndNotifyAdmins = async (req, res, next) => {
  try {
    const result = await expiryService.checkExpiredProductsAndNotifyAdmins();
    res.json(result);
  } catch (error) {
    next(error);
  }
};
