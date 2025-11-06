import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

class CartService {
  // Kullanıcının sepetini getir
  async getCart(userId) {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            stock: true,
            unit: true,
            brand: true,
            imageUrls: true,
            isActive: true,
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
      orderBy: { createdAt: 'desc' },
    });

    // Toplam hesaplama
    let subtotal = 0;
    const items = cartItems.map((item) => {
      const itemTotal = parseFloat(item.product.price) * item.quantity;
      subtotal += itemTotal;

      return {
        id: item.id,
        quantity: item.quantity,
        product: item.product,
        itemTotal: itemTotal.toFixed(2),
      };
    });

    return {
      items,
      subtotal: subtotal.toFixed(2),
      itemCount: items.length,
    };
  }

  // Sepete ürün ekle
  async addToCart(userId, { productId, quantity }) {
    // Ürün kontrolü
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Produkt nicht gefunden');
    }

    if (!product.isActive) {
      throw new ValidationError('Produkt ist nicht verfügbar');
    }

    if (product.stock < quantity) {
      throw new ValidationError('Nicht genügend Lagerbestand');
    }

    // Sepette zaten var mı kontrol et
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingCartItem) {
      // Mevcut miktarı artır
      const newQuantity = existingCartItem.quantity + quantity;

      if (product.stock < newQuantity) {
        throw new ValidationError('Nicht genügend Lagerbestand');
      }

      const updatedCartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              unit: true,
              imageUrls: true,
            },
          },
        },
      });

      return updatedCartItem;
    }

    // Yeni sepet öğesi oluştur
    const cartItem = await prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            unit: true,
            imageUrls: true,
          },
        },
      },
    });

    return cartItem;
  }

  // Sepet öğesi miktarını güncelle
  async updateCartItem(userId, cartItemId, { quantity }) {
    // Sepet öğesini bul
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
      include: {
        product: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundError('Warenkorb-Artikel nicht gefunden');
    }

    // Stok kontrolü
    if (cartItem.product.stock < quantity) {
      throw new ValidationError('Nicht genügend Lagerbestand');
    }

    // Güncelle
    const updatedCartItem = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            unit: true,
            imageUrls: true,
          },
        },
      },
    });

    return updatedCartItem;
  }

  // Sepetten ürün sil
  async deleteCartItem(userId, cartItemId) {
    // Sepet öğesini bul
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
    });

    if (!cartItem) {
      throw new NotFoundError('Warenkorb-Artikel nicht gefunden');
    }

    // Sil
    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return { message: 'Artikel aus dem Warenkorb entfernt' };
  }

  // Sepeti temizle
  async clearCart(userId) {
    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    return { message: 'Warenkorb geleert' };
  }
}

export default new CartService();
