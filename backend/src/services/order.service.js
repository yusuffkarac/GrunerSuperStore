import prisma from '../config/prisma.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../utils/errors.js';
import { getGermanyTimeInMinutes, getGermanyDate } from '../utils/date.js';
import { validateDistance } from '../utils/distance.js';
import couponService from './coupon.service.js';
import queueService from './queue.service.js';
import notificationService from './notification.service.js';
import notificationTemplateService from './notification-template.service.js';
import invoiceService from './invoice.service.js';
import productService from './product.service.js';
import discountCalculator from '../utils/discountCalculator.js';

class OrderService {
  // Sipariş oluştur
  async createOrder(userId, orderData) {
    const { type, addressId, billingAddressId, paymentType, note, items, couponCode } = orderData;

    // Validation: items kontrolü
    if (!items || items.length === 0) {
      throw new ValidationError('Bestellung muss mindestens ein Produkt enthalten');
    }

    // Validation: delivery için adres kontrolü
    if (type === 'delivery' && !addressId) {
      throw new ValidationError('Lieferadresse ist erforderlich');
    }

    // Adres kontrolü (varsa)
    let address = null;
    if (addressId) {
      address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId: userId,
        },
      });

      if (!address) {
        throw new NotFoundError('Adresse nicht gefunden');
      }
    }

    // Fatura adresi kontrolü (varsa)
    let billingAddress = null;
    if (billingAddressId) {
      billingAddress = await prisma.address.findFirst({
        where: {
          id: billingAddressId,
          userId: userId,
        },
      });

      if (!billingAddress) {
        throw new NotFoundError('Rechnungsadresse nicht gefunden');
      }
    }

    return await prisma.$transaction(async (tx) => {
      // Ayarları çek
      const settings = await tx.settings.findFirst();
      
      // Sipariş saat kontrolü
      if (settings?.deliverySettings) {
        const { siparisBaslangicSaati, siparisKapanisSaati } = settings.deliverySettings;
        
        if (siparisBaslangicSaati || siparisKapanisSaati) {
          // Almanya saatine göre zamanı al (CET/CEST otomatik olarak handle edilir)
          const currentTime = getGermanyTimeInMinutes();
          
          // Başlangıç saati kontrolü
          if (siparisBaslangicSaati) {
            const [startHour, startMinute] = siparisBaslangicSaati.split(':').map(Number);
            const startTime = startHour * 60 + startMinute;
            
            if (currentTime < startTime) {
              throw new ValidationError(
                `Bestellungen werden erst ab ${siparisBaslangicSaati} Uhr angenommen`
              );
            }
          }
          
          // Kapanış saati kontrolü
          if (siparisKapanisSaati) {
            const [endHour, endMinute] = siparisKapanisSaati.split(':').map(Number);
            const endTime = endHour * 60 + endMinute;
            
            if (currentTime >= endTime) {
              throw new ValidationError(
                `Bestellungen werden nach ${siparisKapanisSaati} Uhr nicht mehr angenommen`
              );
            }
          }
        }
      }

      // Mesafe kontrolü
      if (settings?.storeSettings?.storeLocation && settings?.deliverySettings?.distanceLimits) {
        const storeLocation = settings.storeSettings.storeLocation;
        const distanceLimits = settings.deliverySettings.distanceLimits;
        
        // Delivery için mesafe kontrolü
        if (type === 'delivery' && address && distanceLimits.deliveryMaxDistance !== null && distanceLimits.deliveryMaxDistance !== undefined) {
          const distanceCheck = validateDistance(
            address.latitude,
            address.longitude,
            storeLocation.latitude,
            storeLocation.longitude,
            distanceLimits.deliveryMaxDistance
          );
          
          if (!distanceCheck.isValid) {
            throw new ValidationError(distanceCheck.message);
          }
        }
        
        // Pickup için mesafe kontrolü (adres varsa kontrol et, yoksa atla)
        if (type === 'pickup' && address && distanceLimits.pickupMaxDistance !== null && distanceLimits.pickupMaxDistance !== undefined) {
          const distanceCheck = validateDistance(
            address.latitude,
            address.longitude,
            storeLocation.latitude,
            storeLocation.longitude,
            distanceLimits.pickupMaxDistance
          );
          
          if (!distanceCheck.isValid) {
            throw new ValidationError(distanceCheck.message);
          }
        }
      }
      
      // Ürün bilgilerini ve stok kontrolü
      const productIds = items.map((item) => item.productId);
      const variantIds = items
        .map((item) => item.variantId)
        .filter((id) => id != null);

      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new ValidationError('Einige Produkte wurden nicht gefunden');
      }

      // Varyantları getir
      const variants = variantIds.length > 0
        ? await tx.productVariant.findMany({
            where: {
              id: { in: variantIds },
              isActive: true,
            },
          })
        : [];

      // Aktif kampanyaları getir (doğrulama için)
      const now = getGermanyDate();
      const activeCampaigns = await tx.campaign.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });

      // Stok kontrolü ve fiyat hesaplama
      let subtotal = 0;
      const orderItems = [];
      let totalQuantity = 0;
      const usedCampaignIds = new Set(); // Kullanılan kampanyaları takip et

      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);

        if (!product) {
          throw new NotFoundError(`Produkt ${item.productId} nicht gefunden`);
        }

        // Varyant kontrolü
        let variant = null;
        if (item.variantId) {
          variant = variants.find((v) => v.id === item.variantId && v.productId === product.id);

          if (!variant) {
            throw new NotFoundError(`Variant ${item.variantId} nicht gefunden`);
          }

          // Varyant stok kontrolü
          if (variant.stock < item.quantity) {
            throw new ValidationError(
              `${product.name} - ${variant.name} ist nicht auf Lager. Verfügbar: ${variant.stock}`
            );
          }
        } else {
          // Varyant yoksa ürün stok kontrolü
          if (product.stock < item.quantity) {
            throw new ValidationError(
              `${product.name} ist nicht auf Lager. Verfügbar: ${product.stock}`
            );
          }
        }

        // Fiyat: varyant varsa varyant fiyatını, yoksa ürün fiyatını kullan
        let originalPrice;
        if (variant) {
          originalPrice = variant.price;
        } else {
          // Temporary price kontrolü yap
          const priceInfo = productService.getDisplayPrice(product);
          originalPrice = priceInfo.displayPrice;
        }

        // Kampanya doğrulama ve fiyat hesaplama
        let price = originalPrice;
        let campaignId = null;
        let campaignName = null;

        if (item.campaignId && item.campaignPrice) {
          // Kampanyayı doğrula
          const campaign = activeCampaigns.find((c) => c.id === item.campaignId);

          if (!campaign) {
            throw new ValidationError(`Kampanya ${item.campaignId} bulunamadı veya aktif değil`);
          }

          // Usage limit kontrolü
          if (campaign.usageLimit !== null && campaign.usageCount >= campaign.usageLimit) {
            throw new ValidationError(`Kampanya ${campaign.name} kullanım limitine ulaştı`);
          }

          // Kampanyanın bu ürüne uygulanabilir olup olmadığını kontrol et
          let isApplicable = false;
          if (campaign.applyToAll) {
            isApplicable = true;
          } else if (campaign.productIds && Array.isArray(campaign.productIds)) {
            isApplicable = campaign.productIds.includes(item.productId);
          } else if (campaign.categoryIds && Array.isArray(campaign.categoryIds) && product.categoryId) {
            isApplicable = campaign.categoryIds.includes(product.categoryId);
          }

          if (!isApplicable) {
            throw new ValidationError(`Kampanya ${campaign.name} bu ürüne uygulanamaz`);
          }

          // Minimum tutar kontrolü
          if (campaign.minPurchase) {
            const itemTotal = parseFloat(originalPrice) * item.quantity;
            if (itemTotal < parseFloat(campaign.minPurchase)) {
              throw new ValidationError(
                `Kampanya ${campaign.name} için minimum tutar: ${parseFloat(campaign.minPurchase).toFixed(2)} €`
              );
            }
          }

          // Backend'de indirimi tekrar hesapla ve doğrula (güvenlik için)
          const applicableCampaigns = activeCampaigns.filter((c) => {
            if (c.type === 'FREE_SHIPPING') return false;
            if (c.applyToAll) return true;
            if (c.productIds && Array.isArray(c.productIds) && c.productIds.includes(item.productId)) return true;
            if (c.categoryIds && Array.isArray(c.categoryIds) && product.categoryId && c.categoryIds.includes(product.categoryId)) return true;
            return false;
          });

          const discountResult = discountCalculator.calculateProductDiscount({
            price: parseFloat(originalPrice),
            quantity: item.quantity,
            campaigns: applicableCampaigns,
          });

          // Frontend'den gelen fiyat ile backend hesaplamasını karşılaştır (küçük farklara tolerans göster)
          const frontendPrice = parseFloat(item.campaignPrice);
          const backendPrice = discountResult.discountedPrice;
          const priceDifference = Math.abs(frontendPrice - backendPrice);

          // Fiyat farkı 0.01'den fazlaysa hata ver (yuvarlama hatalarına tolerans)
          if (priceDifference > 0.01) {
            console.warn(`Fiyat uyuşmazlığı: Frontend ${frontendPrice}, Backend ${backendPrice}`);
            // Güvenlik için backend hesaplamasını kullan
            price = backendPrice;
            campaignId = discountResult.appliedCampaign?.id || null;
            campaignName = discountResult.appliedCampaign?.name || null;
          } else {
            // Fiyatlar uyumlu, frontend'den gelen bilgileri kullan
            price = frontendPrice;
            campaignId = item.campaignId;
            campaignName = item.campaignName || campaign.name;
          }

          // Kampanya kullanım sayısını artırmak için kaydet
          if (campaignId) {
            usedCampaignIds.add(campaignId);
          }
        }

        const itemTotal = parseFloat(price) * item.quantity;
        subtotal += itemTotal;
        totalQuantity += item.quantity;

        // Görsel: varyant varsa varyant görselini, yoksa ürün görselini kullan
        const imageUrls = variant
          ? (Array.isArray(variant.imageUrls) ? variant.imageUrls : [])
          : (Array.isArray(product.imageUrls) ? product.imageUrls : []);
        const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

        orderItems.push({
          productId: product.id,
          variantId: variant ? variant.id : null,
          productName: product.name,
          variantName: variant ? variant.name : null,
          price: price,
          originalPrice: campaignId ? originalPrice : null,
          campaignId: campaignId,
          campaignName: campaignName,
          quantity: item.quantity,
          unit: product.unit,
          brand: product.brand,
          imageUrl: imageUrl,
        });
      }

      // Kullanılan kampanyaların kullanım sayısını artır
      for (const campaignId of usedCampaignIds) {
        await tx.campaign.update({
          where: { id: campaignId },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        });
      }

      // Order limits kontrolleri
      const limits = settings?.orderLimits || {};
      if (limits.maxSepetKalemi && items.length > limits.maxSepetKalemi) {
        throw new ValidationError(`Maximale Anzahl verschiedener Produkte: ${limits.maxSepetKalemi}`);
      }
      if (limits.maxUrunAdedi && totalQuantity > limits.maxUrunAdedi) {
        throw new ValidationError(`Maximale Stückzahl im Warenkorb: ${limits.maxUrunAdedi}`);
      }
      if (limits.maxSiparisTutari && subtotal > parseFloat(limits.maxSiparisTutari)) {
        throw new ValidationError(`Maximaler Bestellwert überschritten: ${limits.maxSiparisTutari}`);
      }

      // Minimum sipariş tutarı kontrolü
      if (settings?.minOrderAmount && subtotal < parseFloat(settings.minOrderAmount)) {
        const minAmount = parseFloat(settings.minOrderAmount).toFixed(2);
        const currentAmount = subtotal.toFixed(2);
        throw new ValidationError(
          `Der Mindestbestellwert beträgt ${minAmount} €. Ihr aktueller Warenkorbwert beträgt ${currentAmount} €.`
        );
      }

      // Kargo ücreti hesaplama
      let deliveryFee = 0;
      if (type === 'delivery') {
        // Ücretsiz kargo eşiği
        const freeTh = settings?.freeShippingThreshold;
        if (!freeTh || subtotal < parseFloat(freeTh)) {
          const rules = Array.isArray(settings?.shippingRules)
            ? settings.shippingRules
            : [];
          // Uyan ilk kuralı uygula (min <= subtotal <= max)
          const rule = rules.find((r) => {
            const minOk = r.min == null || subtotal >= parseFloat(r.min);
            const maxOk = r.max == null || subtotal <= parseFloat(r.max);
            return minOk && maxOk;
          });
          if (rule) {
            if (rule.type === 'percent') {
              deliveryFee = (subtotal * parseFloat(rule.percent ?? rule.value ?? 0)) / 100;
            } else {
              deliveryFee = parseFloat(rule.fee ?? rule.value ?? 0);
            }
          }
        }
      }

      // Kapıda ödeme ücreti ekle
      if (paymentType && (paymentType === 'cash' || paymentType === 'card_on_delivery')) {
        const kapida = settings?.paymentOptions?.kapidaOdemeUcreti;
        if (kapida) {
          if (kapida.type === 'percent') {
            deliveryFee += (subtotal * parseFloat(kapida.value || 0)) / 100;
          } else {
            deliveryFee += parseFloat(kapida.value || 0);
          }
        }
      }

      // Kupon doğrulama ve indirim hesaplama
      let discount = 0;
      let couponId = null;
      let couponCodeSnapshot = null;

      if (couponCode) {
        try {
          // Cart items'dan categoryId'leri almak için product bilgilerini çek
          const cartItemsWithCategory = items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return {
              ...item,
              categoryId: product?.categoryId || null,
            };
          });

          const couponResult = await couponService.validateCoupon(
            couponCode,
            userId,
            cartItemsWithCategory,
            subtotal
          );

          discount = couponResult.discount;
          couponId = couponResult.coupon.id;
          couponCodeSnapshot = couponResult.coupon.code;

          // Kupon kullanım sayısını artır
          await tx.coupon.update({
            where: { id: couponId },
            data: {
              usageCount: {
                increment: 1,
              },
            },
          });

          // Kupon kullanım kaydı oluştur
          await tx.couponUsage.create({
            data: {
              couponId: couponId,
              userId: userId,
              discount: discount,
            },
          });
        } catch (error) {
          // Kupon hatası varsa siparişi iptal et
          throw new ValidationError(error.message || 'Kupon kodu geçersiz');
        }
      }

      const total = subtotal + deliveryFee - discount;

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
          billingAddressId: billingAddressId || null,
          deliveryFee,
          subtotal,
          discount,
          total,
          paymentType: paymentType || 'none',
          couponId: couponId || null,
          couponCode: couponCodeSnapshot || null,
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
          billingAddress: true,
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

      // Stokları güncelle (varyant varsa varyant stokunu, yoksa ürün stokunu güncelle)
      for (const item of items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // Cart'ı temizle (varsa)
      await tx.cartItem.deleteMany({
        where: {
          userId,
          productId: { in: productIds },
        },
      });

      // Kupon kullanım kaydına orderId ekle (eğer kupon kullanıldıysa)
      if (couponId) {
        await tx.couponUsage.updateMany({
          where: {
            couponId: couponId,
            userId: userId,
            orderId: null,
          },
          data: {
            orderId: order.id,
          },
        });
      }

      return order;
    });
  }

  // ===== ADMIN BİLDİRİM HELPERİ =====
  async sendOrderNotificationToAdmins(order) {
    try {
      console.log('🔔 Admin bildirim gönderimi başlatılıyor...');
      
      // Tüm adminleri bul
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
        },
      });

      console.log(`📋 Bulunan admin sayısı: ${admins.length}`);

      if (admins.length === 0) {
        console.log('⚠️ Admin bulunamadı, bildirim gönderilemedi');
        return;
      }

      // Müşteri bilgilerini hazırla
      const customerName = `${order.user.firstName} ${order.user.lastName}`;
      const orderNo = order.orderNo;
      const totalPrice = `${order.total.toFixed(2)}€`;
      const orderType = order.type === 'delivery' ? 'Lieferung' : 'Abholung';
      const itemCount = order.orderItems.length;

      // Bildirim içeriği
      const title = `Neue Bestellung: ${orderNo}`;
      const message = `${customerName} hat eine neue Bestellung aufgegeben. ${itemCount} Artikel, ${totalPrice} (${orderType})`;
      const actionUrl = `/admin/orders/${order.id}`;

      // Tüm adminlere bildirim gönder (adminId ile)
      const adminIds = admins.map((admin) => admin.id);
      console.log(`📤 ${adminIds.length} admin'e bildirim gönderiliyor...`);
      
      const notifications = await notificationService.createBulkAdminNotifications(adminIds, {
        type: 'info',
        title,
        message,
        actionUrl,
        metadata: {
          orderId: order.id,
          orderNo: order.orderNo,
          customerName,
          total: order.total,
          type: order.type,
        },
      });

      console.log(`✅ ${notifications.length} admin bildirimi başarıyla oluşturuldu`);
    } catch (error) {
      // Bildirim hatası kritik değil, log at
      console.error('❌ Admin bildirim gönderim hatası:', error);
      console.error('❌ Hata detayı:', error.stack);
    }
  }

  // ===== MAİL GÖNDERİM HELPERİ =====
  async sendOrderEmails(order) {
    try {
      const settings = await prisma.settings.findFirst();

      // SMTP ayarları yoksa mail gönderme
      if (!settings?.smtpSettings) {
        console.log('⚠️  SMTP ayarları yapılandırılmamış, mail gönderilmedi.');
        return;
      }

      const user = order.user || (await prisma.user.findUnique({
        where: { id: order.userId },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      }));

      if (!user) return;

      // Sipariş detaylarını hazırla
      const orderItems = order.orderItems || [];
      const address = order.address ?
        `${order.address.street} ${order.address.houseNumber}, ${order.address.postalCode} ${order.address.city}` :
        null;

      const deliveryType = order.type === 'delivery' ? 'Lieferung' : 'Abholung im Laden';
      const paymentTypeMap = {
        cash: 'Bargeld',
        card_on_delivery: 'Karte bei Lieferung',
        none: 'Keine Zahlung',
      };

      // 1. Müşteriye sipariş alındı maili
      await queueService.addEmailJob({
        to: user.email,
        subject: 'Bestellung erfolgreich aufgegeben',
        template: 'order-received',
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          orderNo: order.orderNo,
          orderDate: new Date(order.createdAt).toLocaleString('de-DE'),
          deliveryType,
          address,
          items: orderItems.map((item) => ({
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            price: parseFloat(item.price).toFixed(2),
          })),
          subtotal: parseFloat(order.subtotal).toFixed(2),
          discount: order.discount ? parseFloat(order.discount).toFixed(2) : null,
          deliveryFee: parseFloat(order.deliveryFee).toFixed(2),
          total: parseFloat(order.total).toFixed(2),
          paymentType: paymentTypeMap[order.paymentType] || '',
          note: order.note,
        },
        metadata: { orderId: order.id, type: 'order-received' },
        priority: 1, // Yüksek öncelik
      });

      // 2. Admin'e yeni sipariş bildirimi
      const adminEmail = settings.emailNotificationSettings?.adminEmail;
      if (adminEmail) {
        // Virgülle ayrılmış email adreslerini split et ve temizle
        const adminEmails = adminEmail
          .split(',')
          .map((email) => email.trim())
          .filter((email) => email && email.includes('@'));

        console.log(`📧 Admin email adresleri parse edildi: ${adminEmails.length} adet`, adminEmails);

        // Tüm admin email adreslerine paralel olarak bildirim gönder
        const emailPromises = adminEmails.map(async (email) => {
          try {
            const result = await queueService.addEmailJob({
              to: email,
              subject: `Neue Bestellung: ${order.orderNo}`,
              template: 'order-notification-admin',
              data: {
                orderNo: order.orderNo,
                orderDate: new Date(order.createdAt).toLocaleString('de-DE'),
                customerName: `${user.firstName} ${user.lastName}`,
                customerEmail: user.email,
                customerPhone: user.phone,
                deliveryType,
                address,
                items: orderItems.map((item) => ({
                  productName: item.productName,
                  variantName: item.variantName,
                  quantity: item.quantity,
                  price: parseFloat(item.price).toFixed(2),
                })),
                itemCount: orderItems.length,
                total: parseFloat(order.total).toFixed(2),
                paymentType: paymentTypeMap[order.paymentType] || '',
                note: order.note,
                adminOrderUrl: `${process.env.ADMIN_URL || 'http://localhost:5173/admin'}/orders/${order.id}`,
              },
              metadata: { orderId: order.id, type: 'order-notification-admin' },
              priority: 2,
            });
            console.log(`✅ Admin email kuyruğa eklendi: ${email}`, result);
            return { email, success: true };
          } catch (emailError) {
            // Bir email gönderiminde hata olsa bile diğerlerine devam et
            console.error(`❌ Admin email gönderim hatası (${email}):`, emailError);
            return { email, success: false, error: emailError.message };
          }
        });

        // Tüm email'lerin kuyruğa eklenmesini bekle
        const results = await Promise.all(emailPromises);
        const successCount = results.filter((r) => r.success).length;
        console.log(`📊 Admin email gönderim özeti: ${successCount}/${adminEmails.length} başarılı`);
      }

      // Not: Invoice email'i admin tarafından manuel olarak gönderilir (sendInvoice endpoint'i ile)
      // Otomatik invoice gönderimi kaldırıldı - müşteri admin izin vermeden faturayı göremez

      console.log(`✅ Sipariş mailleri kuyruğa eklendi: ${order.orderNo}`);
    } catch (error) {
      // Mail hatası sipariş oluşturmayı engellemez
      console.error('Mail gönderim hatası:', error);
    }
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
        billingAddress: true,
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

    // Invoice gönderilip gönderilmediğini kontrol et (hem müşteri hem admin için)
    const invoiceEmail = await prisma.$queryRaw`
      SELECT id FROM email_logs
      WHERE template = 'invoice'
      AND status = 'sent'
      AND metadata->>'orderId' = ${orderId}
      LIMIT 1
    `;
    const invoiceSent = invoiceEmail && invoiceEmail.length > 0;

    // Invoice bilgisini order objesine ekle
    return {
      ...order,
      invoiceSent,
    };
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
              variantName: true,
              quantity: true,
              price: true,
              originalPrice: true,
              campaignId: true,
              campaignName: true,
              imageUrl: true,
            },
          },
          address: true,
          review: {
            select: {
              id: true,
              rating: true,
              comment: true,
            },
          },
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
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }
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
    const updatedOrder = await prisma.order.findUnique({
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

    // Status değiştiyse ve settings'te aktifse mail gönder
    if (order.status !== status) {
      await this.sendOrderStatusChangedEmail(order.status, status, updatedOrder);
      
      // Bildirim oluştur
      await this.createOrderStatusNotification(order.status, status, updatedOrder);
    }

    return updatedOrder;
  }

  // Sipariş durumu değişikliği maili
  async sendOrderStatusChangedEmail(oldStatus, newStatus, order) {
    try {
      const settings = await prisma.settings.findFirst();

      // SMTP veya notification ayarları yoksa çık
      if (!settings?.smtpSettings || !settings?.emailNotificationSettings) {
        return;
      }

      const notifySettings = settings.emailNotificationSettings.notifyOnOrderStatus || {};

      // Bu durum değişikliği için mail gönderilmeyecekse çık
      if (!notifySettings[newStatus]) {
        console.log(`⚠️  ${newStatus} durumu için mail bildirimi kapalı.`);
        return;
      }

      const user = order.user;
      if (!user) return;

      // Durum text'leri
      const statusTextMap = {
        pending: 'Ausstehend',
        accepted: 'Akzeptiert',
        preparing: 'In Vorbereitung',
        shipped: order.type === 'pickup' ? 'Bereit' : 'Versandt',
        delivered: 'Geliefert',
        cancelled: 'Storniert',
      };

      const statusMessageMap = {
        accepted: 'Ihre Bestellung wurde bestätigt und wird bald bearbeitet.',
        preparing: 'Wir bereiten Ihre Bestellung gerade vor.',
        shipped: order.type === 'pickup' 
          ? 'Ihre Bestellung ist bereit zur Abholung.' 
          : 'Ihre Bestellung wurde versandt und ist unterwegs zu Ihnen.',
        delivered: 'Ihre Bestellung wurde erfolgreich zugestellt. Vielen Dank!',
        cancelled: 'Ihre Bestellung wurde storniert.',
      };

      // İptal durumu için farklı template kullan
      if (newStatus === 'cancelled') {
        await queueService.addEmailJob({
          to: user.email,
          subject: `Bestellung ${order.orderNo} storniert`,
          template: 'order-cancelled',
          data: {
            firstName: user.firstName,
            lastName: user.lastName,
            orderNo: order.orderNo,
            orderDate: new Date(order.createdAt).toLocaleString('de-DE'),
            cancelDate: new Date().toLocaleString('de-DE'),
            total: parseFloat(order.total).toFixed(2),
            items: order.orderItems.map((item) => ({
              productName: item.productName,
              variantName: item.variantName,
              quantity: item.quantity,
              price: parseFloat(item.price).toFixed(2),
            })),
            refundInfo: order.paymentType !== 'none' ?
              'Die Rückerstattung wird innerhalb von 5-7 Werktagen bearbeitet.' : null,
            shopUrl: process.env.SHOP_URL || 'http://localhost:5173',
          },
          metadata: { orderId: order.id, type: 'order-cancelled' },
          priority: 1,
        });
      } else {
        // Diğer durum değişiklikleri için
        await queueService.addEmailJob({
          to: user.email,
          subject: `Bestellung ${order.orderNo} - Status aktualisiert`,
          template: 'order-status-changed',
          data: {
            firstName: user.firstName,
            lastName: user.lastName,
            orderNo: order.orderNo,
            orderDate: new Date(order.createdAt).toLocaleString('de-DE'),
            oldStatusText: statusTextMap[oldStatus] || oldStatus,
            newStatusText: statusTextMap[newStatus] || newStatus,
            statusMessage: statusMessageMap[newStatus] || '',
            total: parseFloat(order.total).toFixed(2),
            itemCount: order.orderItems.length,
            items: order.orderItems.map((item) => ({
              productName: item.productName,
              variantName: item.variantName,
              quantity: item.quantity,
            })),
          },
          metadata: { orderId: order.id, type: 'order-status-changed', oldStatus, newStatus },
          priority: 2,
        });
      }

      console.log(`✅ Durum değişikliği maili kuyruğa eklendi: ${order.orderNo} (${oldStatus} → ${newStatus})`);
    } catch (error) {
      console.error('Status change mail hatası:', error);
    }
  }

  // Sipariş durumu değişikliği bildirimi
  async createOrderStatusNotification(oldStatus, newStatus, order) {
    try {
      const userId = order.userId;
      if (!userId) return;

      // Durum text'leri
      const statusTextMap = {
        pending: 'Ausstehend',
        accepted: 'Akzeptiert',
        preparing: 'In Vorbereitung',
        shipped: order.type === 'pickup' ? 'Bereit' : 'Versandt',
        delivered: 'Geliefert',
        cancelled: 'Storniert',
      };

      const statusMessageMap = {
        accepted: 'Ihre Bestellung wurde bestätigt und wird bald bearbeitet.',
        preparing: 'Wir bereiten Ihre Bestellung gerade vor.',
        shipped: order.type === 'pickup' 
          ? 'Ihre Bestellung ist bereit zur Abholung.' 
          : 'Ihre Bestellung wurde versandt und ist unterwegs zu Ihnen.',
        delivered: 'Ihre Bestellung wurde erfolgreich zugestellt. Vielen Dank!',
        cancelled: 'Ihre Bestellung wurde storniert.',
      };

      // Bildirim tipi belirleme
      let notificationType = 'info';
      if (newStatus === 'delivered') {
        notificationType = 'success';
      } else if (newStatus === 'cancelled') {
        notificationType = 'error';
      } else if (newStatus === 'shipped') {
        notificationType = 'success';
      }

      // Template'den title ve message al
      try {
        const templateData = await notificationTemplateService.renderTemplate('order-status-changed', {
          firstName: order.user?.firstName || '',
          lastName: order.user?.lastName || '',
          orderNo: order.orderNo,
          oldStatusText: statusTextMap[oldStatus] || oldStatus,
          newStatusText: statusTextMap[newStatus] || newStatus,
          statusMessage: statusMessageMap[newStatus] || `Ihre Bestellung wurde auf "${statusTextMap[newStatus] || newStatus}" aktualisiert.`,
          total: order.total?.toFixed(2) || '0.00',
        });

        await notificationService.createNotification(userId, {
          type: notificationType,
          title: templateData.title,
          message: templateData.message,
          actionUrl: `/siparis/${order.id}`,
          metadata: {
            orderId: order.id,
            orderNo: order.orderNo,
            oldStatus,
            newStatus,
          },
        });

        console.log(`✅ Bildirim oluşturuldu: ${order.orderNo} (${oldStatus} → ${newStatus})`);
      } catch (templateError) {
        // Template hatası durumunda fallback kullan
        console.error('Notification template hatası:', templateError);
        const title = `Bestellung ${order.orderNo} - Status aktualisiert`;
        const message = statusMessageMap[newStatus] || `Ihre Bestellung wurde auf "${statusTextMap[newStatus] || newStatus}" aktualisiert.`;

        await notificationService.createNotification(userId, {
          type: notificationType,
          title,
          message,
          actionUrl: `/siparis/${order.id}`,
          metadata: {
            orderId: order.id,
            orderNo: order.orderNo,
            oldStatus,
            newStatus,
          },
        });
      }
    } catch (error) {
      console.error('Bildirim oluşturma hatası:', error);
    }
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
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
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

  // Admin sipariş iptali
  async adminCancelOrder(orderId, cancellationData) {
    const {
      cancellationReason,
      cancellationInternalNote,
      cancellationCustomerMessage,
      showCancellationReasonToCustomer = false,
    } = cancellationData;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    // Zaten iptal edilmişse hata ver
    if (order.status === 'cancelled') {
      throw new ValidationError('Diese Bestellung wurde bereits storniert');
    }

    // Teslim edilmiş siparişler iptal edilemez
    if (order.status === 'delivered') {
      throw new ValidationError('Gelieferte Bestellungen können nicht storniert werden');
    }

    // Stokları geri ekle ve sipariş durumunu güncelle
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Eğer daha önce iptal edilmemişse stokları geri ekle
      if (order.status !== 'cancelled') {
        for (const item of order.orderItems) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }
        }
      }

      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          cancellationReason: cancellationReason?.trim() || null,
          cancellationInternalNote: cancellationInternalNote?.trim() || null,
          cancellationCustomerMessage: cancellationCustomerMessage?.trim() || null,
          showCancellationReasonToCustomer: showCancellationReasonToCustomer || false,
        },
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
    });

    // İptal maili gönder
    await this.sendAdminCancellationEmail(updatedOrder);

    // Bildirim oluştur
    try {
      // Template'den title ve message al
      const templateData = await notificationTemplateService.renderTemplate('order-cancelled', {
        firstName: updatedOrder.user?.firstName || '',
        lastName: updatedOrder.user?.lastName || '',
        orderNo: updatedOrder.orderNo,
        cancelDate: new Date().toLocaleString('de-DE'),
        cancelReason: cancellationReason || null,
        total: updatedOrder.total?.toFixed(2) || '0.00',
      });

      await notificationService.createNotification(updatedOrder.userId, {
        type: 'error',
        title: templateData.title,
        message: templateData.message,
        actionUrl: `/siparis/${updatedOrder.id}`,
        metadata: {
          orderId: updatedOrder.id,
          orderNo: updatedOrder.orderNo,
          cancellationReason,
        },
      });
    } catch (templateError) {
      // Template hatası durumunda fallback kullan
      console.error('Notification template hatası:', templateError);
      const title = `Bestellung ${updatedOrder.orderNo} storniert`;
      const message = cancellationReason 
        ? `Ihre Bestellung wurde storniert. Grund: ${cancellationReason}`
        : 'Ihre Bestellung wurde storniert.';

      await notificationService.createNotification(updatedOrder.userId, {
        type: 'error',
        title,
        message,
        actionUrl: `/siparis/${updatedOrder.id}`,
        metadata: {
          orderId: updatedOrder.id,
          orderNo: updatedOrder.orderNo,
          cancellationReason,
        },
      });
    }

    return updatedOrder;
  }

  // Admin iptal maili gönder
  async sendAdminCancellationEmail(order) {
    try {
      const settings = await prisma.settings.findFirst();

      // SMTP ayarları yoksa mail gönderme
      if (!settings?.smtpSettings) {
        console.log('⚠️  SMTP ayarları yapılandırılmamış, mail gönderilmedi.');
        return;
      }

      const user = order.user;
      if (!user) return;

      // İptal sebebi ve müşteri mesajını hazırla
      let cancelReasonText = null;
      if (order.showCancellationReasonToCustomer && order.cancellationReason) {
        cancelReasonText = order.cancellationReason;
      }

      // Müşteri mesajı varsa ekle
      let customerMessageText = null;
      if (order.cancellationCustomerMessage) {
        customerMessageText = order.cancellationCustomerMessage;
      }

      await queueService.addEmailJob({
        to: user.email,
        subject: `Bestellung ${order.orderNo} storniert`,
        template: 'order-cancelled',
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          orderNo: order.orderNo,
          orderDate: new Date(order.createdAt).toLocaleString('de-DE'),
          cancelDate: new Date().toLocaleString('de-DE'),
          total: parseFloat(order.total).toFixed(2),
          items: order.orderItems.map((item) => ({
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            price: parseFloat(item.price).toFixed(2),
          })),
          cancelReason: cancelReasonText,
          customerMessage: customerMessageText,
          refundInfo: order.paymentType !== 'none' ?
            'Die Rückerstattung wird innerhalb von 5-7 Werktagen bearbeitet.' : null,
          shopUrl: process.env.SHOP_URL || 'http://localhost:5173',
        },
        metadata: { orderId: order.id, type: 'order-cancelled' },
        priority: 1,
      });

      console.log(`✅ Admin iptal maili kuyruğa eklendi: ${order.orderNo}`);
    } catch (error) {
      console.error('Admin iptal mail hatası:', error);
    }
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

  // Sipariş için review oluştur
  async createReview(orderId, userId, reviewData) {
    const { rating, comment } = reviewData;

    // Siparişin varlığını ve kullanıcıya ait olduğunu kontrol et
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true },
    });

    if (!order) {
      throw new NotFoundError('Bestellung nicht gefunden');
    }

    if (order.userId !== userId) {
      throw new ForbiddenError('Zugriff auf diese Bestellung verweigert');
    }

    // Sadece teslim edilmiş siparişlere review yazılabilir
    if (order.status !== 'delivered') {
      throw new ValidationError(
        'Sie können nur gelieferte Bestellungen bewerten'
      );
    }

    // Daha önce review yapılmış mı kontrol et
    if (order.review) {
      throw new ValidationError('Sie haben diese Bestellung bereits bewertet');
    }

    // Review oluştur
    const review = await prisma.orderReview.create({
      data: {
        orderId,
        userId,
        rating: parseInt(rating),
        comment: comment?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return review;
  }

  // Sipariş review'ını getir
  async getReview(orderId) {
    const review = await prisma.orderReview.findUnique({
      where: { orderId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Review yoksa null döner (hata vermez)
    return review;
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
