import prisma from '../config/prisma.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * Kritik stok seviyesinin altındaki ürünleri getir
 */
export const getLowStockProducts = async () => {
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

