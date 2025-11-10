import prisma from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { getGermanyDate } from '../utils/date.js';
import settingsService from './settings.service.js';

class ProductService {
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

    return product;
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

    return product;
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
   * @param {Object} params - { type: 'all' | 'category' | 'products', categoryId?, productIds?, adjustmentType: 'percentage' | 'fixed', adjustmentValue: number }
   * @returns {Object} { updatedCount, message }
   */
  async bulkUpdatePrices(params) {
    const { type, categoryId, productIds, adjustmentType, adjustmentValue } = params;

    if (!type || !adjustmentType || adjustmentValue === undefined) {
      throw new Error('Fehlende erforderliche Parameter');
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
      select: { id: true, price: true, name: true },
    });

    if (products.length === 0) {
      return {
        updatedCount: 0,
        message: 'Keine Produkte gefunden',
      };
    }

    // Her ürün için yeni fiyatı hesapla ve güncelle
    const updatePromises = products.map(async (product) => {
      let newPrice;

      if (adjustmentType === 'percentage') {
        // Yüzde artış/azalış
        newPrice = parseFloat(product.price) * (1 + value / 100);
      } else {
        // Sabit miktar artış/azalış
        newPrice = parseFloat(product.price) + value;
      }

      // Negatif fiyat olmaması için kontrol
      if (newPrice < 0) {
        newPrice = 0;
      }

      // Fiyatı 2 ondalık basamağa yuvarla
      newPrice = Math.round(newPrice * 100) / 100;

      return prisma.product.update({
        where: { id: product.id },
        data: { price: newPrice },
      });
    });

    await Promise.all(updatePromises);

    return {
      updatedCount: products.length,
      message: `${products.length} Produkt(e) erfolgreich aktualisiert`,
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
}

export default new ProductService();
