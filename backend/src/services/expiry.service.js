import prisma from '../config/prisma.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import queueService from './queue.service.js';
import { getTodayInGermany } from '../utils/date.js';

const defaultExpirySettings = {
  enabled: true,
  warningDays: 3, // Turuncu etiket için (1-3 gün)
  criticalDays: 0, // Aynı gün
  processingDeadline: '20:00', // Günlük kapanış uyarısı
};

const normalizeDeadlineTime = (value) => {
  if (!value || typeof value !== 'string') {
    return defaultExpirySettings.processingDeadline;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return defaultExpirySettings.processingDeadline;
  }
  return `${match[1]}:${match[2]}`;
};

const normalizeExpirySettings = (settings = {}) => {
  const merged = {
    ...defaultExpirySettings,
    ...settings,
  };

  merged.enabled = merged.enabled !== undefined ? Boolean(merged.enabled) : defaultExpirySettings.enabled;

  const warningDays = Number.isFinite(Number(merged.warningDays))
    ? Math.max(parseInt(merged.warningDays, 10), 1)
    : defaultExpirySettings.warningDays;
  const criticalDays = Number.isFinite(Number(merged.criticalDays))
    ? Math.max(parseInt(merged.criticalDays, 10), 0)
    : defaultExpirySettings.criticalDays;
  merged.warningDays = Math.max(warningDays, criticalDays);
  merged.criticalDays = Math.min(criticalDays, merged.warningDays);

  merged.processingDeadline = normalizeDeadlineTime(merged.processingDeadline);

  return merged;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const isSameDay = (dateA, dateB) => {
  if (!dateA || !dateB) return false;
  return startOfDay(dateA).getTime() === startOfDay(dateB).getTime();
};

/**
 * SKT ayarlarını getir
 */
export const getExpirySettings = async () => {
  const settings = await prisma.settings.findFirst();
  return normalizeExpirySettings(settings?.expiryManagementSettings);
};

/**
 * Bugünün tarihini al (saat bilgisi olmadan)
 * Almanya saat dilimine göre çalışır
 */
const getToday = () => {
  return getTodayInGermany();
};

const resolveReferenceDate = (previewDateInput) => {
  if (!previewDateInput) {
    return getToday();
  }

  if (previewDateInput instanceof Date && !Number.isNaN(previewDateInput.getTime())) {
    return previewDateInput;
  }

  const parsed = new Date(previewDateInput);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestError('Geçersiz önizleme tarihi');
  }
  return parsed;
};

/**
 * İki tarih arasındaki gün farkını hesapla
 */
const getDaysDifference = (date1, date2) => {
  const getDateKey = (inputDate) => {
    const d = new Date(inputDate);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const diffTime = getDateKey(date1) - getDateKey(date2);
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const fetchTaskCandidates = async (todayStart, todayEnd, horizonEnd) => {
  return prisma.product.findMany({
    where: {
              expiryDate: {
        not: null,
      },
      hideFromExpiryManagement: false,
      isActive: true,
      OR: [
        {
                  expiryDate: {
            gte: todayStart,
            lte: horizonEnd,
              },
            },
            {
              expiryActions: {
                some: {
                  isUndone: false,
                  createdAt: {
                gte: todayStart,
                    lte: todayEnd,
                  },
                },
              },
        },
        {
          AND: [
            {
              excludeFromExpiryCheck: true,
            },
            {
              expiryActions: {
                some: {
                  isUndone: false,
                  actionType: 'removed',
                  excludedFromCheck: true,
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      expiryActions: {
        where: {
          isUndone: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        include: {
          admin: {
            select: {
              id: true,
              firstName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [
      { expiryDate: 'asc' },
      { name: 'asc' },
    ],
  });
};

const mapProductToTask = (product, context) => {
  if (!product.expiryDate) {
    return null;
  }

  const expiryDate = startOfDay(product.expiryDate);
  const daysUntilExpiry = getDaysDifference(expiryDate, context.todayStart);
  const lastAction = product.expiryActions[0] || null;
  const actionSameDay =
    lastAction && !lastAction.isUndone && isSameDay(lastAction.createdAt, context.todayStart);
  const isPersistentDeactivated =
    product.excludeFromExpiryCheck === true &&
    lastAction &&
    !lastAction.isUndone &&
    lastAction.actionType === 'removed' &&
    lastAction.excludedFromCheck === true;

  if (daysUntilExpiry > context.settings.warningDays && !actionSameDay && !isPersistentDeactivated) {
    return null;
  }

  let taskType = null;
  if (isPersistentDeactivated) {
    taskType =
      daysUntilExpiry <= context.settings.criticalDays ? 'aussortieren' : 'reduzieren';
  } else if (daysUntilExpiry <= context.settings.criticalDays) {
    taskType = 'aussortieren';
  } else if (daysUntilExpiry <= context.settings.warningDays) {
    taskType = 'reduzieren';
  } else if (actionSameDay) {
    taskType = lastAction?.actionType === 'labeled' ? 'reduzieren' : 'aussortieren';
  } else {
    return null;
  }

  // Reduziert ürünler: işlem günü listede soluk kal, ertesi güne kadar gizlen
  if (
    taskType === 'reduzieren' &&
    lastAction &&
    !lastAction.isUndone &&
    lastAction.actionType === 'labeled' &&
    context.todayStart.getTime() < expiryDate.getTime()
  ) {
    if (!actionSameDay) {
      return null;
    }
  }

  const wasProcessedToday = (() => {
    if (!actionSameDay || !lastAction) {
      return false;
    }

    if (lastAction.actionType === 'labeled') {
      return true;
    }

    if (lastAction.actionType === 'removed') {
      if (lastAction.excludedFromCheck) {
        return true;
      }
      return daysUntilExpiry > context.settings.warningDays;
    }

    return false;
  })();

  const categoryId = product.category?.id || 'uncategorized';
  const categoryName = product.category?.name || 'Keine Kategorie';

  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    stock: product.stock,
    category: {
      id: categoryId,
      name: categoryName,
    },
    expiryDate: product.expiryDate,
    daysUntilExpiry,
    taskType,
    isProcessed: wasProcessedToday,
    excludeFromExpiryCheck: product.excludeFromExpiryCheck === true,
    lastAction: lastAction
      ? {
          id: lastAction.id,
          actionType: lastAction.actionType,
          createdAt: lastAction.createdAt,
          note: lastAction.note,
          excludedFromCheck: lastAction.excludedFromCheck,
          admin: lastAction.admin
            ? {
                id: lastAction.admin.id,
                firstName: lastAction.admin.firstName,
                email: lastAction.admin.email,
              }
            : null,
        }
      : null,
    highlight: actionSameDay ? lastAction.actionType : null,
    ...(context.includeRawProduct ? { rawProduct: product } : {}),
  };
};

const buildTaskList = async ({ includeRawProduct = false, previewDate = null } = {}) => {
  const settings = await getExpirySettings();
  const referenceDate = resolveReferenceDate(previewDate);
  const todayStart = startOfDay(referenceDate);
  const todayEnd = endOfDay(todayStart);
  const horizonEnd = endOfDay(addDays(todayStart, settings.warningDays));

  const candidates = await fetchTaskCandidates(todayStart, todayEnd, horizonEnd);
  const context = { todayStart, settings, includeRawProduct };

  const tasks = candidates
    .map((product) => mapProductToTask(product, context))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return {
    tasks,
    todayStart,
    horizonEnd,
    settings,
    isPreview: Boolean(previewDate),
  };
};

/**
 * Kritik ürünleri getir (son gün - kırmızı)
 */
export const getCriticalProducts = async () => {
  const { tasks } = await buildTaskList({ includeRawProduct: true });
  return tasks
    .filter((task) => task.taskType === 'aussortieren')
    .map((task) => ({
      ...task.rawProduct,
      daysUntilExpiry: task.daysUntilExpiry,
      lastAction: task.lastAction,
      excludeFromExpiryCheck: task.excludeFromExpiryCheck,
      taskMetadata: {
        isProcessed: task.isProcessed,
      },
  }));
};

/**
 * Uyarı gerektiren ürünleri getir (warning days - turuncu)
 */
export const getWarningProducts = async () => {
  const { tasks } = await buildTaskList({ includeRawProduct: true });
  return tasks
    .filter((task) => task.taskType === 'reduzieren')
    .map((task) => ({
      ...task.rawProduct,
      daysUntilExpiry: task.daysUntilExpiry,
      lastAction: task.lastAction,
      excludeFromExpiryCheck: task.excludeFromExpiryCheck,
      taskMetadata: {
        isProcessed: task.isProcessed,
      },
    }));
};

/**
 * Günlük görev panosu verilerini oluştur
 */
export const getExpiryDashboardData = async (options = {}) => {
  const { tasks, todayStart, horizonEnd, settings, isPreview } = await buildTaskList(options);

  const actionSummary = {
    removeToday: { total: 0, processed: 0 },
    labelSoon: { total: 0, processed: 0 },
  };

  const categoriesMap = new Map();

  tasks.forEach((task) => {
    const bucket = task.taskType === 'aussortieren' ? 'removeToday' : 'labelSoon';
    actionSummary[bucket].total += 1;
    if (task.isProcessed) {
      actionSummary[bucket].processed += 1;
    }

    const categoryId = task.category.id;
    if (!categoriesMap.has(categoryId)) {
      categoriesMap.set(categoryId, {
        id: categoryId,
        name: task.category.name,
        productCount: 0,
        processedCount: 0,
        pendingCount: 0,
        summary: {
          removeToday: { total: 0, processed: 0 },
          labelSoon: { total: 0, processed: 0 },
        },
        products: [],
      });
    }

    const categoryEntry = categoriesMap.get(categoryId);
    categoryEntry.products.push(task);
    categoryEntry.productCount += 1;
    if (task.isProcessed) {
      categoryEntry.processedCount += 1;
    } else {
      categoryEntry.pendingCount += 1;
    }
    categoryEntry.summary[bucket].total += 1;
    if (task.isProcessed) {
      categoryEntry.summary[bucket].processed += 1;
    }
  });

  const categories = Array.from(categoriesMap.values()).sort((a, b) => {
    return a.name.localeCompare(b.name, 'de');
  });

  const totalProducts = tasks.length;
  const processedProducts = tasks.filter((task) => task.isProcessed).length;
  const pendingProducts = totalProducts - processedProducts;
  const completionRate = totalProducts === 0 ? 0 : Math.round((processedProducts / totalProducts) * 100);

  const todayLabel = todayStart.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return {
    date: todayStart.toISOString(),
    dateLabel: todayLabel,
    deadlineTime: settings.processingDeadline,
    deadlineLabel: isPreview
      ? `Fällig am ${todayLabel} um ${settings.processingDeadline}`
      : `Heute fällig um ${settings.processingDeadline}`,
    settings,
    preview: {
      isPreview,
      date: isPreview ? todayStart.toISOString() : null,
    },
    stats: {
      totalCategories: categories.length,
      totalProducts,
      processedProducts,
      pendingProducts,
      completionRate,
      progressLabel: `${processedProducts}/${totalProducts}`,
    },
    actionSummary,
    categories,
    products: tasks,
    lastUpdatedAt: new Date().toISOString(),
    horizon: {
      end: horizonEnd.toISOString(),
    },
  };
};

/**
 * Ürünü etiketlenmiş olarak işaretle (indirim etiketi yapıştırıldı)
 */
export const labelProduct = async (productId, adminId, note = null) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundError('Ürün bulunamadı');
  }

  if (!product.expiryDate) {
    throw new BadRequestError('Bu ürünün son kullanma tarihi belirtilmemiş');
  }

  const today = getToday();
  const daysUntilExpiry = getDaysDifference(product.expiryDate, today);

  // Eğer ürün SKT kontrolünden muaf tutulmuşsa, etiketleme işlemiyle birlikte tekrar kontrol altına al
  if (product.excludeFromExpiryCheck) {
    await prisma.product.update({
      where: { id: productId },
      data: { excludeFromExpiryCheck: false },
    });
  }

  // İşlemi kaydet
  const action = await prisma.expiryAction.create({
    data: {
      productId,
      adminId,
      actionType: 'labeled',
      expiryDate: product.expiryDate,
      daysUntilExpiry,
      note,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          expiryDate: true,
        },
      },
      admin: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  return action;
};

/**
 * Ürünü raftan kaldır
 */
export const removeProduct = async (
  productId,
  adminId,
  excludeFromCheck = false,
  note = null,
  newExpiryDate = null,
  actionMeta = {}
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundError('Ürün bulunamadı');
  }

  if (!product.expiryDate) {
    throw new BadRequestError('Bu ürünün son kullanma tarihi belirtilmemiş');
  }

  const today = getToday();
  const scenario = actionMeta.scenario || (excludeFromCheck ? 'out_of_stock' : 'temporary');
  const actionType = actionMeta.action || (excludeFromCheck ? 'deactivate' : 'remove');
  const shouldExcludeFromCheck = scenario === 'out_of_stock' ? true : excludeFromCheck;
  let expiryDateToUse = product.expiryDate;
  let daysUntilExpiry = getDaysDifference(product.expiryDate, today);

  // Eğer yeni tarih verilmişse, ürünün expiryDate'ini güncelle
  const updateData = {};
  if (newExpiryDate) {
    const newDate = new Date(newExpiryDate);
    updateData.expiryDate = newDate;
    expiryDateToUse = newDate;
    daysUntilExpiry = getDaysDifference(newDate, today);
  }

  // Eğer excludeFromCheck true ise, ürünü SKT kontrolünden muaf tut
  if (shouldExcludeFromCheck) {
    updateData.excludeFromExpiryCheck = true;
  }

  // Ürünü güncelle (yeni tarih veya excludeFromCheck varsa)
  if (Object.keys(updateData).length > 0) {
    await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });
  }

  // İşlemi kaydet
  const action = await prisma.expiryAction.create({
    data: {
      productId,
      adminId,
      actionType: 'removed',
      expiryDate: expiryDateToUse,
      daysUntilExpiry,
      excludedFromCheck: shouldExcludeFromCheck,
      note: note
        ? note.trim()
        : actionType === 'deactivate'
          ? (scenario === 'temporary' ? 'Ürün bugün geçici olarak devre dışı' : 'Ürün stokta yok')
          : 'Ürün raftan kaldırıldı',
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          expiryDate: true,
          excludeFromExpiryCheck: true,
        },
      },
      admin: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  return action;
};

/**
 * İşlem geçmişini getir
 */
export const getActionHistory = async (filters = {}) => {
  const { adminId, productId, actionType, limit = 100, offset = 0, date } = filters;

  const where = {
    ...(adminId && { adminId }),
    ...(productId && { productId }),
    ...(actionType && { actionType }),
  };

  // Tarih filtresi ekle (belirli bir günün işlemlerini getir)
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    where.createdAt = {
      gte: startDate,
      lte: endDate,
    };
  }

  const [actions, total] = await Promise.all([
    prisma.expiryAction.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            barcode: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          product: {
            name: 'asc',
          },
        },
        {
          createdAt: 'desc',
        },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.expiryAction.count({ where }),
  ]);

  return {
    actions,
    total,
    limit,
    offset,
  };
};

/**
 * İşlemi geri al
 */
export const undoAction = async (actionId, adminId) => {
  const action = await prisma.expiryAction.findUnique({
    where: { id: actionId },
    include: {
      product: true,
    },
  });

  if (!action) {
    throw new NotFoundError('İşlem bulunamadı');
  }

  if (action.isUndone) {
    throw new BadRequestError('Bu işlem zaten geri alınmış');
  }

  if (action.actionType === 'undone') {
    throw new BadRequestError('Geri alma işlemi tekrar geri alınamaz');
  }

  // İşlemi geri alındı olarak işaretle
  await prisma.expiryAction.update({
    where: { id: actionId },
    data: {
      isUndone: true,
      undoneAt: new Date(),
      undoneBy: adminId,
    },
  });

  // Eğer bu bir "removed" işlemi ise, ürünü eski haline getir
  if (action.actionType === 'removed') {
    let previousExpiryDate = null;
    
    // Eğer bu bir tarih güncellemesi ise (excludedFromCheck: false), note'dan eski tarihi al
    if (action.excludedFromCheck === false && action.note) {
      const oldDateMatch = action.note.match(/OLD_DATE:([^\s|]+)/);
      if (oldDateMatch && oldDateMatch[1]) {
        try {
          previousExpiryDate = new Date(oldDateMatch[1]);
          // Geçerli bir tarih mi kontrol et
          if (isNaN(previousExpiryDate.getTime())) {
            previousExpiryDate = null;
          }
        } catch (e) {
          previousExpiryDate = null;
        }
      }
    }
    
    // Eğer note'dan eski tarih bulunamadıysa, önceki action'ı bul
    if (!previousExpiryDate) {
      const previousAction = await prisma.expiryAction.findFirst({
        where: {
          productId: action.productId,
          createdAt: {
            lt: action.createdAt,
          },
          isUndone: false,
          actionType: {
            not: 'undone',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      // Eğer önceki action varsa onun tarihini kullan, yoksa action'daki tarihi kullan
      previousExpiryDate = previousAction ? previousAction.expiryDate : action.expiryDate;
    }
    
    // Ürünü güncelle: eski tarihi geri yükle ve excludeFromCheck'i false yap
    await prisma.product.update({
      where: { id: action.productId },
      data: { 
        expiryDate: previousExpiryDate,
        excludeFromExpiryCheck: false,
      },
    });
  }

  // Geri alma işlemini kaydet
  const today = getToday();
  const daysUntilExpiry = getDaysDifference(action.expiryDate, today);

  const undoneAction = await prisma.expiryAction.create({
    data: {
      productId: action.productId,
      adminId,
      actionType: 'undone',
      expiryDate: action.expiryDate,
      daysUntilExpiry,
      previousActionId: actionId,
      note: `Rückgängig gemacht: ${action.actionType}`,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          expiryDate: true,
          excludeFromExpiryCheck: true,
        },
      },
      admin: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  return undoneAction;
};

/**
 * Ürünün SKT tarihini güncelle
 */
export const updateExpiryDate = async (productId, adminId, newExpiryDate, note = null) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundError('Ürün bulunamadı');
  }

  const today = getToday();
  const newDate = new Date(newExpiryDate);
  const daysUntilExpiry = getDaysDifference(newDate, today);

  // Eski tarihi kaydet (geri alma işlemi için)
  const oldExpiryDate = product.expiryDate;

  // Ürünün expiryDate'ini güncelle ve excludeFromExpiryCheck'i false yap
  await prisma.product.update({
    where: { id: productId },
    data: {
      expiryDate: newDate,
      excludeFromExpiryCheck: false,
    },
  });

  // İşlemi kaydet - Tarih güncelleme için 'removed' action type kullanıyoruz ama filtreleme mantığında özel olarak ele alınacak
  // Eski tarihi note'a JSON formatında ekle (geri alma için)
  const actionNote = note || 'SKT tarihi güncellendi';
  const noteWithOldDate = oldExpiryDate 
    ? `${actionNote} | OLD_DATE:${oldExpiryDate.toISOString()}`
    : actionNote;

  const action = await prisma.expiryAction.create({
    data: {
      productId,
      adminId,
      actionType: 'removed', // Tarih güncelleme işlemi için removed action type kullanıyoruz (filtreleme mantığında özel olarak ele alınacak)
      expiryDate: newDate,
      daysUntilExpiry,
      excludedFromCheck: false,
      note: noteWithOldDate,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          expiryDate: true,
          excludeFromExpiryCheck: true,
        },
      },
      admin: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  return action;
};

/**
 * SKT ayarlarını güncelle
 */
export const updateExpirySettings = async (newSettings = {}) => {
  const settings = await prisma.settings.findFirst();

  if (!settings) {
    throw new NotFoundError('Ayarlar bulunamadı');
  }

  const currentSettings = await getExpirySettings();
  const normalizedSettings = normalizeExpirySettings({
    ...currentSettings,
    ...newSettings,
  });

  const updatedSettings = await prisma.settings.update({
    where: { id: settings.id },
    data: {
      expiryManagementSettings: normalizedSettings,
    },
  });


  return normalizeExpirySettings(updatedSettings.expiryManagementSettings);
};

/**
 * Frontend'deki getUnprocessedCriticalCount mantığını kullanarak
 * işlem yapılmamış kritik ürün sayısını hesapla
 */
let unprocessedCountsPromise = null;

const getUnprocessedCounts = () => {
  if (!unprocessedCountsPromise) {
    unprocessedCountsPromise = (async () => {
      const dashboard = await getExpiryDashboardData();
      const counts = {
        critical: 0,
        warning: 0,
      };

      dashboard.products.forEach((task) => {
        if (task.isProcessed) {
          return;
        }
        if (task.taskType === 'aussortieren') {
          counts.critical += 1;
        } else if (task.taskType === 'reduzieren') {
          counts.warning += 1;
        }
      });

      return counts;
    })().finally(() => {
      unprocessedCountsPromise = null;
    });
  }

  return unprocessedCountsPromise;
};

const getUnprocessedCriticalCount = async () => {
  const counts = await getUnprocessedCounts();
  return counts.critical;
};

/**
 * Frontend'deki getUnprocessedWarningCount mantığını kullanarak
 * işlem yapılmamış warning ürün sayısını hesapla
 */
const getUnprocessedWarningCount = async () => {
  const counts = await getUnprocessedCounts();
  return counts.warning;
};

/**
 * Günün başlangıcında bugün işlenecek ürün sayısını adminlere bildir
 * Bu fonksiyon sayfaya giren ilk kişi tarafından tetiklenir
 */
export const notifyDailyExpiryProducts = async () => {
  try {
    
    
    
    
    const today = getToday();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Bugün bu mail daha önce gönderilmiş mi kontrol et
    const existingEmail = await prisma.emailLog.findFirst({
      where: {
        template: 'expiry-daily-reminder',
        status: 'sent',
        sentAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (existingEmail) {
      
      
      return {
        success: true,
        message: 'Bugün bu mail zaten gönderilmiş',
        alreadySent: true,
        lastSentAt: existingEmail.sentAt,
      };
    }

    // Bugün işlenecek ürün sayılarını hesapla
    const unprocessedCriticalCount = await getUnprocessedCriticalCount();
    const unprocessedWarningCount = await getUnprocessedWarningCount();
    const totalCount = unprocessedCriticalCount + unprocessedWarningCount;

    

    // Settings'den admin email listesini al
    const allSettings = await prisma.settings.findFirst();
    if (!allSettings || !allSettings.emailNotificationSettings?.adminEmail) {
      console.warn('⚠️  Admin email listesi bulunamadı');
      return { success: false, message: 'Admin email listesi bulunamadı', count: 0 };
    }

    const adminEmails = allSettings.emailNotificationSettings.adminEmail
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email && email.includes('@'));

    if (adminEmails.length === 0) {
      console.warn('⚠️  Geçerli admin email adresi bulunamadı');
      return { success: false, message: 'Geçerli admin email adresi bulunamadı', count: 0 };
    }

    

    // Her admin'e mail gönder
    const emailPromises = adminEmails.map(async (email) => {
      try {
        const result = await queueService.addEmailJob({
          to: email,
          subject: `MHD-Verwaltung: ${totalCount} Produkt(e) müssen heute bearbeitet werden`,
          template: 'expiry-daily-reminder',
          data: {
            date: today.toLocaleDateString('de-DE'),
            criticalCount: unprocessedCriticalCount,
            warningCount: unprocessedWarningCount,
            totalCount: totalCount,
            storeName: allSettings.storeSettings?.storeName || 'Gruner SuperStore',
          },
          metadata: {
            type: 'expiry-daily-reminder',
            totalCount: totalCount,
          },
          priority: 2,
        });
        
        return { email, success: true };
      } catch (emailError) {
        console.error(`❌ Email gönderim hatası (${email}):`, emailError);
        return { email, success: false, error: emailError.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.success).length;

    

    return {
      success: true,
      message: `E-Mail wurde an ${successCount} Administrator(en) gesendet`,
      criticalCount: unprocessedCriticalCount,
      warningCount: unprocessedWarningCount,
      totalCount: totalCount,
      emailResults: results,
    };
  } catch (error) {
    console.error('❌ Günlük MHD bildirimi hatası:', error);
    return {
      success: false,
      message: 'Günlük MHD bildirimi sırasında hata oluştu',
      error: error.message,
    };
  }
};

/**
 * MHD'si bugün biten ürünler için işlem yapılmamış ürün sayısı 0 olduğunda adminlere mail gönder
 * Mail gönderilmesi için kritik ve warning tablolarında işlem yapılmamış ürün sayısı 0 olmalı
 */
export const checkExpiredProductsAndNotifyAdmins = async () => {
  try {
    
    
    
    
    const today = getToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    

    // Bugün bu mail daha önce gönderilmiş mi kontrol et
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const existingEmail = await prisma.emailLog.findFirst({
      where: {
        template: 'expiry-completion-notification',
        status: 'sent',
        sentAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (existingEmail) {
      
      
      return {
        success: true,
        message: 'Bugün bu mail zaten gönderilmiş',
        alreadySent: true,
        lastSentAt: existingEmail.sentAt,
      };
    }

    // Frontend'deki mantığı kullanarak işlem yapılmamış ürün sayılarını hesapla
    
    const unprocessedCriticalCount = await getUnprocessedCriticalCount();
    
    
    const unprocessedWarningCount = await getUnprocessedWarningCount();

    
    
    
    
    
    

    // Eğer her iki tabloda da işlem yapılmamış ürün varsa, mail gönderme
    if (unprocessedCriticalCount > 0 || unprocessedWarningCount > 0) {
      
      
      
      return {
        success: true,
        message: `Hala işlem yapılmamış ürünler var (Kritik: ${unprocessedCriticalCount}, Warning: ${unprocessedWarningCount})`,
        unprocessedCriticalCount,
        unprocessedWarningCount,
        shouldNotify: false,
      };
    }

    // Her iki tabloda da işlem yapılmamış ürün yoksa, mail gönder
    
    
    

    // Settings'den admin email listesini al
    const allSettings = await prisma.settings.findFirst();
    if (!allSettings || !allSettings.emailNotificationSettings?.adminEmail) {
      console.warn('⚠️  Admin email listesi bulunamadı');
      return { success: false, message: 'Admin email listesi bulunamadı', count: 0 };
    }

    const adminEmails = allSettings.emailNotificationSettings.adminEmail
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email && email.includes('@'));

    if (adminEmails.length === 0) {
      console.warn('⚠️  Geçerli admin email adresi bulunamadı');
      return { success: false, message: 'Geçerli admin email adresi bulunamadı', count: 0 };
    }

    

    // Bugün biten ve işlem yapılmış ürünleri bul (mail içeriği için)
    const todayExpiredProducts = await prisma.product.findMany({
      where: {
        expiryDate: {
          gte: today,
          lt: tomorrow, // Bugün bitenler
        },
        expiryActions: {
          some: {
            isUndone: false,
            actionType: {
              in: ['labeled', 'removed'],
            },
            createdAt: {
              gte: today,
            },
          },
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        expiryActions: {
          where: {
            isUndone: false,
            createdAt: {
              gte: today,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            admin: {
              select: {
                id: true,
                firstName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // İşlem yapılan ürünleri grupla
    const processedProducts = todayExpiredProducts.map((product) => {
      const lastAction = product.expiryActions[0];
      const actionDate = lastAction?.createdAt || new Date();
      return {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        category: product.category?.name || 'Allgemein',
        expiryDate: product.expiryDate,
        actionType: lastAction?.actionType || 'unknown',
        actionDate: actionDate.toLocaleDateString('de-DE') + ' ' + actionDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        adminName: lastAction?.admin
          ? lastAction.admin.firstName
          : 'Unbekannt',
        note: lastAction?.note || null,
      };
    });

    // Her admin'e mail gönder
    const emailPromises = adminEmails.map(async (email) => {
      try {
        const result = await queueService.addEmailJob({
          to: email,
          subject: `MHD-Verwaltung abgeschlossen - ${processedProducts.length} Produkt(e)`,
          template: 'expiry-completion-notification',
          data: {
            productCount: processedProducts.length,
            products: processedProducts,
            date: today.toLocaleDateString('de-DE'),
          },
          metadata: {
            type: 'expiry-completion-notification',
            productCount: processedProducts.length,
          },
          priority: 2,
        });
        
        return { email, success: true };
      } catch (emailError) {
        console.error(`❌ Email gönderim hatası (${email}):`, emailError);
        return { email, success: false, error: emailError.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.success).length;

    

    return {
      success: true,
      message: `E-Mail wurde an ${successCount} Administrator(en) gesendet`,
      count: processedProducts.length,
      unprocessedCriticalCount: 0,
      unprocessedWarningCount: 0,
      shouldNotify: true,
      emailResults: results,
    };
  } catch (error) {
    console.error('❌ MHD kontrolü hatası:', error);
    return {
      success: false,
      message: 'MHD kontrolü sırasında hata oluştu',
      error: error.message,
    };
  }
};

/**
 * Bugünkü işlemleri topla ve adminlere mail gönder
 * Dashboard'daki tüm işlenen ürünleri içerir
 */
export const sendTodayCompletionReport = async () => {
  try {
    const today = getToday();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Dashboard verilerini al
    const dashboard = await getExpiryDashboardData();

    // Bugün işlenen tüm ürünleri topla
    const todayProcessedProducts = dashboard.products.filter((product) => product.isProcessed);

    // Her ürün için işlem detaylarını al
    const processedProductsDetails = await Promise.all(
      todayProcessedProducts.map(async (product) => {
        // Bugün yapılan son işlemi bul
        const todayActions = await prisma.expiryAction.findMany({
          where: {
            productId: product.id,
            isUndone: false,
            createdAt: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            admin: {
              select: {
                id: true,
                firstName: true,
                email: true,
              },
            },
          },
        });

        const lastAction = todayActions[0];
        if (!lastAction) {
          return null;
        }

        const actionDate = lastAction.createdAt;
        let actionLabel = 'Unbekannt';
        const excludedFromCheck = lastAction.excludedFromCheck === true;
        if (lastAction.actionType === 'labeled') {
          actionLabel = 'Reduziert';
        } else if (lastAction.actionType === 'removed') {
          if (excludedFromCheck) {
            actionLabel = 'Deaktiviert';
          } else {
            actionLabel = 'Aussortiert';
          }
        }

        return {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          category: product.category?.name || 'Allgemein',
          expiryDate: product.expiryDate,
          actionType: lastAction.actionType,
          actionLabel,
          excludedFromCheck,
          actionDate: actionDate.toLocaleDateString('de-DE') + ' ' + actionDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
          adminName: lastAction.admin ? lastAction.admin.firstName : 'Unbekannt',
          adminEmail: lastAction.admin ? lastAction.admin.email : null,
          note: lastAction.note || null,
        };
      })
    );

    // Null değerleri filtrele
    const validProducts = processedProductsDetails.filter(Boolean);

    // Settings'den admin email listesini al
    const allSettings = await prisma.settings.findFirst();
    if (!allSettings || !allSettings.emailNotificationSettings?.adminEmail) {
      console.warn('⚠️  Admin email listesi bulunamadı');
      return { success: false, message: 'Admin email listesi bulunamadı', count: 0 };
    }

    const adminEmails = allSettings.emailNotificationSettings.adminEmail
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email && email.includes('@'));

    if (adminEmails.length === 0) {
      console.warn('⚠️  Geçerli admin email adresi bulunamadı');
      return { success: false, message: 'Geçerli admin email adresi bulunamadı', count: 0 };
    }

    // İstatistikleri hesapla
    const totalProducts = dashboard.stats.totalProducts;
    const processedCount = dashboard.stats.processedProducts;
    const pendingCount = dashboard.stats.pendingProducts;

    // İşlem türlerine göre grupla
    const actionStats = {
      labeled: validProducts.filter((p) => p.actionType === 'labeled').length,
      removed: validProducts.filter((p) => p.actionType === 'removed' && !p.excludedFromCheck).length,
      deactivated: validProducts.filter((p) => p.actionType === 'removed' && p.excludedFromCheck === true).length,
    };

    // Her admin'e mail gönder
    const emailPromises = adminEmails.map(async (email) => {
      try {
        const result = await queueService.addEmailJob({
          to: email,
          subject: `MHD-Verwaltung abgeschlossen - ${processedCount}/${totalProducts} Produkt(e) bearbeitet`,
          template: 'expiry-completion-notification',
          data: {
            date: today.toLocaleDateString('de-DE'),
            totalProducts,
            processedCount,
            pendingCount,
            actionStats,
            products: validProducts,
            productCount: validProducts.length,
            storeName: allSettings.storeSettings?.storeName || 'Gruner SuperStore',
          },
          metadata: {
            type: 'expiry-completion-notification',
            productCount: validProducts.length,
            date: today.toISOString(),
          },
          priority: 2,
        });

        return { email, success: true };
      } catch (emailError) {
        console.error(`❌ Email gönderim hatası (${email}):`, emailError);
        return { email, success: false, error: emailError.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.success).length;

    return {
      success: true,
      message: `E-Mail wurde an ${successCount} Administrator(en) gesendet`,
      totalProducts,
      processedCount,
      pendingCount,
      productCount: validProducts.length,
      emailResults: results,
    };
  } catch (error) {
    console.error('❌ Bugünkü işlem raporu gönderim hatası:', error);
    return {
      success: false,
      message: 'Bugünkü işlem raporu gönderilirken hata oluştu',
      error: error.message,
    };
  }
};
