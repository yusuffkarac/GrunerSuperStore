import axios from 'axios';

// API base URL - dinamik olarak hostname'i kullan
// Development'ta: window.location.hostname kullan (PC'nin IP'si veya localhost)
// Production'da: environment variable veya sabit URL kullan
const getApiBaseUrl = () => {
  // Eğer environment variable varsa onu kullan
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development'ta dinamik olarak hostname'i kullan
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = '5001';
  
  // localhost ise localhost kullan, değilse hostname'i kullan (PC'nin IP'si)
  return `${protocol}//${hostname}:${port}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Axios instance oluştur
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    // 304 Not Modified yanıtlarını engellemek için istemci tarafı cache'i kapat
    'Cache-Control': 'no-store',
  },
});

// Request interceptor - token ekleme
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - error handling
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Token expired veya unauthorized
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Eğer zaten giriş/kayıt/email doğrulama sayfasındaysak redirect yapma (sonsuz döngüyü önle)
      const publicPaths = [
        '/giris',
        '/kayit',
        '/email-dogrula',
        '/sifremi-unuttum',
        '/sifre-sifirla',
        '/reset-password',
        '/admin/login'
      ];
      if (!publicPaths.includes(currentPath)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/giris';
      }
    }

    // Error mesajını standartlaştır
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'Bir hata oluştu';

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

export default api;
