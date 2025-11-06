import prisma from '../config/prisma.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../utils/errors.js';

class OrderService {
  // Sipariş oluştur
  async createOrder(userId, orderData) {
    const { type, addressId, paymentType, note, items } = orderData;

    // Validation: items kontrolü
    if (!items || items.length === 0) {
      throw new ValidationError('Bestellung muss mindestens ein Produkt enthalten');
    }

    // Validation: delivery için adres kontrolü
    if (type === 'delivery' && !addressId) {
      throw new ValidationError('Lieferadresse ist erforderlich');
    }

    // Adres kontrolü (varsa)
    if (addressId) {
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId: userId,
        },
      });

      if (!address) {
        throw new NotFoundError('Adresse nicht gefunden');
      }
    }

    return await prisma.$transaction(async (tx) => {
      // Ürün bilgilerini ve stok kontrolü
      const productIds = items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new ValidationError('Einige Produkte wurden nicht gefunden');
      }

      // Stok kontrolü ve fiyat hesaplama
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);

        if (!product) {
          throw new NotFoundError(`Produkt ${item.productId} nicht gefunden`);
        }

        if (product.stock < item.quantity) {
          throw new ValidationError(
            `${product.name} ist nicht auf Lager. Verfügbar: ${product.stock}`
          );
        }

        const itemTotal = parseFloat(product.price) * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: item.quantity,
          unit: product.unit,
          brand: product.brand,
          imageUrl: Array.isArray(product.imageUrls)
            ? product.imageUrls[0]
            : null,
        });
      }

      // Delivery fee hesaplama (şimdilik sabit, gelecekte delivery_zones'dan alınacak)
      const deliveryFee = type === 'delivery' ? 5.0 : 0;
      const total = subtotal + deliveryFee;

      // Sipariş numarası oluştur
      const orderNo = await this.generateOrderNumber();

      // Siparişi oluştur
      const order = await tx.order.create({
        data: {
          userId,
          orderNo,
          type,
          status: 'pending',
          addressId: addressId || null,
          deliveryFee,
          subtotal,
          total,
          paymentType: paymentType || 'none',
          note: note || null,
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  imageUrls: true,
                },
              },
            },
          },
          address: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      // Stokları güncelle
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Cart'ı temizle (varsa)
      await tx.cartItem.deleteMany({
        where: {
          userId,
          productId: { in: productIds },
        },
      });

      return order;
    });
  }

  // Kullanıcının siparişlerini getir
  async getOrders(userId, filters = {}) {
    const { status, type, page = 1, limit = 10 } = filters;

    const where = {
      userId,
      ...(status && { status }),
      ...(type && { type }),
    };

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrls: true,
                },
              },
            },
          },
          address: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Sipariş detayı
  async getOrderById(orderId, userId, isAdmin = false) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrls: true,
                isActive: true,
              },
            },
          },
        },
        address: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    // Kullanıcı kendi siparişi değilse ve admin değilse erişim engelle
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenError('Zugriff auf diese Bestellung verweigert');
    }

    return order;
  }

  // Admin: Tüm siparişleri getir
  async getAllOrders(filters = {}) {
    const { status, type, search, page = 1, limit = 20 } = filters;

    const where = {
      ...(status && { status }),
      ...(type && { type }),
      ...(search && {
        OR: [
          { orderNo: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          {
            user: {
              firstName: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          orderItems: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              price: true,
            },
          },
          address: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Sipariş durumu güncelle (Admin)
  async updateOrderStatus(orderId, status) {
    const validStatuses = [
      'pending',
      'accepted',
      'preparing',
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      throw new ValidationError('Ungültiger Bestellstatus');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    // Cancelled durumuna geçerken stokları geri ekle
    if (status === 'cancelled' && order.status !== 'cancelled') {
      await prisma.$transaction(async (tx) => {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status },
        });
      });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { status },
      });
    }

    // Güncellenmiş siparişi getir
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        address: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  // Kullanıcı sipariş iptali
  async cancelOrder(orderId, userId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    if (order.userId !== userId) {
      throw new ForbiddenError('Zugriff auf diese Bestellung verweigert');
    }

    // Sadece pending veya accepted durumundaki siparişler iptal edilebilir
    if (!['pending', 'accepted'].includes(order.status)) {
      throw new ValidationError(
        'Diese Bestellung kann nicht mehr storniert werden'
      );
    }

    // Stokları geri ekle ve sipariş durumunu güncelle
    return await prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      return await tx.order.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
        include: {
          orderItems: true,
          address: true,
        },
      });
    });
  }

  // Sipariş istatistikleri (Admin)
  async getOrderStats() {
    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'pending' } }),
      prisma.order.count({ where: { status: 'delivered' } }),
      prisma.order.count({ where: { status: 'cancelled' } }),
      prisma.order.aggregate({
        where: { status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: totalRevenue._sum.total || 0,
    };
  }

  // Sipariş numarası oluştur (örnek: GS-20250105-0001)
  async generateOrderNumber() {
    // Settings'ten format ayarlarını al
    const settings = await prisma.settings.findFirst();
    const format = settings?.orderIdFormat || {
      prefix: 'GS',
      separator: '-',
      dateFormat: 'YYYYMMDD',
      numberFormat: 'sequential',
      numberPadding: 4,
      resetPeriod: 'daily',
      caseTransform: 'uppercase',
      startFrom: 1,
    };

    const today = new Date();
    let dateStr = '';
    let searchPrefix = '';

    // Tarih formatını oluştur
    if (format.dateFormat && format.dateFormat !== 'none') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');

      switch (format.dateFormat) {
        case 'YYYYMMDD':
          dateStr = `${year}${month}${day}`;
          break;
        case 'YYMMDD':
          dateStr = `${String(year).slice(-2)}${month}${day}`;
          break;
        case 'DDMMYYYY':
          dateStr = `${day}${month}${year}`;
          break;
        case 'DDMMYY':
          dateStr = `${day}${month}${String(year).slice(-2)}`;
          break;
        case 'YYYYMM':
          dateStr = `${year}${month}`;
          break;
        case 'YYMM':
          dateStr = `${String(year).slice(-2)}${month}`;
          break;
        default:
          dateStr = `${year}${month}${day}`;
      }
    }

    // Reset period'a göre search prefix oluştur
    const prefix = format.prefix || '';
    const separator = format.separator || '';

    if (format.resetPeriod === 'daily') {
      searchPrefix = dateStr
        ? `${prefix}${separator}${dateStr}${separator}`
        : `${prefix}${separator}`;
    } else if (format.resetPeriod === 'monthly') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      searchPrefix = `${prefix}${separator}${year}${month}${separator}`;
    } else if (format.resetPeriod === 'yearly') {
      const year = today.getFullYear();
      searchPrefix = `${prefix}${separator}${year}${separator}`;
    } else {
      // never - hiç reset olmasın
      searchPrefix = `${prefix}${separator}`;
    }

    // Sipariş numarasını oluştur
    const padding = format.numberPadding || 4;
    let sequenceStr = '';

    if (format.numberFormat === 'random') {
      // Random numara üret - unique olana kadar dene
      const maxAttempts = 10;
      let attempts = 0;
      let isUnique = false;

      while (!isUnique && attempts < maxAttempts) {
        // Random numara üret
        const maxNumber = Math.pow(10, padding) - 1;
        const randomNum = Math.floor(Math.random() * (maxNumber + 1));
        sequenceStr = randomNum.toString().padStart(padding, '0');

        // Bu numarayla başka sipariş var mı kontrol et
        const testOrderNo = dateStr
          ? `${prefix}${separator}${dateStr}${separator}${sequenceStr}`
          : `${prefix}${separator}${sequenceStr}`;

        const existingOrder = await prisma.order.findFirst({
          where: {
            orderNo: format.caseTransform === 'uppercase'
              ? testOrderNo.toUpperCase()
              : format.caseTransform === 'lowercase'
              ? testOrderNo.toLowerCase()
              : testOrderNo,
          },
        });

        if (!existingOrder) {
          isUnique = true;
        }
        attempts++;
      }

      // Eğer 10 denemede unique bulamazsa, timestamp ekle
      if (!isUnique) {
        const timestamp = Date.now().toString().slice(-padding);
        sequenceStr = timestamp.padStart(padding, '0');
      }
    } else {
      // Sequential (sıralı) numara
      const lastOrder = await prisma.order.findFirst({
        where: {
          orderNo: {
            startsWith: searchPrefix,
          },
        },
        orderBy: {
          orderNo: 'desc',
        },
      });

      let sequence = parseInt(format.startFrom ?? 1) || 1;
      if (lastOrder) {
        // Son sipariş numarasından sequence'i çıkar
        const parts = lastOrder.orderNo.split(separator);
        const lastPart = parts[parts.length - 1];
        sequence = parseInt(lastPart) + 1;
      }

      sequenceStr = sequence.toString().padStart(padding, '0');
    }

    let orderNo = '';
    if (dateStr) {
      orderNo = `${prefix}${separator}${dateStr}${separator}${sequenceStr}`;
    } else {
      orderNo = `${prefix}${separator}${sequenceStr}`;
    }

    // Case transform uygula
    if (format.caseTransform === 'uppercase') {
      orderNo = orderNo.toUpperCase();
    } else if (format.caseTransform === 'lowercase') {
      orderNo = orderNo.toLowerCase();
    }

    return orderNo;
  }
}

export default new OrderService();
