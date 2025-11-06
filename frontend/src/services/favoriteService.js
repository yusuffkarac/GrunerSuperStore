import api from './api';

const favoriteService = {
  // Favori ürünleri listele
  getFavorites: async (params = {}) => {
    return await api.get('/favorites', { params });
  },

  // Favori ID'lerini getir (hızlı kontrol için)
  getFavoriteIds: async () => {
    return await api.get('/favorites/ids');
  },

  // Favorilere ekle
  addFavorite: async (productId) => {
    return await api.post(`/favorites/${productId}`);
  },

  // Favorilerden çıkar
  removeFavorite: async (productId) => {
    return await api.delete(`/favorites/${productId}`);
  },

  // Ürün favorilerde mi kontrol et
  checkFavorite: async (productId) => {
    return await api.get(`/favorites/check/${productId}`);
  },
};

export default favoriteService;
