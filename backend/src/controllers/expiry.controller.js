import * as expiryService from '../services/expiry.service.js';
import activityLogService from '../services/activityLog.service.js';

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
    const { previewDate } = req.query;
    let normalizedPreviewDate = null;

    if (previewDate) {
      const parsedDate = new Date(previewDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Geçersiz önizleme tarihi' });
      }
      normalizedPreviewDate = parsedDate;
    }

    const data = await expiryService.getExpiryDashboardData({
      previewDate: normalizedPreviewDate,
    });
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
    const oldSettings = await expiryService.getExpirySettings();
    const settings = await expiryService.updateExpirySettings(req.body);
    
    // Activity log kaydı
    const adminName = req.admin.firstName || req.admin.email || 'Unbekannt';
    activityLogService.createLog({
      adminId: req.admin.id,
      action: 'expiry.settings.update',
      entityType: 'settings',
      level: 'info',
      message: `MHD-Einstellungen aktualisiert von ${adminName}`,
      metadata: {
        oldSettings,
        newSettings: settings,
        changes: req.body,
      },
      req,
    }).catch((logError) => {
      console.error('❌ [EXPIRY.SETTINGS.UPDATE] Log kaydı hatası (async):', {
        error: logError.message || logError,
        adminId: req.admin.id,
      });
    });

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
    
    // Activity log kaydı
    const adminName = req.admin.firstName || req.admin.email || 'Unbekannt';
    activityLogService.createLog({
      adminId,
      action: 'expiry.product.label',
      entityType: 'product',
      entityId: productId,
      level: 'info',
      message: `Produkt etikettiert: ${action.product?.name || productId} von ${adminName}`,
      metadata: {
        productId,
        productName: action.product?.name,
        expiryDate: action.expiryDate,
        daysUntilExpiry: action.daysUntilExpiry,
        note: note || null,
        actionId: action.id,
      },
      req,
    }).catch((logError) => {
      console.error('❌ [EXPIRY.PRODUCT.LABEL] Log kaydı hatası (async):', {
        error: logError.message || logError,
        adminId,
        productId,
      });
    });

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

    // Activity log kaydı
    const actionType = normalizedExclude ? 'deactivate' : 'remove';
    const adminName = req.admin.firstName || req.admin.email || 'Unbekannt';
    const logMessage = normalizedExclude
      ? `Produkt deaktiviert: ${action.product?.name || productId} von ${adminName}`
      : `Produkt aussortiert: ${action.product?.name || productId} von ${adminName}`;

    activityLogService.createLog({
      adminId,
      action: `expiry.product.${actionType}`,
      entityType: 'product',
      entityId: productId,
      level: normalizedExclude ? 'warning' : 'info',
      message: logMessage,
      metadata: {
        productId,
        productName: action.product?.name,
        expiryDate: action.expiryDate,
        newExpiryDate: newExpiryDate || null,
        daysUntilExpiry: action.daysUntilExpiry,
        excludedFromCheck: normalizedExclude,
        scenario: scenario || null,
        note: note || null,
        actionId: action.id,
      },
      req,
    }).catch((logError) => {
      console.error(`❌ [EXPIRY.PRODUCT.${actionType.toUpperCase()}] Log kaydı hatası (async):`, {
        error: logError.message || logError,
        adminId,
        productId,
      });
    });

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
    
    // Eski tarihi note'dan parse et (service'te OLD_DATE: formatında ekleniyor)
    let oldExpiryDate = null;
    if (action.note) {
      const oldDateMatch = action.note.match(/OLD_DATE:([^|]+)/);
      if (oldDateMatch) {
        oldExpiryDate = oldDateMatch[1].trim();
      }
    }
    
    // Activity log kaydı
    const adminName = req.admin.firstName || req.admin.email || 'Unbekannt';
    activityLogService.createLog({
      adminId,
      action: 'expiry.product.update_date',
      entityType: 'product',
      entityId: productId,
      level: 'info',
      message: `MHD-Datum aktualisiert: ${action.product?.name || productId} von ${adminName}`,
      metadata: {
        productId,
        productName: action.product?.name,
        oldExpiryDate: oldExpiryDate,
        newExpiryDate: newExpiryDate,
        daysUntilExpiry: action.daysUntilExpiry,
        note: note || null,
        actionId: action.id,
      },
      req,
    }).catch((logError) => {
      console.error('❌ [EXPIRY.PRODUCT.UPDATE_DATE] Log kaydı hatası (async):', {
        error: logError.message || logError,
        adminId,
        productId,
      });
    });

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
    
    // Activity log kaydı
    const adminName = req.admin.firstName || req.admin.email || 'Unbekannt';
    activityLogService.createLog({
      adminId,
      action: 'expiry.action.undo',
      entityType: 'product',
      entityId: action.productId,
      level: 'warning',
      message: `MHD-Aktion rückgängig gemacht: ${action.product?.name || action.productId} von ${adminName}`,
      metadata: {
        productId: action.productId,
        productName: action.product?.name,
        undoneActionId: actionId,
        previousActionType: action.previousActionId ? 'unknown' : null,
        actionId: action.id,
      },
      req,
    }).catch((logError) => {
      console.error('❌ [EXPIRY.ACTION.UNDO] Log kaydı hatası (async):', {
        error: logError.message || logError,
        adminId,
        actionId,
      });
    });

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

/**
 * Bugünkü işlemleri topla ve adminlere mail gönder
 * POST /admin/expiry/send-completion-report
 */
export const sendCompletionReport = async (req, res, next) => {
  try {
    const result = await expiryService.sendTodayCompletionReport();
    
    // Activity log kaydı
    const adminName = req.admin.firstName || req.admin.email || 'Unbekannt';
    activityLogService.createLog({
      adminId: req.admin.id,
      action: 'expiry.completion_report.send',
      entityType: 'report',
      level: result.success ? 'success' : 'warning',
      message: result.success
        ? `MHD-Abschlussbericht gesendet: ${result.count || 0} Produkt(e) von ${adminName}`
        : `MHD-Abschlussbericht konnte nicht gesendet werden von ${adminName}`,
      metadata: {
        success: result.success,
        productCount: result.count || 0,
        unprocessedCriticalCount: result.unprocessedCriticalCount || 0,
        unprocessedWarningCount: result.unprocessedWarningCount || 0,
        emailResults: result.emailResults || null,
        message: result.message,
      },
      req,
    }).catch((logError) => {
      console.error('❌ [EXPIRY.COMPLETION_REPORT.SEND] Log kaydı hatası (async):', {
        error: logError.message || logError,
        adminId: req.admin.id,
      });
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
