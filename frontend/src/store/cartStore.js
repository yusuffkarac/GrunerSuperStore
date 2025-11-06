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
          set({ items: response.data.cart || [], loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      // Sepete ürün ekle
      addItem: async (product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find((item) => item.productId === product.id);

        if (existingItem) {
          // Ürün zaten sepette varsa miktarını artır
          await get().updateItemQuantity(product.id, existingItem.quantity + quantity);
        } else {
          // Yeni ürün ekle
          const newItem = {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
            imageUrl: Array.isArray(product.imageUrls) ? product.imageUrls[0] : null,
            stock: product.stock,
            unit: product.unit,
          };

          set({ items: [...items, newItem] });

          // Server'a da ekle (authenticated ise)
          try {
            await cartService.addToCart(product.id, quantity);
          } catch (error) {
            // Server hatası olursa sadece local'de kalır
            console.error('Cart sync error:', error);
          }
        }
      },

      // Ürün miktarını güncelle
      updateItemQuantity: async (productId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(productId);
          return;
        }

        const items = get().items;
        const updatedItems = items.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        );

        set({ items: updatedItems });

        // Server'ı güncelle (authenticated ise)
        try {
          await cartService.updateCartItem(productId, quantity);
        } catch (error) {
          console.error('Cart sync error:', error);
        }
      },

      // Sepetten ürün sil
      removeItem: async (productId) => {
        const items = get().items;
        const updatedItems = items.filter((item) => item.productId !== productId);
        set({ items: updatedItems });

        // Server'dan sil (authenticated ise)
        try {
          await cartService.removeFromCart(productId);
        } catch (error) {
          console.error('Cart sync error:', error);
        }
      },

      // Sepeti temizle
      clearCart: async () => {
        set({ items: [] });

        // Server'ı temizle (authenticated ise)
        try {
          await cartService.clearCart();
        } catch (error) {
          console.error('Cart sync error:', error);
        }
      },

      // Error'u temizle
      clearError: () => set({ error: null }),
    }),
    {
      name: 'cart-storage', // localStorage key
      partialize: (state) => ({ items: state.items }), // Sadece items'ı persist et
    }
  )
);

export default useCartStore;
