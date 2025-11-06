import prisma from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';

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
  }) {
    const skip = (page - 1) * limit;

    // Where koşulları
    const where = {
      isActive: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
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
              where: { isActive: true },
            },
          },
        },
      },
    });

    return categories;
  }

  // Öne çıkan ürünleri getir
  async getFeaturedProducts(limit = 10) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
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
      'unit', 'barcode', 'brand', 'imageUrls', 'isActive', 'isFeatured', 'showStock'
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
      'unit', 'barcode', 'brand', 'imageUrls', 'isActive', 'isFeatured', 'showStock'
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
}

export default new ProductService();
