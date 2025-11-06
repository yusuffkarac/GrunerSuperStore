import { create } from 'zustand';
import favoriteService from '../services/favoriteService';

// Favorite store
const useFavoriteStore = create((set, get) => ({
  favorites: [],
  favoriteIds: [], // Hızlı kontrol için sadece ID'ler
  loading: false,
  error: null,

  // Favorileri yükle
  loadFavorites: async () => {
    set({ loading: true, error: null });
    try {
      const response = await favoriteService.getFavorites();
      const favorites = response.data.favorites || [];
      const favoriteIds = favorites.map((fav) => fav.product.id);
      set({ favorites, favoriteIds, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Sadece ID'leri yükle (hafif)
  loadFavoriteIds: async () => {
    try {
      const response = await favoriteService.getFavoriteIds();
      set({ favoriteIds: response.data.favoriteIds || [] });
    } catch (error) {
      console.error('Favorite IDs load error:', error);
    }
  },

  // Favorilere ekle
  addFavorite: async (productId) => {
    try {
      await favoriteService.addFavorite(productId);
      const favoriteIds = get().favoriteIds;
      // Eğer zaten favorilerde değilse ekle
      if (!favoriteIds.includes(productId)) {
        set({ favoriteIds: [...favoriteIds, productId] });
      }
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Favorilerden çıkar
  removeFavorite: async (productId) => {
    try {
      await favoriteService.removeFavorite(productId);
      const favoriteIds = get().favoriteIds;
      set({ favoriteIds: favoriteIds.filter((id) => id !== productId) });
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Ürün favorilerde mi kontrol et - selector olarak kullanılabilir
  isFavorite: (productId) => {
    return get().favoriteIds.includes(productId);
  },

  // Toggle favorite
  toggleFavorite: async (productId) => {
    const isFav = get().isFavorite(productId);
    if (isFav) {
      await get().removeFavorite(productId);
    } else {
      await get().addFavorite(productId);
    }
  },

  // Error'u temizle
  clearError: () => set({ error: null }),
}));

export default useFavoriteStore;
