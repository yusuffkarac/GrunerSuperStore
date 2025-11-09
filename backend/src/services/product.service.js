import prisma from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { getGermanyDate } from '../utils/date.js';
import settingsService from './settings.service.js';

class ProductService {
  /**
   * Geçici fiyat kontrolü yapar ve aktif geçici fiyat varsa onu, yoksa normal fiyatı döndürür
   * @param {Object} product - Ürün objesi
   * @returns {Object} { displayPrice, isTemporary, temporaryPriceEndDate }
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

    // Her ürün için geçici fiyat kontrolü yap ve price alanını güncelle
    const productsWithDisplayPrice = products.map(product => {
      const priceInfo = this.getDisplayPrice(product);
      // Sadece price alanını güncelle, ekstra alanlar ekleme
      return {
        ...product,
        price: priceInfo.displayPrice, // Geçici fiyat varsa onu, yoksa normal fiyatı kullan
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

    // Geçici fiyat kontrolü yap ve price alanını güncelle
    const priceInfo = this.getDisplayPrice(product);
    const productWithDisplayPrice = {
      ...product,
      price: priceInfo.displayPrice, // Geçici fiyat varsa onu, yoksa normal fiyatı kullan
    };

    return productWithDisplayPrice;
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

    // Geçici fiyat kontrolü yap ve displayPrice ekle
    const priceInfo = this.getDisplayPrice(product);
    const productWithDisplayPrice = {
      ...product,
      displayPrice: priceInfo.displayPrice,
      isTemporaryPrice: priceInfo.isTemporary,
      temporaryPriceEndDate: priceInfo.temporaryPriceEndDate,
      originalPrice: priceInfo.originalPrice,
    };

    return productWithDisplayPrice;
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
      'nutritionData', 'openfoodfactsCategories'
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
      'nutritionData', 'openfoodfactsCategories'
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
      updateData.price = updateData.price === '' || updateData.price === null ? null : parseFloat(updateData.price);
    }
    if (updateData.stock !== undefined) {
      // Boş string veya null ise null'a çevir, aksi halde integer'a parse et
      if (updateData.stock === '' || updateData.stock === null) {
        updateData.stock = null;
      } else {
        const parsedStock = parseInt(updateData.stock);
        updateData.stock = isNaN(parsedStock) ? null : parsedStock;
      }
    }
    if (updateData.lowStockLevel !== undefined) {
      updateData.lowStockLevel = updateData.lowStockLevel ? parseInt(updateData.lowStockLevel) : null;
    }
    if (updateData.imageUrls !== undefined) {
      updateData.imageUrls = Array.isArray(updateData.imageUrls) ? updateData.imageUrls : [];
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
    const { type, categoryId, productIds, adjustmentType, adjustmentValue, updateType = 'permanent', temporaryPriceEndDate, includeVariants = false } = params;

    if (!type || !adjustmentType || adjustmentValue === undefined) {
      throw new Error('Fehlende erforderliche Parameter');
    }

    // Geçici fiyat için tarih kontrolü
    if (updateType === 'temporary' && !temporaryPriceEndDate) {
      throw new Error('Enddatum ist für temporäre Preise erforderlich');
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
    // Geçici fiyat için mevcut fiyatı (temporaryPrice varsa onu, yoksa price'ı) kullan
    const products = await prisma.product.findMany({
      where,
      select: { id: true, price: true, temporaryPrice: true, name: true },
    });

    if (products.length === 0) {
      return {
        updatedCount: 0,
        message: 'Keine Produkte gefunden',
      };
    }

    // Etkilenen ürünleri kaydet (geri alma için)
    const affectedProducts = [];
    let variantsUpdated = 0;

    // Her ürün için yeni fiyatı hesapla ve güncelle
    const updatePromises = products.map(async (product) => {
      // Mevcut fiyatı belirle (geçici fiyat varsa onu kullan, yoksa normal fiyatı)
      const currentPrice = product.temporaryPrice ? parseFloat(product.temporaryPrice) : parseFloat(product.price);
      const oldPrice = parseFloat(product.price);
      
      let newPrice;

      if (adjustmentType === 'percentage') {
        // Yüzde artış/azalış
        newPrice = currentPrice * (1 + value / 100);
      } else {
        // Sabit miktar artış/azalış
        newPrice = currentPrice + value;
      }

      // Negatif fiyat olmaması için kontrol
      if (newPrice < 0) {
        newPrice = 0;
      }

      // Fiyatı 2 ondalık basamağa yuvarla
      newPrice = Math.round(newPrice * 100) / 100;

      // Güncelleme tipine göre veriyi hazırla
      const updateData = {};
      
      if (updateType === 'temporary') {
        // Geçici fiyat güncellemesi
        updateData.temporaryPrice = newPrice;
        updateData.temporaryPriceEndDate = new Date(temporaryPriceEndDate);
      } else {
        // Kalıcı fiyat güncellemesi
        updateData.price = newPrice;
        // Geçici fiyat varsa temizle
        updateData.temporaryPrice = null;
        updateData.temporaryPriceEndDate = null;
      }

      // Etkilenen ürünü kaydet
      affectedProducts.push({
        productId: product.id,
        productName: product.name,
        oldPrice: oldPrice,
        newPrice: updateType === 'temporary' ? newPrice : newPrice,
        oldTemporaryPrice: product.temporaryPrice ? parseFloat(product.temporaryPrice) : null,
        newTemporaryPrice: updateType === 'temporary' ? newPrice : null,
      });

      return prisma.product.update({
        where: { id: product.id },
        data: updateData,
      });
    });

    await Promise.all(updatePromises);

    // Varyantları da güncelle (eğer istenmişse)
    if (includeVariants && updateType === 'permanent') {
      const variantResult = await this.bulkUpdateVariantPrices({
        type,
        categoryId,
        productIds,
        adjustmentType,
        adjustmentValue,
      });
      variantsUpdated = variantResult.updatedCount || 0;
    }

    // Güncelleme kaydını oluştur
    const bulkUpdate = await prisma.bulkPriceUpdate.create({
      data: {
        type,
        categoryId: categoryId || null,
        productIds: productIds || null,
        adjustmentType,
        adjustmentValue: value,
        updateType: updateType.toUpperCase(),
        temporaryPriceEndDate: temporaryPriceEndDate ? new Date(temporaryPriceEndDate) : null,
        includeVariants,
        affectedProducts,
        productsUpdated: products.length,
        variantsUpdated,
        totalUpdated: products.length + variantsUpdated,
      },
    });

    return {
      updatedCount: products.length,
      variantsUpdated,
      totalUpdated: products.length + variantsUpdated,
      message: `${products.length} Produkt(e) erfolgreich aktualisiert`,
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
    const variants = await prisma.variant.findMany({
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

      return prisma.variant.update({
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
   * Toplu fiyat güncellemelerini listele
   * @param {Object} params - { page, limit, isReverted }
   * @returns {Object} { updates, pagination }
   */
  async getBulkPriceUpdates({ page = 1, limit = 20, isReverted = null }) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (isReverted !== null) {
      where.isReverted = isReverted === true;
    }

    const [updates, total] = await Promise.all([
      prisma.bulkPriceUpdate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.bulkPriceUpdate.count({ where }),
    ]);

    return {
      updates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Toplu fiyat güncellemesini geri al
   * @param {String} bulkUpdateId - Güncelleme ID'si
   * @param {String} adminId - Admin ID'si (geri alan kişi)
   * @returns {Object} { message, revertedCount }
   */
  async revertBulkPriceUpdate(bulkUpdateId, adminId) {
    // Güncelleme kaydını bul
    const bulkUpdate = await prisma.bulkPriceUpdate.findUnique({
      where: { id: bulkUpdateId },
    });

    if (!bulkUpdate) {
      throw new NotFoundError('Toplu fiyat güncellemesi bulunamadı');
    }

    if (bulkUpdate.isReverted) {
      throw new ValidationError('Bu güncelleme zaten geri alınmış');
    }

    const affectedProducts = Array.isArray(bulkUpdate.affectedProducts) 
      ? bulkUpdate.affectedProducts 
      : [];

    if (affectedProducts.length === 0) {
      throw new ValidationError('Geri alınacak ürün bulunamadı');
    }

    // Ürünleri geri al
    let revertedCount = 0;
    const updatePromises = affectedProducts.map(async (item) => {
      const updateData = {};

      if (bulkUpdate.updateType === 'TEMPORARY') {
        // Geçici fiyat güncellemesi geri alınıyor
        // Eski geçici fiyatı geri yükle veya null yap
        if (item.oldTemporaryPrice !== null && item.oldTemporaryPrice !== undefined) {
          updateData.temporaryPrice = item.oldTemporaryPrice;
        } else {
          updateData.temporaryPrice = null;
          updateData.temporaryPriceEndDate = null;
        }
      } else {
        // Kalıcı fiyat güncellemesi geri alınıyor
        // Eski fiyatı geri yükle
        updateData.price = item.oldPrice;
        // Geçici fiyat varsa temizle (çünkü kalıcı güncelleme yapılmıştı)
        updateData.temporaryPrice = null;
        updateData.temporaryPriceEndDate = null;
      }

      try {
        await prisma.product.update({
          where: { id: item.productId },
          data: updateData,
        });
        revertedCount++;
      } catch (error) {
        console.error(`Ürün geri alma hatası (${item.productId}):`, error);
        // Hata olsa bile devam et
      }
    });

    await Promise.all(updatePromises);

    // Güncelleme kaydını işaretle
    await prisma.bulkPriceUpdate.update({
      where: { id: bulkUpdateId },
      data: {
        isReverted: true,
        revertedAt: new Date(),
        revertedBy: adminId,
      },
    });

    return {
      message: `${revertedCount} ürün başarıyla geri alındı`,
      revertedCount,
    };
  }
}

export default new ProductService();
