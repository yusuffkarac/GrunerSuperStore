import api from './api';

const categoryService = {
  // Tüm kategorileri listele
  getCategories: async () => {
    return await api.get('/categories');
  },

  // Kategori detayı
  getCategoryById: async (id) => {
    return await api.get(`/categories/${id}`);
  },

  // Kategori detayı (slug ile)
  getCategoryBySlug: async (slug) => {
    return await api.get(`/categories/slug/${slug}`);
  },
};

export default categoryService;
