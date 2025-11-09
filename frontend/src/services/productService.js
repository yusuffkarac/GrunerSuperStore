import api from './api';

const productService = {
  // Tüm ürünleri listele
  getProducts: async (params = {}) => {
    return await api.get('/products', { params });
  },

  // Ürün detayı (ID ile)
  getProductById: async (id) => {
    return await api.get(`/products/${id}`);
  },

  // Ürün detayı (slug ile)
  getProductBySlug: async (slug) => {
    return await api.get(`/products/slug/${slug}`);
  },

  // Öne çıkan ürünler
  getFeaturedProducts: async (limit = 10) => {
    return await api.get('/products/featured', { params: { limit } });
  },

  // En çok satan ürünler
  getBestSellers: async (limit = 10) => {
    return await api.get('/products/bestsellers', { params: { limit } });
  },

  // Kategoriye göre ürünler
  getProductsByCategory: async (categoryId, params = {}) => {
    return await api.get('/products', {
      params: { ...params, categoryId }
    });
  },

  // Ürün ara
  searchProducts: async (search, params = {}) => {
    return await api.get('/products', {
      params: { ...params, search }
    });
  },
};

export default productService;
