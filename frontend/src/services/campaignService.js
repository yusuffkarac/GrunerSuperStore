import { adminApi } from './adminService.js';
import axios from 'axios';

// API URL - Development'ta Vite proxy kullan, production'da environment variable veya nginx proxy
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  // Development modunda Vite proxy kullan
  if (import.meta.env.DEV) {
    return '/api';
  }
  // Production'da nginx üzerinden git (port kullanma, nginx proxy kullan)
  return '/api';
};

const API_URL = getApiUrl();

// Public API instance (auth gerektirmeyen)
const publicApi = axios.create({
  baseURL: API_URL,
  withCredentials: true, // CORS credentials için gerekli
});

const campaignService = {
  // ===============================
  // PUBLIC METHODS (Müşteri)
  // ===============================

  // Aktif kampanyaları getir
  getActiveCampaigns: async () => {
    const response = await publicApi.get('/campaigns/active');
    return response.data;
  },

  // ID ile kampanya getir
  getCampaignById: async (id) => {
    const response = await publicApi.get(`/campaigns/${id}`);
    return response.data;
  },

  // Slug ile kampanya getir
  getCampaignBySlug: async (slug) => {
    const response = await publicApi.get(`/campaigns/slug/${slug}`);
    return response.data;
  },

  // Belirli ürün/kategori için geçerli kampanyaları getir
  getApplicableCampaigns: async ({ productId, categoryId, cartTotal }) => {
    const response = await publicApi.post('/campaigns/applicable', {
      productId,
      categoryId,
      cartTotal,
    });
    return response.data;
  },

  // ===============================
  // ADMIN METHODS
  // ===============================

  // Tüm kampanyaları listele
  getAllCampaigns: async (params = {}) => {
    const response = await adminApi.get('/admin/campaigns', { params });
    return response.data;
  },

  // Kampanya oluştur
  createCampaign: async (campaignData) => {
    const response = await adminApi.post('/admin/campaigns', campaignData);
    return response.data;
  },

  // Kampanya güncelle
  updateCampaign: async (id, campaignData) => {
    const response = await adminApi.put(`/admin/campaigns/${id}`, campaignData);
    return response.data;
  },

  // Kampanya sil
  deleteCampaign: async (id) => {
    const response = await adminApi.delete(`/admin/campaigns/${id}`);
    return response.data;
  },

  // Admin - tek kampanya getir
  getAdminCampaignById: async (id) => {
    const response = await adminApi.get(`/admin/campaigns/${id}`);
    return response.data;
  },
};

export default campaignService;
