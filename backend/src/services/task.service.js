import prisma from '../config/prisma.js';

class TaskService {
  /**
   * Eksik bilgileri olan ürünleri kategorilere göre analiz et ve grupla
   * @returns {Object} Kategorilere göre gruplanmış ürünler
   */
  async getTasks() {
    // Görmezden gelinen ürün ID'lerini al
    const ignoredProducts = await prisma.productTaskIgnore.findMany({
      select: {
        productId: true,
        category: true,
      },
    });

    // Görmezden gelinen ürünleri kategoriye göre grupla
    const ignoredMap = {};
    ignoredProducts.forEach((ignore) => {
      if (!ignoredMap[ignore.category]) {
        ignoredMap[ignore.category] = new Set();
      }
      ignoredMap[ignore.category].add(ignore.productId);
    });

    // Tüm ürünleri getir (category bilgisi ile)
    const allProducts = await prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        taskIgnores: {
          select: {
            id: true,
            category: true,
          },
        },
      },
    });

    // Kategorilere göre grupla
    const categories = {
      price: [],
      image: [],
      stock: [],
      barcode: [],
    };

    allProducts.forEach((product) => {
      // Fiyat eksik kontrolü - null, undefined veya 0 olanları kontrol et
      const priceValue = product.price;
      // Prisma Decimal tipi için kontrol
      const priceNum = priceValue === null || priceValue === undefined 
        ? null 
        : parseFloat(priceValue.toString());
      const hasNoPrice = priceValue === null || 
                         priceValue === undefined || 
                         priceNum === 0 ||
                         isNaN(priceNum);
      
      if (hasNoPrice) {
        const isIgnored = ignoredMap.price?.has(product.id);
        if (!isIgnored) {
          categories.price.push({
            id: product.id,
            name: product.name,
            category: product.category,
            price: priceValue,
            ignored: false,
            ignoreId: null,
          });
        }
      }

      // Fotoğraf eksik kontrolü
      const imageUrls = product.imageUrls;
      const hasNoImages =
        imageUrls === null ||
        (Array.isArray(imageUrls) && imageUrls.length === 0) ||
        (typeof imageUrls === 'string' && imageUrls === '[]');
      
      if (hasNoImages) {
        const isIgnored = ignoredMap.image?.has(product.id);
        if (!isIgnored) {
          categories.image.push({
            id: product.id,
            name: product.name,
            category: product.category,
            imageUrls: product.imageUrls,
            ignored: false,
            ignoreId: null,
          });
        }
      }

      // Stok eksik kontrolü - null, undefined veya 0 olanları kontrol et
      const stockValue = product.stock;
      const hasNoStock = stockValue === null || 
                         stockValue === undefined || 
                         stockValue === 0;
      
      if (hasNoStock) {
        const isIgnored = ignoredMap.stock?.has(product.id);
        if (!isIgnored) {
          categories.stock.push({
            id: product.id,
            name: product.name,
            category: product.category,
            stock: stockValue,
            ignored: false,
            ignoreId: null,
          });
        }
      }

      // Barkod eksik kontrolü
      if (product.barcode === null || product.barcode === '') {
        const isIgnored = ignoredMap.barcode?.has(product.id);
        if (!isIgnored) {
          categories.barcode.push({
            id: product.id,
            name: product.name,
            category: product.category,
            barcode: product.barcode,
            ignored: false,
            ignoreId: null,
          });
        }
      }
    });

    return {
      price: {
        count: categories.price.length,
        products: categories.price,
      },
      image: {
        count: categories.image.length,
        products: categories.image,
      },
      stock: {
        count: categories.stock.length,
        products: categories.stock,
      },
      barcode: {
        count: categories.barcode.length,
        products: categories.barcode,
      },
    };
  }

  /**
   * Ürün için kategoriyi görmezden gel
   * @param {String} productId - Ürün ID
   * @param {String} category - Kategori ('price', 'image', 'stock', 'barcode')
   * @returns {Object} Oluşturulan ignore kaydı
   */
  async ignoreTask(productId, category) {
    // Geçerli kategori kontrolü
    const validCategories = ['price', 'image', 'stock', 'barcode'];
    if (!validCategories.includes(category)) {
      throw new Error(`Ungültige Kategorie: ${category}`);
    }

    // Ürünün var olup olmadığını kontrol et
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Produkt nicht gefunden');
    }

    // Zaten ignore edilmiş mi kontrol et
    const existingIgnore = await prisma.productTaskIgnore.findUnique({
      where: {
        productId_category: {
          productId,
          category,
        },
      },
    });

    if (existingIgnore) {
      return existingIgnore;
    }

    // Yeni ignore kaydı oluştur
    const ignore = await prisma.productTaskIgnore.create({
      data: {
        productId,
        category,
      },
    });

    return ignore;
  }

  /**
   * Görmezden gelme kaydını kaldır
   * @param {String} ignoreId - Ignore kaydı ID
   * @returns {Object} Silinen kayıt
   */
  async removeIgnore(ignoreId) {
    const ignore = await prisma.productTaskIgnore.findUnique({
      where: { id: ignoreId },
    });

    if (!ignore) {
      throw new Error('Ignore-Eintrag nicht gefunden');
    }

    await prisma.productTaskIgnore.delete({
      where: { id: ignoreId },
    });

    return ignore;
  }
}

export default new TaskService();

