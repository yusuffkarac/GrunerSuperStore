import api from './api';
import { adminApi } from './adminService';

const faqService = {
  // Aktif FAQ'ları getir (Public - User tarafı)
  getActiveFAQs: async () => {
    const response = await api.get('/faqs/active');
    // Backend response: { success: true, data: { faqs, grouped, categories } }
    // Axios response: { data: { success: true, data: { faqs, grouped, categories } } }
    return response.data.data || response.data;
  },

  // ==== ADMIN ENDPOINTS ====

  // Tüm FAQ'ları getir (Admin)
  getAllFAQs: async () => {
    const response = await adminApi.get('/admin/faqs');
    return response.data;
  },

  // ID'ye göre FAQ getir (Admin)
  getFAQById: async (id) => {
    const response = await adminApi.get(`/admin/faqs/${id}`);
    return response.data;
  },

  // Yeni FAQ oluştur (Admin)
  createFAQ: async (data) => {
    const response = await adminApi.post('/admin/faqs', data);
    return response.data;
  },

  // FAQ güncelle (Admin)
  updateFAQ: async (id, data) => {
    const response = await adminApi.put(`/admin/faqs/${id}`, data);
    return response.data;
  },

  // FAQ sil (Admin)
  deleteFAQ: async (id) => {
    const response = await adminApi.delete(`/admin/faqs/${id}`);
    return response.data;
  },

  // Aktif/Pasif değiştir (Admin)
  toggleActive: async (id) => {
    const response = await adminApi.patch(`/admin/faqs/${id}/toggle`);
    return response.data;
  },

  // Default FAQ'ları yükle (Admin)
  resetToDefaults: async () => {
    const response = await adminApi.post('/admin/faqs/reset-to-defaults');
    return response.data;
  },

  // Bulk import FAQ'ları (Admin)
  bulkImport: async (faqs, replaceAll = false) => {
    const response = await adminApi.post('/admin/faqs/bulk-import', {
      faqs,
      replaceAll,
    });
    return response.data;
  },
};

export default faqService;

