import { adminApi } from './adminService.js';

const barcodeLabelService = {
  // ===============================
  // ADMIN METHODS
  // ===============================

  // Tüm barkod etiketlerini listele
  getAllBarcodeLabels: async (params = {}) => {
    const response = await adminApi.get('/admin/barcode-labels', { params });
    return response.data;
  },

  // Tek barkod etiketi getir
  getBarcodeLabelById: async (id) => {
    const response = await adminApi.get(`/admin/barcode-labels/${id}`);
    return response.data;
  },

  // Birden fazla barkod etiketi getir (toplu yazdırma için)
  getBarcodeLabelsByIds: async (ids) => {
    const response = await adminApi.post('/admin/barcode-labels/by-ids', { ids });
    return response.data;
  },

  // Barkod etiketi oluştur
  createBarcodeLabel: async (labelData) => {
    const response = await adminApi.post('/admin/barcode-labels', labelData);
    return response.data;
  },

  // Barkod etiketi güncelle
  updateBarcodeLabel: async (id, labelData) => {
    const response = await adminApi.put(`/admin/barcode-labels/${id}`, labelData);
    return response.data;
  },

  // Barkod etiketi sil
  deleteBarcodeLabel: async (id) => {
    const response = await adminApi.delete(`/admin/barcode-labels/${id}`);
    return response.data;
  },

  // Toplu barkod etiketi sil
  bulkDeleteBarcodeLabels: async (ids) => {
    const response = await adminApi.post('/admin/barcode-labels/bulk-delete', { ids });
    return response.data;
  },
};

export default barcodeLabelService;
