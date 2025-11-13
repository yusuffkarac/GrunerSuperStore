import prisma from '../config/prisma.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import queueService from './queue.service.js';

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

  const result = settings?.expiryManagementSettings || defaultSettings;

  return result;
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

  

  // criticalDays gün sonrasına kadar olan ürünler (DAHİL)
  // +1 gün ekleyip "lt" kullanarak sınır durumunu düzeltiyoruz
  const criticalDate = new Date(today);
  criticalDate.setDate(criticalDate.getDate() + settings.criticalDays + 1);

  

  // Bugün sonu
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const products = await prisma.product.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              // Normal critical aralığındaki ürünler
              expiryDate: {
                lt: criticalDate, // criticalDays günü DAHİL (< criticalDays+1)
                gte: today, // Geçmiş tarihli olanları hariç tut
              },
            },
            {
              // Bugün critical aralığında olan ama yeni tarih atanmış ürünler
              // Son işlem bugün yapılmışsa ve o işlemdeki tarih critical aralığındaysa
              expiryActions: {
                some: {
                  isUndone: false,
                  createdAt: {
                    gte: today, // Bugün yapılan işlemler
                    lte: todayEnd, // Bugünün sonu
                  },
                  expiryDate: {
                    gte: today,
                    lt: criticalDate,
                  },
                },
              },
            },
          ],
        },
        {
          // excludeFromExpiryCheck: false olanları veya excludeFromExpiryCheck: true olanları da getir (deaktif edilmiş ama listede kalacak)
          OR: [
            { excludeFromExpiryCheck: false },
            { excludeFromExpiryCheck: true },
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
    orderBy: {
      name: 'asc',
    },
  });

  // Son işlemi kontrol ederek filtrele
  // - excludeFromExpiryCheck true olanlar listede kalacak (Datum Eingeben için)
  // - Tüm ürünler listede kalacak (geri alma için ve tarih güncellemesi sonrası doğru aralıkta görünmesi için)
  const filteredProducts = products.filter(product => {
    // excludeFromExpiryCheck true ise listede kalacak (Datum Eingeben için)
    if (product.excludeFromExpiryCheck) {
      return true;
    }
    
    // Tüm ürünler listede kalacak (tarih güncellemesi sonrası doğru aralıkta görünmesi için)
    return true;
  });

  // Unique ürünleri döndür (aynı ürün birden fazla kez gelebilir çünkü OR koşulu var)
  const uniqueProducts = {};
  filteredProducts.forEach(product => {
    if (!uniqueProducts[product.id]) {
      uniqueProducts[product.id] = product;
    }
  });

  return Object.values(uniqueProducts).map(product => ({
    ...product,
    daysUntilExpiry: getDaysDifference(product.expiryDate, today),
    lastAction: product.expiryActions[0] || null,
    excludeFromExpiryCheck: product.excludeFromExpiryCheck === true, // Açıkça boolean olarak set et
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
  criticalDate.setDate(criticalDate.getDate() + settings.criticalDays + 1);

  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + settings.warningDays + 1);


  // Önce tüm warning aralığındaki ürünleri getir
  // Ayrıca bugün warning aralığında olan ama yeni tarih atanmış ürünleri de dahil et
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  
  const products = await prisma.product.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              // Normal warning aralığındaki ürünler
              expiryDate: {
                gte: criticalDate, // Kritik tarihten sonra (kritik günü hariç - çakışma önleme)
                lt: warningDate, // Warning gününü DAHİL (< warningDays+1)
              },
            },
            {
              // Bugün warning aralığında olan ama yeni tarih atanmış ürünler
              // Son işlem bugün yapılmışsa ve o işlemdeki tarih warning aralığındaysa
              expiryActions: {
                some: {
                  isUndone: false,
                  createdAt: {
                    gte: today, // Bugün yapılan işlemler
                    lte: todayEnd, // Bugünün sonu
                  },
                  expiryDate: {
                    gte: criticalDate,
                    lt: warningDate,
                  },
                },
              },
            },
          ],
        },
        {
          // excludeFromExpiryCheck: false olanları veya excludeFromExpiryCheck: true olanları da getir (deaktif edilmiş ama listede kalacak)
          OR: [
            { excludeFromExpiryCheck: false },
            { excludeFromExpiryCheck: true },
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
    orderBy: {
      name: 'asc',
    },
  });

  // Son işlemi kontrol ederek filtrele
  // - excludeFromExpiryCheck true olanlar listede kalacak (yeni tarih girilebilir)
  // - Tüm ürünler listede kalacak (geri alma için ve tarih güncellemesi sonrası doğru aralıkta görünmesi için)
  const filteredProducts = products.filter(product => {
    // excludeFromExpiryCheck true ise listede kalacak (yeni tarih girilebilir)
    if (product.excludeFromExpiryCheck) {
      return true;
    }
    
    // Tüm ürünler listede kalacak (tarih güncellemesi sonrası doğru aralıkta görünmesi için)
    return true;
  });

  // Unique ürünleri döndür (aynı ürün birden fazla kez gelebilir çünkü OR koşulu var)
  const uniqueProducts = {};
  filteredProducts.forEach(product => {
    if (!uniqueProducts[product.id]) {
      uniqueProducts[product.id] = product;
    }
  });

  return Object.values(uniqueProducts).map(product => ({
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
export const removeProduct = async (productId, adminId, excludeFromCheck = false, note = null, newExpiryDate = null) => {
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
  if (excludeFromCheck) {
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

/**
 * Frontend'deki getUnprocessedCriticalCount mantığını kullanarak
 * işlem yapılmamış kritik ürün sayısını hesapla
 */
const getUnprocessedCriticalCount = async () => {
  
  const products = await getCriticalProducts();
  const today = getToday();
  
  const unprocessed = products.filter(product => {
    // Deaktif edilmişse ve bugün deaktif edildiyse sayma
    // Ama önceki günlerde deaktif edildiyse tekrar işlem yapılması gerekir (yarın geri gelsin)
    if (product.excludeFromExpiryCheck === true) {
      // Son işlem varsa ve bugün yapıldıysa, bugün için işlem yapılmış sayılır
      if (product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone') {
        const actionDate = new Date(product.lastAction.createdAt);
        actionDate.setHours(0, 0, 0, 0);
        const todayDate = new Date(today);
        todayDate.setHours(0, 0, 0, 0);
        
        if (actionDate.getTime() === todayDate.getTime()) {
          return false; // Bugün deaktif edildi, sayma
        }
      }
      // Önceki günlerde deaktif edilmişse, yarın tekrar işlem yapılması gerekir
      return true; // İşlem yapılmamış sayılır (yarın geri gelecek)
    }
    
    // İşlem yapılmışsa ve bugün yapıldıysa sayma
    if (product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone') {
      const actionDate = new Date(product.lastAction.createdAt);
      actionDate.setHours(0, 0, 0, 0);
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      
      if (actionDate.getTime() === todayDate.getTime()) {
        return false; // Bugün işlem yapıldı, sayma
      }
    }
    
    return true;
  });
  
  const count = unprocessed.length;
  
  return count;
};

/**
 * Frontend'deki getUnprocessedWarningCount mantığını kullanarak
 * işlem yapılmamış warning ürün sayısını hesapla
 */
const getUnprocessedWarningCount = async () => {
  
  const products = await getWarningProducts();
  const today = getToday();
  
  const unprocessed = products.filter(product => {
    // Deaktif edilmişse ve bugün deaktif edildiyse sayma
    // Ama önceki günlerde deaktif edildiyse tekrar işlem yapılması gerekir (yarın geri gelsin)
    if (product.excludeFromExpiryCheck === true) {
      // Son işlem varsa ve bugün yapıldıysa, bugün için işlem yapılmış sayılır
      if (product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone') {
        const actionDate = new Date(product.lastAction.createdAt);
        actionDate.setHours(0, 0, 0, 0);
        const todayDate = new Date(today);
        todayDate.setHours(0, 0, 0, 0);
        
        if (actionDate.getTime() === todayDate.getTime()) {
          return false; // Bugün deaktif edildi, sayma
        }
      }
      // Önceki günlerde deaktif edilmişse, yarın tekrar işlem yapılması gerekir
      return true; // İşlem yapılmamış sayılır (yarın geri gelecek)
    }
    
    // İşlem yapılmışsa ve bugün yapıldıysa sayma
    if (product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone') {
      const actionDate = new Date(product.lastAction.createdAt);
      actionDate.setHours(0, 0, 0, 0);
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      
      if (actionDate.getTime() === todayDate.getTime()) {
        return false; // Bugün işlem yapıldı, sayma
      }
    }
    
    return true;
  });
  
  const count = unprocessed.length;
  
  return count;
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
      message: `${successCount} admin'e mail gönderildi`,
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
      message: `${successCount} admin'e mail gönderildi`,
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
