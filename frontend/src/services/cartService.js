import api from './api';

const cartService = {
  // Sepeti getir
  getCart: async () => {
    return await api.get('/cart');
  },

  // Sepete ürün ekle
  addToCart: async (productId, quantity = 1) => {
    return await api.post('/cart', { productId, quantity });
  },

  // Sepetteki ürün miktarını güncelle
  updateCartItem: async (productId, quantity) => {
    return await api.put(`/cart/${productId}`, { quantity });
  },

  // Sepetten ürün sil
  removeFromCart: async (productId) => {
    return await api.delete(`/cart/${productId}`);
  },

  // Sepeti temizle
  clearCart: async () => {
    return await api.delete('/cart');
  },
};

export default cartService;
