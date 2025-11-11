import prisma from '../config/prisma.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import queueService from './queue.service.js';

/**
 * Kritik stok seviyesinin altındaki ürünleri getir
 */
export const getLowStockProducts = async () => {
  try {
    // Raw SQL ile doğru filtreleme yap (Prisma'da bir alanı başka bir alanla karşılaştırmak zor)
    const filteredProducts = await prisma.$queryRaw`
      SELECT
        p.id,
        p.name,
        p.stock,
        p.low_stock_level as "lowStockLevel",
        p.supplier,
        p.unit,
        p.barcode,
        p.brand,
        p.image_urls as "imageUrls",
        c.id as "categoryId",
        c.name as "categoryName"
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      AND p.stock <= COALESCE(p.low_stock_level, 0)
      AND p.low_stock_level IS NOT NULL
      ORDER BY p.stock ASC
    `;

  // Her ürün için son siparişi getir
  const productsWithOrders = await Promise.all(
    filteredProducts.map(async (product) => {
      const lastOrder = await prisma.stockOrder.findFirst({
        where: {
          productId: product.id,
          isUndone: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
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

      // imageUrls'i parse et (JSONB olarak gelebilir)
      let imageUrls = [];
      if (product.imageUrls) {
        if (typeof product.imageUrls === 'string') {
          try {
            imageUrls = JSON.parse(product.imageUrls);
          } catch (e) {
            imageUrls = [];
          }
        } else if (Array.isArray(product.imageUrls)) {
          imageUrls = product.imageUrls;
        } else {
          imageUrls = [];
        }
      }

      return {
        id: product.id,
        name: product.name,
        stock: Number(product.stock),
        lowStockLevel: product.lowStockLevel ? Number(product.lowStockLevel) : null,
        supplier: product.supplier || null,
        unit: product.unit || null,
        barcode: product.barcode || null,
        brand: product.brand || null,
        imageUrls: imageUrls,
        category: product.categoryName
          ? {
              id: product.categoryId,
              name: product.categoryName,
            }
          : null,
        lastOrder: lastOrder || null,
      };
    })
  );

    return productsWithOrders;
  } catch (error) {
    console.error('❌ getLowStockProducts hatası:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Sipariş geçmişini getir
 */
export const getStockOrderHistory = async (filters = {}) => {
  const { productId, status, limit = 1000, offset = 0, date } = filters;

  const where = {
    ...(productId && { productId }),
    ...(status && { status }),
  };

  // Tarih filtresi ekle
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

  const [orders, total] = await Promise.all([
    prisma.stockOrder.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            barcode: true,
            supplier: true,
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
        undoneByAdmin: {
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
    prisma.stockOrder.count({ where }),
  ]);

  return {
    orders,
    total,
    limit,
    offset,
  };
};

/**
 * Yeni sipariş oluştur
 */
export const createStockOrder = async (productId, adminId, data) => {
  const { orderQuantity, expectedDeliveryDate, note, status = 'pending' } = data;

  if (!orderQuantity || orderQuantity <= 0) {
    throw new BadRequestError('Sipariş miktarı geçerli olmalıdır');
  }

  // Status kontrolü - sadece 'pending' veya 'ordered' olabilir
  if (status !== 'pending' && status !== 'ordered') {
    throw new BadRequestError('Geçersiz sipariş durumu');
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundError('Ürün bulunamadı');
  }

  // Yeni sipariş oluştur
  const order = await prisma.stockOrder.create({
    data: {
      productId,
      adminId,
      status: status, // Frontend'den gelen status'u kullan
      orderQuantity: parseInt(orderQuantity),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      note: note || null,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          stock: true,
          lowStockLevel: true,
          supplier: true,
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
  });

  return order;
};

/**
 * Sipariş durumunu güncelle
 */
export const updateStockOrderStatus = async (orderId, status, adminId, data = {}) => {
  const { expectedDeliveryDate, actualDeliveryDate, note, orderQuantity } = data;

  const order = await prisma.stockOrder.findUnique({
    where: { id: orderId },
    include: {
      product: true,
    },
  });

  if (!order) {
    throw new NotFoundError('Sipariş bulunamadı');
  }

  if (order.isUndone) {
    throw new BadRequestError('Bu sipariş geri alınmış, güncellenemez');
  }

  // Durum geçişlerini kontrol et
  const validTransitions = {
    pending: ['ordered', 'cancelled'],
    ordered: ['delivered', 'cancelled'],
    delivered: [], // Teslim edildikten sonra değiştirilemez
    cancelled: [], // İptal edildikten sonra değiştirilemez
  };

  if (!validTransitions[order.status]?.includes(status)) {
    throw new BadRequestError(`Geçersiz durum geçişi: ${order.status} -> ${status}`);
  }

  // Miktar kontrolü
  if (orderQuantity !== undefined && orderQuantity !== null) {
    const newQuantity = parseInt(orderQuantity);
    if (newQuantity <= 0) {
      throw new BadRequestError('Sipariş miktarı geçerli olmalıdır');
    }
  }

  const updateData = {
    status,
    ...(expectedDeliveryDate && { expectedDeliveryDate: new Date(expectedDeliveryDate) }),
    ...(actualDeliveryDate && { actualDeliveryDate: new Date(actualDeliveryDate) }),
    ...(note !== undefined && { note }),
    ...(orderQuantity !== undefined && { orderQuantity: parseInt(orderQuantity) }),
  };

  // Eğer durum 'delivered' ise, ürün stokunu güncelle
  if (status === 'delivered') {
    const quantityToAdd = orderQuantity !== undefined ? parseInt(orderQuantity) : order.orderQuantity;
    
    // Eğer sipariş zaten delivered durumundaysa ve miktar değiştiyse, stok farkını güncelle
    if (order.status === 'delivered' && orderQuantity !== undefined && parseInt(orderQuantity) !== order.orderQuantity) {
      const quantityDiff = parseInt(orderQuantity) - order.orderQuantity;
      await prisma.product.update({
        where: { id: order.productId },
        data: {
          stock: {
            increment: quantityDiff,
          },
        },
      });
    } else {
      // İlk kez delivered durumuna geçiyorsa
      await prisma.product.update({
        where: { id: order.productId },
        data: {
          stock: {
            increment: quantityToAdd,
          },
        },
      });
    }

    // Eğer actualDeliveryDate verilmemişse, bugünü set et
    if (!actualDeliveryDate) {
      updateData.actualDeliveryDate = new Date();
    }
  }

  // Siparişi güncelle
  const updatedOrder = await prisma.stockOrder.update({
    where: { id: orderId },
    data: updateData,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          stock: true,
          lowStockLevel: true,
          supplier: true,
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
  });

  return updatedOrder;
};

/**
 * Siparişi geri al
 */
export const undoStockOrder = async (orderId, adminId) => {
  const order = await prisma.stockOrder.findUnique({
    where: { id: orderId },
    include: {
      product: true,
    },
  });

  if (!order) {
    throw new NotFoundError('Sipariş bulunamadı');
  }

  if (order.isUndone) {
    throw new BadRequestError('Bu sipariş zaten geri alınmış');
  }

  // Eğer sipariş teslim edilmişse, stoku geri al
  if (order.status === 'delivered') {
    await prisma.product.update({
      where: { id: order.productId },
      data: {
        stock: {
          decrement: order.orderQuantity,
        },
      },
    });
  }

  // Siparişi geri alındı olarak işaretle
  await prisma.stockOrder.update({
    where: { id: orderId },
    data: {
      isUndone: true,
      undoneAt: new Date(),
      undoneBy: adminId,
    },
  });

  const undoneOrder = await prisma.stockOrder.findUnique({
    where: { id: orderId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          stock: true,
          lowStockLevel: true,
          supplier: true,
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
      undoneByAdmin: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  return undoneOrder;
};

/**
 * Ürün tedarikçisini güncelle
 */
export const updateProductSupplier = async (productId, supplier) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundError('Ürün bulunamadı');
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: {
      supplier: supplier || null,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedProduct;
};

/**
 * Yeni sipariş listesi oluştur
 */
export const createStockOrderList = async (adminId, data) => {
  const { name, note, supplierEmail, sendToAdmins, sendToSupplier, orders } = data;

  if (!name || name.trim().length === 0) {
    throw new BadRequestError('Liste ismi gereklidir');
  }

  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    throw new BadRequestError('En az bir ürün seçilmelidir');
  }

  // Supplier email kontrolü
  if (sendToSupplier && (!supplierEmail || !supplierEmail.includes('@'))) {
    throw new BadRequestError('Supplier email adresi geçerli olmalıdır');
  }

  // Transaction içinde liste ve siparişleri oluştur
  const result = await prisma.$transaction(async (tx) => {
    // Liste oluştur
    const orderList = await tx.stockOrderList.create({
      data: {
        name: name.trim(),
        note: note || null,
        supplierEmail: supplierEmail ? supplierEmail.trim().toLowerCase() : null,
        sendToAdmins: sendToAdmins || false,
        sendToSupplier: sendToSupplier || false,
        adminId,
        status: 'pending',
      },
    });

    // Siparişleri oluştur
    const createdOrders = await Promise.all(
      orders.map(async (orderData) => {
        const { productId, orderQuantity, orderUnit, expectedDeliveryDate, note: orderNote } = orderData;

        if (!productId || !orderQuantity || orderQuantity <= 0) {
          throw new BadRequestError('Geçersiz sipariş verisi');
        }

        // Ürün kontrolü
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new NotFoundError(`Ürün bulunamadı: ${productId}`);
        }

        return tx.stockOrder.create({
          data: {
            productId,
            adminId,
            orderListId: orderList.id,
            status: 'pending',
            orderQuantity: parseInt(orderQuantity),
            orderUnit: orderUnit || null,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
            note: orderNote || null,
          },
        });
      })
    );

    // Liste ile birlikte siparişleri getir
    const orderListWithOrders = await tx.stockOrderList.findUnique({
      where: { id: orderList.id },
      include: {
        admin: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
        orders: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                stock: true,
                lowStockLevel: true,
                supplier: true,
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
        },
      },
    });

    return orderListWithOrders;
  });

  // Mail gönderimi (transaction'dan sonra)
  try {
    const settings = await prisma.settings.findFirst();

    // SMTP ayarları yoksa mail gönderme
    if (settings?.smtpSettings) {
      const statusLabels = {
        pending: 'Ausstehend',
        ordered: 'Bestellt',
        delivered: 'Geliefert',
        cancelled: 'Storniert',
      };

      const createdDate = new Date(result.createdAt).toLocaleString('de-DE');
      const items = result.orders.map((order) => ({
        productName: order.product.name,
        quantity: order.orderQuantity,
        unit: order.orderUnit || order.product.unit || '',
        categoryName: order.product.category?.name || null,
        barcode: order.product.barcode || null,
      }));

      const adminOrderUrl = `${process.env.ADMIN_URL || 'http://localhost:5173/admin'}/stock/lists/${result.id}`;

      // Adminlere mail gönder
      if (sendToAdmins) {
        const adminEmail = settings.emailNotificationSettings?.adminEmail;
        if (adminEmail) {
          const adminEmails = adminEmail
            .split(',')
            .map((email) => email.trim())
            .filter((email) => email && email.includes('@'));

          const emailPromises = adminEmails.map(async (email) => {
            try {
              await queueService.addEmailJob({
                to: email,
                subject: `Neue Bestellliste: ${result.name}`,
                template: 'stock-order-list-notification',
                data: {
                  listName: result.name,
                  createdDate,
                  createdBy: result.admin.firstName,
                  status: statusLabels[result.status] || result.status,
                  note: result.note,
                  items,
                  itemCount: items.length,
                  adminOrderUrl,
                },
                metadata: { listId: result.id, type: 'stock-order-list-notification-admin' },
                priority: 2,
              });
              return { email, success: true };
            } catch (emailError) {
              console.error(`❌ Email gönderim hatası (${email}):`, emailError);
              return { email, success: false, error: emailError.message };
            }
          });

          await Promise.all(emailPromises);
        }
      }

      // Supplier'a mail gönder
      if (sendToSupplier && supplierEmail) {
        try {
          await queueService.addEmailJob({
            to: supplierEmail.trim().toLowerCase(),
            subject: `Bestellliste: ${result.name}`,
            template: 'stock-order-list-notification',
            data: {
              listName: result.name,
              createdDate,
              createdBy: result.admin.firstName,
              status: statusLabels[result.status] || result.status,
              note: result.note,
              items,
              itemCount: items.length,
            },
            metadata: { listId: result.id, type: 'stock-order-list-notification-supplier' },
            priority: 2,
          });
        } catch (emailError) {
          console.error(`❌ Supplier email gönderim hatası:`, emailError);
        }
      }
    }
  } catch (mailError) {
    // Mail hatası liste oluşturmayı engellemez, sadece log at
    console.error('⚠️  Mail gönderim hatası (liste oluşturuldu):', mailError);
  }

  return result;
};

/**
 * Sipariş listelerini getir
 */
export const getStockOrderLists = async (filters = {}) => {
  const { status, limit = 1000, offset = 0, date } = filters;

  const where = {
    ...(status && { status }),
  };

  // Tarih filtresi ekle
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

  const [lists, total] = await Promise.all([
    prisma.stockOrderList.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
        orders: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                supplier: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.stockOrderList.count({ where }),
  ]);

  return {
    lists,
    total,
    limit,
    offset,
  };
};

/**
 * Sipariş listesi detayını getir
 */
export const getStockOrderListById = async (listId) => {
  const orderList = await prisma.stockOrderList.findUnique({
    where: { id: listId },
    include: {
      admin: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
      orders: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              stock: true,
              lowStockLevel: true,
              supplier: true,
              barcode: true,
              unit: true,
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
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!orderList) {
    throw new NotFoundError('Sipariş listesi bulunamadı');
  }

  return orderList;
};

/**
 * Sipariş listesi durumunu güncelle
 */
export const updateStockOrderListStatus = async (listId, status, adminId) => {
  const orderList = await prisma.stockOrderList.findUnique({
    where: { id: listId },
    include: {
      orders: true,
    },
  });

  if (!orderList) {
    throw new NotFoundError('Sipariş listesi bulunamadı');
  }

  // Durum geçişlerini kontrol et
  const validTransitions = {
    pending: ['ordered', 'cancelled'],
    ordered: ['delivered', 'cancelled'],
    delivered: [], // Teslim edildikten sonra değiştirilemez
    cancelled: [], // İptal edildikten sonra değiştirilemez
  };

  if (!validTransitions[orderList.status]?.includes(status)) {
    throw new BadRequestError(`Geçersiz durum geçişi: ${orderList.status} -> ${status}`);
  }

  // Transaction içinde liste ve sipariş durumlarını güncelle
  const result = await prisma.$transaction(async (tx) => {
    // Liste durumunu güncelle
    const updatedList = await tx.stockOrderList.update({
      where: { id: listId },
      data: { status },
    });

    // Liste içindeki tüm siparişlerin durumunu güncelle
    await tx.stockOrder.updateMany({
      where: {
        orderListId: listId,
        isUndone: false,
      },
      data: { status },
    });

    // Eğer durum 'delivered' ise, tüm siparişlerin ürün stoklarını güncelle
    if (status === 'delivered') {
      for (const order of orderList.orders) {
        if (!order.isUndone) {
          await tx.product.update({
            where: { id: order.productId },
            data: {
              stock: {
                increment: order.orderQuantity,
              },
            },
          });
        }
      }
    }

    // Güncellenmiş listeyi getir
    return tx.stockOrderList.findUnique({
      where: { id: listId },
      include: {
        admin: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
        orders: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                stock: true,
                lowStockLevel: true,
                supplier: true,
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
        },
      },
    });
  });

  return result;
};

