import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Admin token'ı al
const getAdminToken = () => localStorage.getItem('adminToken');

// Admin API instance
const adminApi = axios.create({
  baseURL: API_URL,
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
};

export default adminService;
