import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../utils/errors.js';
import { getGermanyDate } from '../utils/date.js';
import settingsService from './settings.service.js';

class ProductService {
  /**
   * Ürün için gösterilecek fiyatı hesapla (temporary price kontrolü ile)
   * @param {Object} product - Product objesi
   * @returns {Object} { displayPrice, isTemporary, temporaryPriceEndDate, originalPrice }
   */
  getDisplayPrice(product) {
    const now = new Date();
    const hasTemporaryPrice = product.temporaryPrice && product.temporaryPriceEndDate;
    const endDate = hasTemporaryPrice ? new Date(product.temporaryPriceEndDate) : null;
    const isTemporaryActive = hasTemporaryPrice && endDate && endDate > now;

    if (isTemporaryActive) {
      return {
        displayPrice: parseFloat(product.temporaryPrice),
        isTemporary: true,
        temporaryPriceEndDate: product.temporaryPriceEndDate,
        originalPrice: parseFloat(product.price),
      };
    }

    return {
      displayPrice: parseFloat(product.price),
      isTemporary: false,
      temporaryPriceEndDate: null,
      originalPrice: null,
    };
  }

  // Ürünleri listele (filtreleme, arama, sayfalama)
  async getProducts({
    categoryId,
    search,
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'asc',
    isFeatured,
    campaignId,
  }) {
    const skip = (page - 1) * limit;

    // Settings'ten stok kontrolü ayarını al
    const settings = await settingsService.getSettings();
    const showOutOfStockProducts = settings?.showOutOfStockProducts !== false;

    // Where koşulları
    const where = {
      isActive: true,
    };

    // Stok kontrolü - eğer ayar kapalıysa stokta olmayan ürünleri filtrele
    if (!showOutOfStockProducts) {
      where.stock = { gt: 0 };
    }

    // Kampanya filtresi
    if (campaignId) {
      try {
        const now = getGermanyDate();
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
        });

        if (campaign && campaign.isActive && campaign.startDate <= now && campaign.endDate >= now) {
          // Usage limit kontrolü
          if (campaign.usageLimit !== null && campaign.usageCount >= campaign.usageLimit) {
            // Kampanya limitine ulaşılmışsa boş sonuç döndür
            return {
              products: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: 0,
              },
            };
          }

          // Kampanya tüm mağazaya uygulanıyorsa filtre yok
          if (!campaign.applyToAll) {
            // Kategoriye özgü kampanyalar
            if (campaign.categoryIds && Array.isArray(campaign.categoryIds) && campaign.categoryIds.length > 0) {
              where.categoryId = { in: campaign.categoryIds };
            }
            // Ürüne özgü kampanyalar
            else if (campaign.productIds && Array.isArray(campaign.productIds) && campaign.productIds.length > 0) {
              where.id = { in: campaign.productIds };
            } else {
              // Kampanya hiçbir ürüne uygulanmıyorsa boş sonuç döndür
              return {
                products: [],
                pagination: {
                  total: 0,
                  page: parseInt(page),
                  limit: parseInt(limit),
                  totalPages: 0,
                },
              };
            }
          }
        } else {
          // Kampanya aktif değilse boş sonuç döndür
          return {
            products: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              totalPages: 0,
            },
          };
        }
      } catch (error) {
        console.error('Kampanya yükleme hatası:', error);
        // Hata durumunda kampanya filtresini yok say
      }
    }

    if (categoryId) {
      // Kampanya filtresi varsa ve kategori filtresi de varsa, ikisini birleştir
      if (where.categoryId) {
        // Eğer kampanya kategori filtresi varsa, sadece o kategoriler içinde categoryId'yi kontrol et
        if (Array.isArray(where.categoryId.in)) {
          if (!where.categoryId.in.includes(categoryId)) {
            // İstenen kategori kampanya kapsamında değilse boş sonuç
            return {
              products: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: 0,
              },
            };
          }
          where.categoryId = categoryId;
        }
      } else {
        where.categoryId = categoryId;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    // Sıralama
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Ürünleri getir
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variantOptions: {
            orderBy: { displayOrder: 'asc' },
          },
          variants: {
            where: { isActive: true },
            take: 1, // İlk varyantı göster (varsayılan)
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    // Her ürün için gösterilecek fiyatı hesapla
    const productsWithDisplayPrice = products.map((product) => {
      const priceInfo = this.getDisplayPrice(product);
      return {
        ...product,
        price: priceInfo.displayPrice, // API response'unda price alanı gösterilecek fiyatı içerir
      };
    });

    return {
      products: productsWithDisplayPrice,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Tek ürün getir (ID ile)
  async getProductById(id) {
    // UUID formatını kontrol et
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      throw new NotFoundError('Produkt nicht gefunden');
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variantOptions: {
          orderBy: { displayOrder: 'asc' },
        },
        variants: {
          where: { isActive: true },
          include: {
            values: {
              include: {
                option: {
                  select: {
                    id: true,
                    name: true,
                    displayOrder: true,
                  },
                },
              },
              orderBy: {
                option: {
                  displayOrder: 'asc',
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Produkt nicht gefunden');
    }

    if (!product.isActive) {
      throw new NotFoundError('Produkt ist nicht verfügbar');
    }

    // Gösterilecek fiyatı hesapla
    const priceInfo = this.getDisplayPrice(product);
    return {
      ...product,
      price: priceInfo.displayPrice, // API response'unda price alanı gösterilecek fiyatı içerir
    };
  }

  // Tek ürün getir (slug ile)
  async getProductBySlug(slug) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variantOptions: {
          orderBy: { displayOrder: 'asc' },
        },
        variants: {
          where: { isActive: true },
          include: {
            values: {
              include: {
                option: {
                  select: {
                    id: true,
                    name: true,
                    displayOrder: true,
                  },
                },
              },
              orderBy: {
                option: {
                  displayOrder: 'asc',
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Produkt nicht gefunden');
    }

    if (!product.isActive) {
      throw new NotFoundError('Produkt ist nicht verfügbar');
    }

    // Gösterilecek fiyatı hesapla
    const priceInfo = this.getDisplayPrice(product);
    return {
      ...product,
      price: priceInfo.displayPrice, // API response'unda price alanı gösterilecek fiyatı içerir
    };
  }

  // Kategorileri listele
  async getCategories() {
    // Settings'ten stok kontrolü ayarını al
    const settings = await settingsService.getSettings();
    const showOutOfStockProducts = settings?.showOutOfStockProducts !== false;

    // Kategori sayısı için where koşulu
    const productCountWhere = {
      isActive: true,
    };

    // Stok kontrolü - eğer ayar kapalıysa stokta olmayan ürünleri filtrele
    if (!showOutOfStockProducts) {
      productCountWhere.stock = { gt: 0 };
    }

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        sortOrder: true,
        _count: {
          select: {
            products: {
              where: productCountWhere,
            },
          },
        },
      },
    });

    return categories;
  }

  // Öne çıkan ürünleri getir
  async getFeaturedProducts(limit = 10) {
    // Settings'ten stok kontrolü ayarını al
    const settings = await settingsService.getSettings();
    const showOutOfStockProducts = settings?.showOutOfStockProducts !== false;

    const where = {
      isActive: true,
      isFeatured: true,
    };

    // Stok kontrolü - eğer ayar kapalıysa stokta olmayan ürünleri filtrele
    if (!showOutOfStockProducts) {
      where.stock = { gt: 0 };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          where: { isActive: true },
          take: 1, // İlk varyantı göster (varsayılan)
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    return products;
  }

  // En çok satan ürünleri getir (OrderItem'lardan satış sayısına göre)
  async getBestSellers(limit = 10) {
    // Settings'ten stok kontrolü ayarını al
    const settings = await settingsService.getSettings();
    const showOutOfStockProducts = settings?.showOutOfStockProducts !== false;

    // OrderItem'lardan her ürün için toplam satış miktarını hesapla
    const salesData = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      where: {
        order: {
          status: {
            not: 'cancelled', // İptal edilen siparişler hariç
          },
        },
      },
    });

    // Satış sayısına göre sırala (en yüksekten en düşüğe)
    const sortedSales = salesData
      .map((item) => ({
        productId: item.productId,
        totalSales: item._sum.quantity || 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, parseInt(limit));

    // Product ID'leri al
    const productIds = sortedSales.map((item) => item.productId);

    // Where koşulları
    const where = {
      id: { in: productIds },
      isActive: true,
    };

    // Stok kontrolü - eğer ayar kapalıysa stokta olmayan ürünleri filtrele
    if (!showOutOfStockProducts) {
      where.stock = { gt: 0 };
    }

    // Ürünleri getir (sıralama korunmalı)
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          where: { isActive: true },
          take: 1, // İlk varyantı göster (varsayılan)
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Sıralamayı koru (productIds sırasına göre)
    const productsMap = new Map(products.map((p) => [p.id, p]));
    const orderedProducts = productIds
      .map((id) => productsMap.get(id))
      .filter(Boolean); // undefined'ları filtrele

    // Eğer yeterli ürün yoksa, aktif ürünlerle tamamla
    if (orderedProducts.length < parseInt(limit)) {
      const existingIds = new Set(productIds);
      const additionalWhere = {
        id: { notIn: Array.from(existingIds) },
        isActive: true,
      };

      // Stok kontrolü - eğer ayar kapalıysa stokta olmayan ürünleri filtrele
      if (!showOutOfStockProducts) {
        additionalWhere.stock = { gt: 0 };
      }

      const additionalProducts = await prisma.product.findMany({
        where: additionalWhere,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variants: {
            where: { isActive: true },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
        take: parseInt(limit) - orderedProducts.length,
        orderBy: { createdAt: 'desc' },
      });

      orderedProducts.push(...additionalProducts);
    }

    return orderedProducts.slice(0, parseInt(limit));
  }

  // ===============================
  // ADMIN METHODS
  // ===============================

  // Admin: Tüm ürünleri getir (isActive filtresi olmadan)
  async getProductsForAdmin({
    categoryId,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isActive,
    isFeatured,
  }) {
    const skip = (page - 1) * limit;

    const where = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Ürün oluştur
  async createProduct(data) {
    // Slug oluştur
    let slug = data.slug;
    if (!slug && data.name) {
      slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    
    // Slug'un benzersiz olduğundan emin ol
    if (slug) {
      const existingProduct = await prisma.product.findUnique({
        where: { slug },
      });

      if (existingProduct) {
        throw new Error('Ein Produkt mit diesem Slug existiert bereits');
      }
    }

    // categoryId'yi ayır
    const { categoryId, ...restData } = data;
    
    // Sadece schema'da tanımlı alanları kabul et
    const allowedFields = [
      'name', 'description', 'price', 'stock', 'lowStockLevel', 
      'unit', 'barcode', 'brand', 'imageUrls', 'isActive', 'isFeatured', 'showStock',
      'ingredientsText', 'allergens', 'nutriscoreGrade', 'ecoscoreGrade', 
      'nutritionData', 'openfoodfactsCategories', 'expiryDate', 'excludeFromExpiryCheck'
    ];
    
    const createData = {};
    
    // Sadece izin verilen alanları ekle
    allowedFields.forEach(field => {
      if (restData[field] !== undefined) {
        createData[field] = restData[field];
      }
    });
    
    // Slug ekle
    if (slug) {
      createData.slug = slug;
    }
    
    // Varsayılan değerleri ayarla
    createData.imageUrls = Array.isArray(data.imageUrls) ? data.imageUrls : [];
    createData.price = parseFloat(data.price);
    createData.stock = parseInt(data.stock) || 0;
    createData.lowStockLevel = data.lowStockLevel ? parseInt(data.lowStockLevel) : null;
    
    // expiryDate'i parse et
    if (createData.expiryDate !== undefined) {
      if (createData.expiryDate === null || createData.expiryDate === '') {
        createData.expiryDate = null;
      } else {
        // String ise Date'e çevir
        createData.expiryDate = new Date(createData.expiryDate);
      }
    }

    // Category ilişkisini doğru formatta ekle
    if (categoryId) {
      createData.category = {
        connect: { id: categoryId },
      };
    }

    const product = await prisma.product.create({
      data: createData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return product;
  }

  // Admin: Ürün güncelle
  async updateProduct(id, data) {
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundError('Produkt nicht gefunden');
    }

    // Slug güncelleme
    let slug = data.slug;
    if (data.name && !slug) {
      slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Slug'un benzersiz olduğundan emin ol (kendi ID'si hariç)
    if (slug && slug !== existingProduct.slug) {
      const slugExists = await prisma.product.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      });

      if (slugExists) {
        throw new Error('Ein Produkt mit diesem Slug existiert bereits');
      }
    }

    // categoryId'yi ayır
    const { categoryId, ...restData } = data;
    
    // Sadece schema'da tanımlı alanları kabul et
    const allowedFields = [
      'name', 'description', 'price', 'stock', 'lowStockLevel', 
      'unit', 'barcode', 'brand', 'imageUrls', 'isActive', 'isFeatured', 'showStock',
      'ingredientsText', 'allergens', 'nutriscoreGrade', 'ecoscoreGrade', 
      'nutritionData', 'openfoodfactsCategories', 'expiryDate', 'excludeFromExpiryCheck'
    ];
    
    const updateData = {};
    
    // Sadece izin verilen alanları ekle
    allowedFields.forEach(field => {
      if (restData[field] !== undefined) {
        updateData[field] = restData[field];
      }
    });
    
    // Slug ekle
    if (slug) {
      updateData.slug = slug;
    }

    // Category ilişkisini doğru formatta ekle
    if (categoryId !== undefined) {
      updateData.category = {
        connect: { id: categoryId },
    };
    }

    // Price ve stock'u parse et
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.stock !== undefined) {
      updateData.stock = parseInt(updateData.stock);
    }
    if (updateData.lowStockLevel !== undefined) {
      updateData.lowStockLevel = updateData.lowStockLevel ? parseInt(updateData.lowStockLevel) : null;
    }
    if (updateData.imageUrls !== undefined) {
      updateData.imageUrls = Array.isArray(updateData.imageUrls) ? updateData.imageUrls : [];
    }
    
    // expiryDate'i parse et
    if (updateData.expiryDate !== undefined) {
      if (updateData.expiryDate === null || updateData.expiryDate === '') {
        updateData.expiryDate = null;
      } else {
        // String ise Date'e çevir
        updateData.expiryDate = new Date(updateData.expiryDate);
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return product;
  }

  // Admin: Ürün sil
  async deleteProduct(id) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Produkt nicht gefunden');
    }

    // Siparişlerde kullanılıyorsa silme
    const orderItems = await prisma.orderItem.findFirst({
      where: { productId: id },
    });

    if (orderItems) {
      // Siparişlerde kullanılıyorsa sadece isActive=false yap
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'Produkt wurde deaktiviert (in Bestellungen verwendet)' };
    }

    // Siparişlerde kullanılmıyorsa tamamen sil
    await prisma.product.delete({
      where: { id },
    });

    return { message: 'Produkt wurde gelöscht' };
  }

  /**
   * Toplu fiyat güncelleme
   * @param {Object} params - { type: 'all' | 'category' | 'products', categoryId?, productIds?, adjustmentType: 'percentage' | 'fixed', adjustmentValue: number, updateType: 'permanent' | 'temporary', temporaryPriceEndDate?: Date, includeVariants?: boolean }
   * @returns {Object} { updatedCount, message, bulkUpdateId }
   */
  async bulkUpdatePrices(params) {
    const { 
      type, 
      categoryId, 
      productIds, 
      adjustmentType, 
      adjustmentValue, 
      updateType = 'permanent',
      temporaryPriceEndDate,
      includeVariants = false,
    } = params;

    if (!type || !adjustmentType || adjustmentValue === undefined) {
      throw new Error('Fehlende erforderliche Parameter');
    }

    if (updateType === 'temporary' && !temporaryPriceEndDate) {
      throw new Error('Enddatum ist für temporäre Preisaktualisierungen erforderlich');
    }

    const value = parseFloat(adjustmentValue);
    if (isNaN(value)) {
      throw new Error('Ungültiger Anpassungswert');
    }

    // Where koşulunu oluştur
    let where = {};

    if (type === 'category') {
      if (!categoryId) {
        throw new Error('Kategorie-ID ist erforderlich');
      }
      where.categoryId = categoryId;
    } else if (type === 'products') {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('Mindestens eine Produkt-ID ist erforderlich');
      }
      where.id = { in: productIds };
    }
    // type === 'all' ise where boş kalır, tüm ürünler güncellenir

    // Önce güncellencek ürünleri çek (fiyat hesaplaması için)
    const products = await prisma.product.findMany({
      where,
      select: { id: true, price: true, name: true, barcode: true },
    });

    if (products.length === 0) {
      return {
        updatedCount: 0,
        message: 'Keine Produkte gefunden',
      };
    }

    // Etkilenen ürünleri kaydet (geri alma için)
    const affectedProducts = [];
    const endDate = updateType === 'temporary' && temporaryPriceEndDate 
      ? new Date(temporaryPriceEndDate) 
      : null;

    // Her ürün için yeni fiyatı hesapla ve güncelle
    const updatePromises = products.map(async (product) => {
      const oldPrice = parseFloat(product.price);
      let newPrice;

      if (adjustmentType === 'percentage') {
        // Yüzde artış/azalış
        newPrice = oldPrice * (1 + value / 100);
      } else {
        // Sabit miktar artış/azalış
        newPrice = oldPrice + value;
      }

      // Negatif fiyat olmaması için kontrol
      if (newPrice < 0) {
        newPrice = 0;
      }

      // Fiyatı 2 ondalık basamağa yuvarla
      newPrice = Math.round(newPrice * 100) / 100;

      const updateData = {};
      
      if (updateType === 'permanent') {
        // Kalıcı güncelleme: price alanını güncelle
        updateData.price = newPrice;
        // Eğer temporary price varsa temizle
        updateData.temporaryPrice = null;
        updateData.temporaryPriceEndDate = null;
      } else {
        // Geçici güncelleme: temporaryPrice ve temporaryPriceEndDate alanlarını güncelle
        updateData.temporaryPrice = newPrice;
        updateData.temporaryPriceEndDate = endDate;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: updateData,
      });

      affectedProducts.push({
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        oldPrice,
        newPrice,
      });
    });

    await Promise.all(updatePromises);

    // BulkPriceUpdate kaydı oluştur
    const bulkUpdate = await prisma.bulkPriceUpdate.create({
      data: {
        type,
        categoryId: type === 'category' ? categoryId : null,
        productIds: type === 'products' ? productIds : null,
        adjustmentType,
        adjustmentValue: value,
        updateType: updateType.toUpperCase(),
        temporaryPriceEndDate: endDate,
        includeVariants: includeVariants && updateType === 'permanent', // Variants sadece permanent için
        affectedProducts,
        productsUpdated: products.length,
        variantsUpdated: 0,
        totalUpdated: products.length,
      },
    });

    return {
      updatedCount: products.length,
      message: updateType === 'temporary' 
        ? 'Temporäre Preise erfolgreich aktualisiert'
        : 'Preise erfolgreich aktualisiert',
      bulkUpdateId: bulkUpdate.id,
    };
  }

  /**
   * Toplu varyant fiyat güncelleme
   * @param {Object} params - { type: 'all' | 'category' | 'products', categoryId?, productIds?, adjustmentType: 'percentage' | 'fixed', adjustmentValue: number }
   * @returns {Object} { updatedCount, message }
   */
  async bulkUpdateVariantPrices(params) {
    const { type, categoryId, productIds, adjustmentType, adjustmentValue } = params;

    if (!type || !adjustmentType || adjustmentValue === undefined) {
      throw new Error('Fehlende erforderliche Parameter');
    }

    const value = parseFloat(adjustmentValue);
    if (isNaN(value)) {
      throw new Error('Ungültiger Anpassungswert');
    }

    // Where koşulunu oluştur
    let productWhere = {};

    if (type === 'category') {
      if (!categoryId) {
        throw new Error('Kategorie-ID ist erforderlich');
      }
      productWhere.categoryId = categoryId;
    } else if (type === 'products') {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('Mindestens eine Produkt-ID ist erforderlich');
      }
      productWhere.id = { in: productIds };
    }

    // İlgili ürünlerin varyantlarını çek
    const variants = await prisma.productVariant.findMany({
      where: {
        product: productWhere,
      },
      select: { id: true, price: true },
    });

    if (variants.length === 0) {
      return {
        updatedCount: 0,
        message: 'Keine Varianten gefunden',
      };
    }

    // Her varyant için yeni fiyatı hesapla ve güncelle
    const updatePromises = variants.map(async (variant) => {
      let newPrice;

      if (adjustmentType === 'percentage') {
        newPrice = parseFloat(variant.price) * (1 + value / 100);
      } else {
        newPrice = parseFloat(variant.price) + value;
      }

      if (newPrice < 0) {
        newPrice = 0;
      }

      newPrice = Math.round(newPrice * 100) / 100;

      return prisma.productVariant.update({
        where: { id: variant.id },
        data: { price: newPrice },
      });
    });

    await Promise.all(updatePromises);

    return {
      updatedCount: variants.length,
      message: `${variants.length} Variante(n) erfolgreich aktualisiert`,
    };
  }

  /**
   * Toplu fiyat güncellemelerini getir
   * @param {Object} params - { page, limit, filter }
   * @returns {Object} { updates, total, page, totalPages }
   */
  async getBulkPriceUpdates(params) {
    const { page = 1, limit = 10, filter = 'all' } = params;
    const skip = (page - 1) * limit;

    let where = {};
    if (filter === 'active') {
      where.isReverted = false;
    } else if (filter === 'reverted') {
      where.isReverted = true;
    }

    const [updates, total] = await Promise.all([
      prisma.bulkPriceUpdate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bulkPriceUpdate.count({ where }),
    ]);

    // Her update için affectedProducts içindeki productId'leri kullanarak ürün bilgilerini çek
    const enrichedUpdates = await Promise.all(
      updates.map(async (update) => {
        const affectedProducts = Array.isArray(update.affectedProducts)
          ? update.affectedProducts
          : [];

        // Tüm ürün ID'lerini topla (productName veya barcode eksik olanlar için)
        const productIdsToFetch = affectedProducts
          .filter((item) => item.productId && (!item.productName || !item.barcode))
          .map((item) => item.productId);

        // Eğer eksik bilgiler varsa, ürün bilgilerini çek
        if (productIdsToFetch.length > 0) {
          const products = await prisma.product.findMany({
            where: { id: { in: productIdsToFetch } },
            select: { id: true, name: true, barcode: true },
          });

          // Product bilgilerini map'le
          const productMap = new Map(
            products.map((p) => [p.id, { name: p.name, barcode: p.barcode }])
          );

          // affectedProducts'ı güncelle
          const enrichedProducts = affectedProducts.map((item) => {
            // Eğer productName veya barcode eksikse, veritabanından çekilen bilgilerle doldur
            if (item.productId && (!item.productName || !item.barcode)) {
              const productInfo = productMap.get(item.productId);
              if (productInfo) {
                return {
                  ...item,
                  productName: item.productName || productInfo.name,
                  barcode: item.barcode || productInfo.barcode,
                };
              }
            }
            return item;
          });

          return {
            ...update,
            affectedProducts: enrichedProducts,
          };
        }

        return update;
      })
    );

    return {
      updates: enrichedUpdates,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Toplu fiyat güncellemesini geri al
   * @param {String} id - BulkPriceUpdate ID
   * @param {String} adminId - Admin ID
   * @returns {Object} { message }
   */
  async revertBulkPriceUpdate(id, adminId) {
    const update = await prisma.bulkPriceUpdate.findUnique({
      where: { id },
    });

    if (!update) {
      throw new Error('Massenpreisaktualisierung nicht gefunden');
    }

    if (update.isReverted) {
      throw new Error('Diese Massenpreisaktualisierung wurde bereits rückgängig gemacht');
    }

    const affectedProducts = Array.isArray(update.affectedProducts)
      ? update.affectedProducts
      : [];

    // Fiyatları geri al
    await prisma.$transaction(async (tx) => {
      for (const item of affectedProducts) {
        if (item.variantId) {
          // Variant fiyatını geri al
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { price: item.oldVariantPrice },
          });
        } else {
          // Product fiyatını geri al
          const updateData = { price: item.oldPrice };
          
          // Eğer temporary price varsa, onu temizle
          if (update.updateType === 'TEMPORARY') {
            updateData.temporaryPrice = null;
            updateData.temporaryPriceEndDate = null;
          }
          
          await tx.product.update({
            where: { id: item.productId },
            data: updateData,
          });
        }
      }

      // BulkPriceUpdate'i geri alındı olarak işaretle
      await tx.bulkPriceUpdate.update({
        where: { id },
        data: {
          isReverted: true,
          revertedAt: new Date(),
          revertedBy: adminId,
        },
      });
    });

    return {
      message: 'Massenpreisaktualisierung erfolgreich rückgängig gemacht',
    };
  }

  /**
   * Toplu fiyat güncellemesinin bitiş tarihini güncelle
   * @param {String} id - BulkPriceUpdate ID
   * @param {Date} temporaryPriceEndDate - Yeni bitiş tarihi
   * @returns {Object} { message }
   */
  async updateBulkPriceUpdateEndDate(id, temporaryPriceEndDate) {
    const update = await prisma.bulkPriceUpdate.findUnique({
      where: { id },
    });

    if (!update) {
      throw new Error('Massenpreisaktualisierung nicht gefunden');
    }

    if (update.updateType !== 'TEMPORARY') {
      throw new Error('Nur temporäre Massenpreisaktualisierungen können bearbeitet werden');
    }

    if (update.isReverted) {
      throw new Error('Rückgängig gemachte Massenpreisaktualisierungen können nicht bearbeitet werden');
    }

    const endDate = new Date(temporaryPriceEndDate);
    const now = new Date();
    if (endDate <= now) {
      throw new Error('Das Enddatum muss in der Zukunft liegen');
    }

    // BulkPriceUpdate'in bitiş tarihini güncelle
    await prisma.bulkPriceUpdate.update({
      where: { id },
      data: { temporaryPriceEndDate: endDate },
    });

    // İlgili ürünlerin temporaryPriceEndDate'ini güncelle
    const affectedProducts = Array.isArray(update.affectedProducts)
      ? update.affectedProducts
      : [];

    await prisma.$transaction(async (tx) => {
      for (const item of affectedProducts) {
        if (!item.variantId) {
          // Sadece product'lar için (variant'lar temporary price desteklemiyor)
          await tx.product.update({
            where: { id: item.productId },
            data: { temporaryPriceEndDate: endDate },
          });
        }
      }
    });

    return {
      message: 'Enddatum erfolgreich aktualisiert',
    };
  }

  /**
   * Eksik bilgisi olan ürünleri getir
   * @param {String} missingType - 'image', 'barcode', 'category', 'price', 'expiryDate'
   * @param {Object} filters - { page, limit, search, categoryId }
   * @returns {Object} { products, pagination }
   */
  async getProductsWithMissingData(missingType, filters = {}) {
    const { page = 1, limit = 20, search, categoryId } = filters;
    const skip = (page - 1) * limit;

    // UUID formatını kontrol eden regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Muaf tutulan ürün ID'lerini al
    let ignoredIds = [];
    try {
      const ignoredProductIds = await prisma.productTaskIgnore.findMany({
        where: { category: missingType },
        select: { productId: true },
      });
      // Geçerli UUID'leri filtrele - null veya geçersiz formatları çıkar
      ignoredIds = ignoredProductIds
        .map((item) => item.productId)
        .filter((id) => {
          if (!id || typeof id !== 'string') return false;
          return uuidRegex.test(id);
        });
    } catch (error) {
      console.error('Muafiyet kayıtları yüklenirken hata:', error);
      // Hata durumunda boş array kullan
      ignoredIds = [];
    }

    // Where koşulunu oluştur
    const where = {};

    // Muaf tutulan ürünleri hariç tut
    if (ignoredIds.length > 0) {
      where.id = { notIn: ignoredIds };
    }

    // Eksiklik tipine göre koşul ekle
    switch (missingType) {
      case 'image':
        // imageUrls boş array kontrolü için özel işlem yapacağız
        // Prisma'da JSON array'in boş olup olmadığını kontrol etmek zor olduğu için
        // önce tüm ürünleri çekip sonra filtreleyeceğiz
        // where koşulunu image için özel olarak ayarlamayacağız
        break;
      case 'barcode':
        where.OR = [
          { barcode: null },
          { barcode: '' },
        ];
        break;
      case 'category':
        // categoryId nullable olmayan alan için null kontrolü zor olduğu için
        // JavaScript'te filtreleyeceğiz
        break;
      case 'price':
        // price için özel işlem yapacağız - Decimal null kontrolü zor olduğu için
        // JavaScript'te filtreleyeceğiz
        break;
      case 'expiryDate':
        where.expiryDate = null;
        where.excludeFromExpiryCheck = false;
        break;
      default:
        throw new Error(`Geçersiz eksiklik tipi: ${missingType}`);
    }

    // Kategori filtresi (category eksikliği kontrolü dışında)
    if (categoryId && missingType !== 'category') {
      where.categoryId = categoryId;
    }

    // Arama filtresi
    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // Ürünleri getir
    let products;
    let total;

    if (missingType === 'image') {
      // imageUrls için özel işlem - boş array kontrolü
      const allProducts = await prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Boş array kontrolü yap
      const filteredProducts = allProducts.filter((product) => {
        const imageUrls = product.imageUrls;
        return !imageUrls || (Array.isArray(imageUrls) && imageUrls.length === 0);
      });

      // Sayfalama
      total = filteredProducts.length;
      products = filteredProducts.slice(skip, skip + parseInt(limit));
    } else if (missingType === 'category') {
      // categoryId için özel işlem - nullable olmayan alan için null kontrolü
      // Tüm ürünleri çekip JavaScript'te filtrele
      const allProducts = await prisma.product.findMany({
        where: {
          ...where,
          // categoryId koşulunu kaldır, tüm ürünleri çek
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // categoryId null olanları filtrele
      const filteredProducts = allProducts.filter((product) => {
        return product.categoryId === null;
      });

      // Sayfalama
      total = filteredProducts.length;
      products = filteredProducts.slice(skip, skip + parseInt(limit));
    } else if (missingType === 'price') {
      // price için özel işlem - Decimal null kontrolü
      // Tüm ürünleri çekip JavaScript'te filtrele
      const allProducts = await prisma.product.findMany({
        where: {
          ...where,
          // NOT koşulunu kaldır, tüm ürünleri çek
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // price 0 veya null olanları filtrele
      const filteredProducts = allProducts.filter((product) => {
        return product.price === null || product.price === 0 || (typeof product.price === 'object' && product.price !== null && product.price.toNumber() === 0);
      });

      // Sayfalama
      total = filteredProducts.length;
      products = filteredProducts.slice(skip, skip + parseInt(limit));
    } else {
      // Diğer eksiklik tipleri için normal sorgu
      [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.product.count({ where }),
      ]);
    }

    return {
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Ürünü belirli bir görev tipinden muaf tut
   * @param {String} productId - Ürün ID
   * @param {String} category - Görev tipi ('image', 'barcode', 'category', 'price', 'expiryDate')
   * @returns {Object} ProductTaskIgnore kaydı
   */
  async ignoreProductTask(productId, category) {
    // Geçerli görev tiplerini kontrol et
    const validCategories = ['image', 'barcode', 'category', 'price', 'expiryDate'];
    if (!validCategories.includes(category)) {
      throw new Error(`Geçersiz görev tipi: ${category}`);
    }

    // UUID formatını kontrol et
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new Error(`Geçersiz ürün ID formatı: ${productId}`);
    }

    // Ürünün var olup olmadığını kontrol et
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Produkt nicht gefunden');
    }

    // Zaten muaf tutulmuş mu kontrol et
    const existing = await prisma.productTaskIgnore.findUnique({
      where: {
        productId_category: {
          productId,
          category,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Muafiyet kaydı oluştur
    const taskIgnore = await prisma.productTaskIgnore.create({
      data: {
        productId,
        category,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return taskIgnore;
  }

  /**
   * Ürünün muafiyetini kaldır
   * @param {String} productId - Ürün ID
   * @param {String} category - Görev tipi
   * @returns {Object} { message }
   */
  async unignoreProductTask(productId, category) {
    // UUID formatını kontrol et
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new Error(`Geçersiz ürün ID formatı: ${productId}`);
    }

    const taskIgnore = await prisma.productTaskIgnore.findUnique({
      where: {
        productId_category: {
          productId,
          category,
        },
      },
    });

    if (!taskIgnore) {
      throw new NotFoundError('Muafiyet kaydı bulunamadı');
    }

    await prisma.productTaskIgnore.delete({
      where: {
        productId_category: {
          productId,
          category,
        },
      },
    });

    return { message: 'Muafiyet başarıyla kaldırıldı' };
  }

  /**
   * Ürünün muaf olduğu görev tiplerini getir
   * @param {String} productId - Ürün ID
   * @returns {Array} Muafiyet kayıtları
   */
  async getProductTaskIgnores(productId) {
    // UUID formatını kontrol et
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new Error(`Geçersiz ürün ID formatı: ${productId}`);
    }

    const ignores = await prisma.productTaskIgnore.findMany({
      where: { productId },
      select: {
        id: true,
        category: true,
        createdAt: true,
      },
    });

    return ignores;
  }
}

export default new ProductService();
