import { adminApi } from './adminService';

const notificationTemplateService = {
  /**
   * Tüm template'leri getir
   */
  getAllTemplates: async () => {
    const response = await adminApi.get('/admin/notification-templates');
    return response.data;
  },

  /**
   * Tek template getir
   */
  getTemplate: async (name) => {
    const response = await adminApi.get(`/admin/notification-templates/${name}`);
    return response.data;
  },

  /**
   * Template güncelle
   */
  updateTemplate: async (name, { title, message }) => {
    const response = await adminApi.put(`/admin/notification-templates/${name}`, {
      title,
      message,
    });
    return response.data;
  },

  /**
   * Template preview
   */
  previewTemplate: async (name, { title, message }) => {
    const response = await adminApi.post(`/admin/notification-templates/${name}/preview`, {
      title,
      message,
    });
    return response.data;
  },

  /**
   * Template'i reset et (varsayılan değerlere geri yükle)
   */
  resetTemplate: async (name) => {
    const response = await adminApi.post(`/admin/notification-templates/${name}/reset`);
    return response.data;
  },
};

export default notificationTemplateService;

