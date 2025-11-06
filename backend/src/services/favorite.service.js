import prisma from '../config/prisma.js';
import {
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

class FavoriteService {
  // Kullanıcının favori ürünlerini getir
  async getFavorites(userId, filters = {}) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              price: true,
              stock: true,
              unit: true,
              brand: true,
              imageUrls: true,
              isActive: true,
              isFeatured: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      favorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Favorilere ekle
  async addFavorite(userId, productId) {
    // Ürünün varlığını kontrol et
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Produkt nicht gefunden');
    }

    // Zaten favorilerde mi kontrol et
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            imageUrls: true,
            isActive: true,
          },
        },
      },
    });

    // Zaten favorilerdeyse mevcut favoriyi döndür (idempotent)
    if (existingFavorite) {
      return existingFavorite;
    }

    // Favorilere ekle
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            imageUrls: true,
            isActive: true,
          },
        },
      },
    });

    return favorite;
  }

  // Favorilerden çıkar
  async removeFavorite(userId, productId) {
    // Favorilerde mi kontrol et
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundError('Produkt ist nicht in den Favoriten');
    }

    // Favorilerden sil
    await prisma.favorite.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return { message: 'Produkt erfolgreich aus den Favoriten entfernt' };
  }

  // Ürün favorilerde mi kontrol et
  async isFavorite(userId, productId) {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return { isFavorite: !!favorite };
  }

  // Favori ID'lerini getir (UI için hızlı kontrol)
  async getFavoriteIds(userId) {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: { productId: true },
    });

    return favorites.map((fav) => fav.productId);
  }
}

export default new FavoriteService();
