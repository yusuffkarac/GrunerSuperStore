import { adminApi } from './adminService';

const expiryService = {
  getDashboard: async (options = {}) => {
    const params = {};
    if (options.previewDate) {
      params.previewDate = options.previewDate;
    }
    const response = await adminApi.get('/admin/expiry/dashboard', {
      ...(Object.keys(params).length ? { params } : {}),
    });
    return response.data;
  },

  updateSettings: async (payload) => {
    const response = await adminApi.put('/admin/expiry/settings', payload);
    return response.data;
  },

  labelProduct: async (productId, payload = {}) => {
    const response = await adminApi.post(`/admin/expiry/label/${productId}`, payload);
    return response.data;
  },

  processRemoval: async (productId, payload = {}) => {
    const response = await adminApi.post(`/admin/expiry/remove/${productId}`, payload);
    return response.data;
  },

  updateExpiryDate: async (productId, payload) => {
    const response = await adminApi.put(`/admin/expiry/update-date/${productId}`, payload);
    return response.data;
  },
};

export default expiryService;

