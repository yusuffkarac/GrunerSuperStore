import { adminApi } from './adminService';

const templateService = {
  /**
   * Tüm template'leri getir
   */
  getAllTemplates: async () => {
    const response = await adminApi.get('/admin/templates');
    return response.data;
  },

  /**
   * Tek template getir
   */
  getTemplate: async (name) => {
    const response = await adminApi.get(`/admin/templates/${name}`);
    return response.data;
  },

  /**
   * Template güncelle
   */
  updateTemplate: async (name, { subject, body }) => {
    const response = await adminApi.put(`/admin/templates/${name}`, {
      subject,
      body,
    });
    return response.data;
  },

  /**
   * Template preview
   */
  previewTemplate: async (name, { subject, body }) => {
    const response = await adminApi.post(`/admin/templates/${name}/preview`, {
      subject,
      body,
    });
    return response.data;
  },

  /**
   * Template'i reset et (dosyadan geri yükle)
   */
  resetTemplate: async (name) => {
    const response = await adminApi.post(`/admin/templates/${name}/reset`);
    return response.data;
  },

  /**
   * Test maili gönder
   */
  sendTestEmail: async (name, { subject, body, toEmail }) => {
    const response = await adminApi.post(`/admin/templates/${name}/test`, {
      subject,
      body,
      toEmail,
    });
    return response.data;
  },
};

export default templateService;

