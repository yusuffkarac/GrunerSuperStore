import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import productService from './product.service.js';

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
            temporaryPrice: true,
            temporaryPriceEndDate: true,
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
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            imageUrls: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Toplam hesaplama
    let subtotal = 0;
    const items = cartItems.map((item) => {
      // Varyant varsa varyant fiyatını, yoksa ürün fiyatını kullan
      // Geçici fiyat kontrolü yap
      let price;
      if (item.variant) {
        price = parseFloat(item.variant.price);
      } else {
        // Geçici fiyat kontrolü yap
        const priceInfo = productService.getDisplayPrice(item.product);
        price = priceInfo.displayPrice;
        // Product objesini güncelle (geçici fiyat varsa price'ı güncelle)
        item.product.price = priceInfo.displayPrice;
      }
      
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      return {
        id: item.id,
        quantity: item.quantity,
        product: item.product,
        variant: item.variant,
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
  async addToCart(userId, { productId, variantId, quantity }) {
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

    // Varyant kontrolü
    let variant = null;
    if (variantId) {
      variant = await prisma.productVariant.findFirst({
        where: {
          id: variantId,
          productId: productId,
          isActive: true,
        },
      });

      if (!variant) {
        throw new NotFoundError('Variant nicht gefunden');
      }

      // Varyant stok kontrolü
      if (variant.stock < quantity) {
        throw new ValidationError('Nicht genügend Lagerbestand für diese Variante');
      }
    } else {
      // Varyant yoksa ürün stok kontrolü
      if (product.stock < quantity) {
        throw new ValidationError('Nicht genügend Lagerbestand');
      }
    }

    // Sepette zaten var mı kontrol et (variantId ile birlikte)
    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingCartItem) {
      // Mevcut miktarı artır
      const newQuantity = existingCartItem.quantity + quantity;
      const availableStock = variant ? variant.stock : product.stock;

      if (availableStock < newQuantity) {
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
          variant: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
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
        variantId: variantId || null,
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
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
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
        variant: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundError('Warenkorb-Artikel nicht gefunden');
    }

    // Stok kontrolü (varyant varsa varyant stokunu, yoksa ürün stokunu kontrol et)
    const availableStock = cartItem.variant ? cartItem.variant.stock : cartItem.product.stock;
    if (availableStock < quantity) {
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
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
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
