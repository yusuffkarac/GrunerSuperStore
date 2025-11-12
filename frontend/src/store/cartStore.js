import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import cartService from '../services/cartService';

// Cart store - Local storage ile persist edilir
const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,

      // Sepet toplamını hesapla
      getTotal: () => {
        const items = get().items;
        return items.reduce((total, item) => {
          return total + parseFloat(item.price) * item.quantity;
        }, 0);
      },

      // Sepetteki toplam ürün sayısı
      getItemCount: () => {
        const items = get().items;
        return items.reduce((count, item) => count + item.quantity, 0);
      },

      // Sepeti server'dan yükle (authenticated users için)
      loadCart: async () => {
        set({ loading: true, error: null });
        try {
          const response = await cartService.getCart();
          const cartItems = response.data?.items || response.data?.cart || [];
          // Server'dan gelen item'ları formatla
          const formattedItems = cartItems.map((item) => ({
            id: item.id,
            productId: item.product?.id || item.productId,
            variantId: item.variant?.id || item.variantId || null,
            name: item.product?.name || item.name,
            variantName: item.variant?.name || item.variantName || null,
            price: item.variant ? parseFloat(item.variant.price) : parseFloat(item.product?.price || item.price),
            quantity: item.quantity,
            imageUrl: item.variant?.imageUrls?.[0] || item.product?.imageUrls?.[0] || item.imageUrl || null,
            stock: item.variant ? item.variant.stock : (item.product?.stock || item.stock),
            unit: item.product?.unit || item.unit,
          }));
          set({ items: formattedItems, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      // Sepete ürün ekle
      addItem: async (product, quantity = 1, variantId = null) => {
        const items = get().items;
        // Varyant ID'sine göre de kontrol et
        const existingItem = items.find(
          (item) => item.productId === product.id && item.variantId === variantId
        );

        if (existingItem) {
          // Ürün zaten sepette varsa miktarını artır
          await get().updateItemQuantity(product.id, existingItem.quantity + quantity, variantId);
        } else {
          // Varyant bilgilerini al
          const variant = variantId && product.variants 
            ? product.variants.find(v => v.id === variantId)
            : null;

          // Fiyat: varyant varsa varyant fiyatını, yoksa ürün fiyatını kullan
          const price = variant ? parseFloat(variant.price) : parseFloat(product.price);
          // Stok: varyant varsa varyant stokunu, yoksa ürün stokunu kullan
          const stock = variant ? variant.stock : product.stock;
          // Görsel: varyant varsa varyant görselini, yoksa ürün görselini kullan
          const imageUrls = variant 
            ? (Array.isArray(variant.imageUrls) ? variant.imageUrls : [])
            : (Array.isArray(product.imageUrls) ? product.imageUrls : []);
          const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

          // Yeni ürün ekle
          const newItem = {
            productId: product.id,
            variantId: variantId || null,
            name: product.name,
            variantName: variant ? variant.name : null,
            price: price,
            quantity,
            imageUrl: imageUrl,
            stock: stock,
            unit: product.unit,
          };

          set({ items: [...items, newItem] });

          // Server'a da ekle (authenticated ise)
          const token = localStorage.getItem('token');
          if (token) {
            try {
              await cartService.addToCart(product.id, quantity, variantId);
            } catch (error) {
              // Server hatası olursa sadece local'de kalır
              console.error('Cart sync error:', error);
            }
          }
        }
      },

      // Ürün miktarını güncelle
      updateItemQuantity: async (productId, quantity, variantId = null) => {
        if (quantity <= 0) {
          await get().removeItem(productId, variantId);
          return;
        }

        const items = get().items;
        const updatedItems = items.map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity }
            : item
        );

        set({ items: updatedItems });

        // Server'ı güncelle (authenticated ise)
        const token = localStorage.getItem('token');
        if (token) {
          try {
            // CartItem ID'sini bul (eğer varsa)
            const item = items.find(
              (i) => i.productId === productId && i.variantId === variantId
            );
            if (item && item.id) {
              await cartService.updateCartItem(item.id, quantity);
            }
          } catch (error) {
            console.error('Cart sync error:', error);
          }
        }
      },

      // Sepetten ürün sil
      removeItem: async (productId, variantId = null) => {
        const items = get().items;
        const item = items.find(
          (i) => i.productId === productId && i.variantId === variantId
        );
        const updatedItems = items.filter(
          (i) => !(i.productId === productId && i.variantId === variantId)
        );
        set({ items: updatedItems });

        // Server'dan sil (authenticated ise)
        const token = localStorage.getItem('token');
        if (token) {
          try {
            if (item && item.id) {
              await cartService.removeFromCart(item.id);
            }
          } catch (error) {
            console.error('Cart sync error:', error);
          }
        }
      },

      // Sepeti temizle
      clearCart: async () => {
        set({ items: [] });

        // Server'ı temizle (authenticated ise)
        const token = localStorage.getItem('token');
        if (token) {
          try {
            await cartService.clearCart();
          } catch (error) {
            console.error('Cart sync error:', error);
          }
        }
      },

      // Error'u temizle
      clearError: () => set({ error: null }),

      // Siparişi tekrar et - Sipariş ürünlerini sepete ekle
      reorderFromOrder: async (orderItems) => {
        try {
          // Her ürünü sepete ekle
          for (const item of orderItems) {
            // Ürün nesnesini oluştur (addItem'ın beklediği formatta)
            const product = {
              id: item.productId,
              name: item.productName,
              price: item.price,
              unit: item.unit,
              stock: 999, // Stok bilgisini varsayılan yüksek bir değer olarak ayarla
              imageUrls: item.imageUrl ? [item.imageUrl] : [],
              variants: item.variantId ? [{
                id: item.variantId,
                name: item.variantName,
                price: item.price,
                stock: 999,
                imageUrls: item.imageUrl ? [item.imageUrl] : [],
              }] : null
            };

            // Sepete ekle
            await get().addItem(product, item.quantity, item.variantId);
          }

          return true;
        } catch (error) {
          console.error('Reorder error:', error);
          throw error;
        }
      },
    }),
    {
      name: 'cart-storage', // localStorage key
      partialize: (state) => ({ items: state.items }), // Sadece items'ı persist et
    }
  )
);

export default useCartStore;
