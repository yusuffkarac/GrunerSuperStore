import api from './api';
import { adminApi } from './adminService';

const settingsService = {
  // Ayarları getir
  getSettings: async () => {
    return await api.get('/settings');
  },

  // Ayarları güncelle (admin only)
  updateSettings: async (data) => {
    const response = await adminApi.put('/admin/settings', data);
    return response.data;
  },

  // Footer ayarlarını default'a sıfırla (admin only)
  resetFooterToDefaults: async () => {
    const response = await adminApi.post('/admin/settings/footer/reset-to-defaults');
    return response.data;
  },
};

export default settingsService;
