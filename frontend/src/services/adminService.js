import axios from 'axios';

// API URL - Development'ta Vite proxy kullan, production'da environment variable veya tam URL
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  // Development modunda Vite proxy kullan
  if (import.meta.env.DEV) {
    return '/api';
  }
  // Production'da tam URL kullan
  return 'http://localhost:5001/api';
};

const API_URL = getApiUrl();

// Admin token'ı al
const getAdminToken = () => localStorage.getItem('adminToken');

// Admin API instance
const adminApi = axios.create({
  baseURL: API_URL,
  withCredentials: true, // CORS credentials için gerekli
});

// Request interceptor - token ekle
adminApi.interceptors.request.use(
  (config) => {
    const token = getAdminToken();
  
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Token yoksa login sayfasına yönlendir
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - 401 hatası için
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin');
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// AdminApi'yi export et (settingsService için)
export { adminApi };

const adminService = {
  // Dashboard istatistikleri
  getDashboardStats: async () => {
    const response = await adminApi.get('/admin/dashboard/stats');
    return response.data;
  },

  // Düşük stoklu ürünler
  getLowStockProducts: async (limit = 20) => {
    const response = await adminApi.get('/admin/dashboard/low-stock', { params: { limit } });
    return response.data;
  },

  // Ürün yönetimi
  getProducts: async (params) => {
    const response = await adminApi.get('/admin/products', { params });
    return response.data;
  },

  createProduct: async (data) => {
    const response = await adminApi.post('/admin/products', data);
    return response.data;
  },

  updateProduct: async (id, data) => {
    const response = await adminApi.put(`/admin/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await adminApi.delete(`/admin/products/${id}`);
    return response.data;
  },

  // Kategori yönetimi
  getCategories: async () => {
    const response = await adminApi.get('/admin/categories');
    return response.data;
  },

  createCategory: async (data) => {
    const response = await adminApi.post('/admin/categories', data);
    return response.data;
  },

  updateCategory: async (id, data) => {
    const response = await adminApi.put(`/admin/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await adminApi.delete(`/admin/categories/${id}`);
    return response.data;
  },

  // Sipariş yönetimi
  getOrders: async (params) => {
    const response = await adminApi.get('/admin/orders', { params });
    return response.data;
  },

  updateOrderStatus: async (id, status) => {
    const response = await adminApi.put(`/admin/orders/${id}/status`, { status });
    return response.data;
  },

  // Kullanıcı yönetimi
  getUsers: async (params) => {
    const response = await adminApi.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (id) => {
    const response = await adminApi.get(`/admin/users/${id}`);
    return response.data;
  },

  toggleUserStatus: async (id) => {
    const response = await adminApi.put(`/admin/users/${id}/status`);
    return response.data;
  },

  createUser: async (data) => {
    const response = await adminApi.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await adminApi.put(`/admin/users/${id}`, data);
    return response.data;
  },

  // Dosya yükleme
  uploadFile: async (file, folder = 'products') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    // Query string olarak da ekle (multer body'yi henüz parse etmemiş olabilir)
    const response = await adminApi.post(`/admin/upload?folder=${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadMultipleFiles: async (files, folder = 'products') => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('folder', folder);

    // Query string olarak da ekle (multer body'yi henüz parse etmemiş olabilir)
    const response = await adminApi.post(`/admin/upload/multiple?folder=${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Varyant yönetimi
  getAllVariantOptionNames: async () => {
    const response = await adminApi.get('/admin/variant-options/all');
    return response.data;
  },

  getVariantOptionValues: async (optionName) => {
    const response = await adminApi.get(`/admin/variant-options/${encodeURIComponent(optionName)}/values`);
    return response.data;
  },

  getVariantOptions: async (productId) => {
    const response = await adminApi.get(`/admin/products/${productId}/variant-options`);
    return response.data;
  },

  createVariantOption: async (productId, data) => {
    const response = await adminApi.post(`/admin/products/${productId}/variant-options`, data);
    return response.data;
  },

  updateVariantOption: async (optionId, data) => {
    const response = await adminApi.put(`/admin/variant-options/${optionId}`, data);
    return response.data;
  },

  deleteVariantOption: async (optionId) => {
    const response = await adminApi.delete(`/admin/variant-options/${optionId}`);
    return response.data;
  },

  getProductVariants: async (productId) => {
    const response = await adminApi.get(`/admin/products/${productId}/variants`);
    return response.data;
  },

  createVariant: async (productId, data) => {
    const response = await adminApi.post(`/admin/products/${productId}/variants`, data);
    return response.data;
  },

  updateVariant: async (variantId, data) => {
    const response = await adminApi.put(`/admin/variants/${variantId}`, data);
    return response.data;
  },

  deleteVariant: async (variantId) => {
    const response = await adminApi.delete(`/admin/variants/${variantId}`);
    return response.data;
  },

  createVariantsBulk: async (productId, data) => {
    const response = await adminApi.post(`/admin/products/${productId}/variants/bulk`, data);
    return response.data;
  },

  // Admin yönetimi
  getAdmins: async (params) => {
    const response = await adminApi.get('/admin/admins', { params });
    return response.data;
  },

  getAdminById: async (id) => {
    const response = await adminApi.get(`/admin/admins/${id}`);
    return response.data;
  },

  createAdmin: async (data) => {
    const response = await adminApi.post('/admin/admins', data);
    return response.data;
  },

  updateAdmin: async (id, data) => {
    const response = await adminApi.put(`/admin/admins/${id}`, data);
    return response.data;
  },

  deleteAdmin: async (id) => {
    const response = await adminApi.delete(`/admin/admins/${id}`);
    return response.data;
  },

  // Bildirim yönetimi
  createNotification: async (data) => {
    const response = await adminApi.post('/admin/notifications', data);
    return response.data;
  },

  getAllNotifications: async (params) => {
    const response = await adminApi.get('/admin/notifications', { params });
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await adminApi.delete(`/admin/notifications/${id}`);
    return response.data;
  },
};

export default adminService;
