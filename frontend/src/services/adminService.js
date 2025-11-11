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

// Response interceptor - 401 ve 403 hatası için
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
    
    // 403 Forbidden - İzin yok
    if (error.response?.status === 403) {
      // Backend'den gelen mesaj varsa onu kullan, yoksa varsayılan mesaj
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message ||
                          'Sie haben keine Berechtigung für diese Aktion';
      
      return Promise.reject({
        ...error,
        message: errorMessage,
        response: {
          ...error.response,
          data: {
            ...error.response?.data,
            message: errorMessage,
          },
        },
      });
    }
    
    return Promise.reject(error);
  }
);

// AdminApi'yi export et (settingsService için)
export { adminApi };

const adminService = {
  // Admin bilgilerini getir
  getMe: async () => {
    const response = await adminApi.get('/admin/auth/me');
    return response.data;
  },

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

  // Dashboard trend verileri
  getDashboardTrends: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/trends', { params });
    return response.data;
  },

  // En çok satan ürünler
  getTopSellingProducts: async (limit = 10, startDate, endDate) => {
    const params = { limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/top-products', { params });
    return response.data;
  },

  // Kategori istatistikleri
  getCategoryStats: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/category-stats', { params });
    return response.data;
  },

  // Sipariş durumu dağılımı
  getOrderStatusDistribution: async () => {
    const response = await adminApi.get('/admin/dashboard/order-status-distribution');
    return response.data;
  },

  // Gelir istatistikleri
  getRevenueStats: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/revenue-stats', { params });
    return response.data;
  },

  // Günlük sipariş sayıları
  getDailyOrderCounts: async (days = 7) => {
    const response = await adminApi.get('/admin/dashboard/daily-order-counts', { params: { days } });
    return response.data;
  },

  // Saatlik sipariş dağılımı
  getHourlyOrderDistribution: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/hourly-distribution', { params });
    return response.data;
  },

  // Müşteri büyümesi trendi
  getCustomerGrowthTrend: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/customer-growth', { params });
    return response.data;
  },

  // İptal oranı trendi
  getCancellationRateTrend: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/cancellation-rate', { params });
    return response.data;
  },

  // En aktif müşteriler
  getTopCustomers: async (limit = 10, startDate, endDate) => {
    const params = { limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/top-customers', { params });
    return response.data;
  },

  // Sipariş tamamlama süresi
  getOrderCompletionTime: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/order-completion-time', { params });
    return response.data;
  },

  // Aylık karşılaştırma
  getMonthlyComparison: async () => {
    const response = await adminApi.get('/admin/dashboard/monthly-comparison');
    return response.data;
  },

  // Ortalama sepet değeri trendi
  getAverageCartValueTrend: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await adminApi.get('/admin/dashboard/average-cart-value', { params });
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

  cancelOrder: async (id, cancellationData) => {
    const response = await adminApi.put(`/admin/orders/${id}/cancel`, cancellationData);
    return response.data;
  },

  getOrderReview: async (orderId) => {
    const response = await adminApi.get(`/admin/orders/${orderId}/review`);
    return response.data;
  },

  getOrderById: async (orderId) => {
    const response = await adminApi.get(`/admin/orders/${orderId}`);
    return response.data;
  },

  sendInvoice: async (orderId) => {
    const response = await adminApi.post(`/admin/orders/${orderId}/send-invoice`);
    return response.data;
  },

  getDeliverySlipPDF: async (orderId) => {
    try {
      const response = await adminApi.get(`/admin/orders/${orderId}/delivery-slip`, {
        responseType: 'blob',
      });
      
      // Blob URL oluştur
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Yeni pencerede PDF'i aç
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        // PDF yüklendikten sonra print dialog'unu aç
        const tryPrint = () => {
          try {
            if (printWindow && !printWindow.closed) {
              printWindow.focus();
              printWindow.print();
            }
          } catch (error) {
            console.log('Print dialog açılamadı, kullanıcı manuel olarak yazdırabilir');
          }
        };
        
        // onload event'i bazı tarayıcılarda çalışmayabilir, bu yüzden timeout kullanıyoruz
        printWindow.onload = () => {
          setTimeout(tryPrint, 800);
        };
        
        // Alternatif: onload çalışmazsa timeout ile dene
        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            tryPrint();
          }
        }, 1500);
        
        // URL'i temizle (çok geç, kullanıcı print dialog'unu kapatana kadar beklemek için)
        // Not: URL'i revoke etmek pencerenin kapanmasına neden olabilir, bu yüzden çok geç yapıyoruz
        setTimeout(() => {
          // Sadece pencere kapalıysa URL'i temizle
          if (printWindow.closed) {
            window.URL.revokeObjectURL(url);
          } else {
            // Pencere hala açıksa, daha sonra tekrar dene
            const checkInterval = setInterval(() => {
              if (printWindow.closed) {
                window.URL.revokeObjectURL(url);
                clearInterval(checkInterval);
              }
            }, 1000);
            
            // 30 saniye sonra zorla temizle
            setTimeout(() => {
              clearInterval(checkInterval);
              window.URL.revokeObjectURL(url);
            }, 30000);
          }
        }, 10000);
      } else {
        // Popup blocker varsa, iframe kullan
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.print();
            } catch (error) {
              console.log('Print dialog açılamadı');
            }
            // Iframe'i temizle (print dialog açıldıktan sonra)
            setTimeout(() => {
              document.body.removeChild(iframe);
              window.URL.revokeObjectURL(url);
            }, 10000);
          }, 800);
        };
      }
    } catch (error) {
      console.error('Lieferschein PDF hatası:', error);
      throw error;
    }
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

  // Toplu fiyat güncelleme
  bulkUpdatePrices: async (data) => {
    const response = await adminApi.post('/admin/products/bulk-update-prices', data);
    return response.data;
  },

  // Toplu fiyat güncellemelerini getir
  getBulkPriceUpdates: async (params) => {
    const response = await adminApi.get('/admin/bulk-price-updates', { params });
    return response.data;
  },

  // Toplu fiyat güncellemesini geri al
  revertBulkPriceUpdate: async (id) => {
    const response = await adminApi.post(`/admin/bulk-price-updates/${id}/revert`);
    return response.data;
  },

  // Toplu fiyat güncellemesinin bitiş tarihini güncelle
  updateBulkPriceUpdateEndDate: async (id, temporaryPriceEndDate) => {
    const response = await adminApi.put(`/admin/bulk-price-updates/${id}/end-date`, {
      temporaryPriceEndDate,
    });
    return response.data;
  },

  // Eksik bilgisi olan ürünleri getir
  getProductsWithMissingData: async (missingType, filters = {}) => {
    const params = new URLSearchParams();
    params.append('missingType', missingType);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);

    const response = await adminApi.get(`/admin/products/missing-data?${params.toString()}`);
    return response.data;
  },

  // Ürünü görev tipinden muaf tut
  ignoreProductTask: async (productId, category) => {
    const response = await adminApi.post(`/admin/products/${productId}/ignore-task`, { category });
    return response.data;
  },

  // Ürünün muafiyetini kaldır
  unignoreProductTask: async (productId, category) => {
    const response = await adminApi.delete(`/admin/products/${productId}/ignore-task/${category}`);
    return response.data;
  },

  // Gözardı edilen ürünleri getir
  getIgnoredProducts: async (taskType, filters = {}) => {
    const params = new URLSearchParams();
    if (taskType) params.append('taskType', taskType);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);

    const response = await adminApi.get(`/admin/products/ignored?${params.toString()}`);
    return response.data;
  },

  // ===============================
  // STOCK MANAGEMENT
  // ===============================

  // Kritik stoklu ürünleri getir
  getLowStockProducts: async () => {
    const response = await adminApi.get('/admin/stock/low-stock');
    return response.data;
  },

  // Sipariş geçmişini getir
  getStockOrderHistory: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.productId) queryParams.append('productId', params.productId);
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    if (params.date) queryParams.append('date', params.date);

    const response = await adminApi.get(`/admin/stock/history?${queryParams.toString()}`);
    return response.data;
  },

  // Yeni sipariş oluştur
  createStockOrder: async (productId, data) => {
    const response = await adminApi.post(`/admin/stock/order/${productId}`, data);
    return response.data;
  },

  // Sipariş durumunu güncelle
  updateStockOrderStatus: async (orderId, data) => {
    const response = await adminApi.put(`/admin/stock/order/${orderId}/status`, data);
    return response.data;
  },

  // Siparişi geri al
  undoStockOrder: async (orderId) => {
    const response = await adminApi.post(`/admin/stock/order/${orderId}/undo`);
    return response.data;
  },

  // Ürün tedarikçisini güncelle
  updateProductSupplier: async (productId, supplier) => {
    const response = await adminApi.put(`/admin/stock/product/${productId}/supplier`, { supplier });
    return response.data;
  },
};

export default adminService;
