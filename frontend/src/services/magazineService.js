import api from './api';
import { adminApi } from './adminService';

const magazineService = {
  // Aktif dergileri getir (Public - User tarafı)
  getActiveMagazines: async () => {
    const response = await api.get('/magazines/active');
    return response.data;
  },

  // ==== ADMIN ENDPOINTS ====

  // Tüm dergileri getir (Admin)
  getAllMagazines: async () => {
    const response = await adminApi.get('/admin/magazines');
    return response.data;
  },

  // ID'ye göre dergi getir (Admin)
  getMagazineById: async (id) => {
    const response = await adminApi.get(`/admin/magazines/${id}`);
    return response.data;
  },

  // Yeni dergi oluştur (Admin)
  createMagazine: async (data) => {
    const response = await adminApi.post('/admin/magazines', data);
    return response.data;
  },

  // Dergi güncelle (Admin)
  updateMagazine: async (id, data) => {
    const response = await adminApi.put(`/admin/magazines/${id}`, data);
    return response.data;
  },

  // Dergi sil (Admin)
  deleteMagazine: async (id) => {
    const response = await adminApi.delete(`/admin/magazines/${id}`);
    return response.data;
  },

  // Aktif/Pasif değiştir (Admin)
  toggleActive: async (id) => {
    const response = await adminApi.patch(`/admin/magazines/${id}/toggle`);
    return response.data;
  },
};

export default magazineService;
