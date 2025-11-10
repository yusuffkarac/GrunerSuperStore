import prisma from '../config/prisma.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * SKT ayarlarını getir
 */
export const getExpirySettings = async () => {
  const settings = await prisma.settings.findFirst();

  const defaultSettings = {
    enabled: true,
    warningDays: 3, // Turuncu etiket için
    criticalDays: 0, // Kırmızı (aynı gün) için
  };

  return settings?.expiryManagementSettings || defaultSettings;
};

/**
 * Bugünün tarihini al (saat bilgisi olmadan)
 */
const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * İki tarih arasındaki gün farkını hesapla
 */
const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d1 - d2;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Kritik ürünleri getir (son gün olanlar - kırmızı)
 */
export const getCriticalProducts = async () => {
  const settings = await getExpirySettings();
  const today = getToday();

  // criticalDays gün sonrasına kadar olan ürünler
  const criticalDate = new Date(today);
  criticalDate.setDate(criticalDate.getDate() + settings.criticalDays);

  const products = await prisma.product.findMany({
    where: {
      expiryDate: {
        lte: criticalDate,
        gte: today, // Geçmiş tarihli olanları hariç tut
      },
      excludeFromExpiryCheck: false,
      isActive: true,
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
    orderBy: {
      expiryDate: 'asc',
    },
  });

  // Son işlemi kontrol ederek filtrele (etiketlenmiş veya kaldırılmış olanları çıkar)
  const filteredProducts = products.filter(product => {
    const lastAction = product.expiryActions[0];
    if (!lastAction) return true;
    // Son işlem labeled veya removed ise ve geri alınmamışsa listeden çıkar
    if ((lastAction.actionType === 'labeled' || lastAction.actionType === 'removed') && !lastAction.isUndone) {
      return false;
    }
    return true;
  });

  return filteredProducts.map(product => ({
    ...product,
    daysUntilExpiry: getDaysDifference(product.expiryDate, today),
    lastAction: product.expiryActions[0] || null,
  }));
};

/**
 * Uyarı gerektiren ürünleri getir (warning days kalanlar - turuncu)
 */
export const getWarningProducts = async () => {
  const settings = await getExpirySettings();
  const today = getToday();

  // criticalDays'den sonra, warningDays'e kadar olan ürünler
  const criticalDate = new Date(today);
  criticalDate.setDate(criticalDate.getDate() + settings.criticalDays);

  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + settings.warningDays);

  const products = await prisma.product.findMany({
    where: {
      expiryDate: {
        gt: criticalDate, // Kritik tarihten sonra
        lte: warningDate, // Warning tarihine kadar
      },
      excludeFromExpiryCheck: false,
      isActive: true,
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
    orderBy: {
      expiryDate: 'asc',
    },
  });

  // Son işlemi kontrol ederek filtrele (etiketlenmiş veya kaldırılmış olanları çıkar)
  const filteredProducts = products.filter(product => {
    const lastAction = product.expiryActions[0];
    if (!lastAction) return true;
    // Son işlem labeled veya removed ise ve geri alınmamışsa listeden çıkar
    if ((lastAction.actionType === 'labeled' || lastAction.actionType === 'removed') && !lastAction.isUndone) {
      return false;
    }
    return true;
  });

  return filteredProducts.map(product => ({
    ...product,
    daysUntilExpiry: getDaysDifference(product.expiryDate, today),
    lastAction: product.expiryActions[0] || null,
  }));
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

  if (product.excludeFromExpiryCheck) {
    throw new BadRequestError('Bu ürün SKT kontrolünden muaf tutulmuş');
  }

  const today = getToday();
  const daysUntilExpiry = getDaysDifference(product.expiryDate, today);

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
export const removeProduct = async (productId, adminId, excludeFromCheck = false, note = null) => {
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

  // Eğer excludeFromCheck true ise, ürünü SKT kontrolünden muaf tut
  if (excludeFromCheck) {
    await prisma.product.update({
      where: { id: productId },
      data: { excludeFromExpiryCheck: true },
    });
  }

  // İşlemi kaydet
  const action = await prisma.expiryAction.create({
    data: {
      productId,
      adminId,
      actionType: 'removed',
      expiryDate: product.expiryDate,
      daysUntilExpiry,
      excludedFromCheck: excludeFromCheck,
      note,
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
  const { adminId, productId, actionType, limit = 100, offset = 0 } = filters;

  const where = {
    ...(adminId && { adminId }),
    ...(productId && { productId }),
    ...(actionType && { actionType }),
  };

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
      orderBy: {
        createdAt: 'desc',
      },
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

  // İşlemi geri alındı olarak işaretle
  await prisma.expiryAction.update({
    where: { id: actionId },
    data: {
      isUndone: true,
      undoneAt: new Date(),
      undoneBy: adminId,
    },
  });

  // Eğer bu bir "removed" işlemi ve excludeFromCheck yapılmışsa, onu geri al
  if (action.actionType === 'removed' && action.excludedFromCheck) {
    await prisma.product.update({
      where: { id: action.productId },
      data: { excludeFromExpiryCheck: false },
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
      note: `Geri alındı: ${action.actionType}`,
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
 * SKT ayarlarını güncelle
 */
export const updateExpirySettings = async (newSettings) => {
  const settings = await prisma.settings.findFirst();

  if (!settings) {
    throw new NotFoundError('Ayarlar bulunamadı');
  }

  const updatedSettings = await prisma.settings.update({
    where: { id: settings.id },
    data: {
      expiryManagementSettings: newSettings,
    },
  });

  return updatedSettings.expiryManagementSettings;
};
