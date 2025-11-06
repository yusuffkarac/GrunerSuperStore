import axios from 'axios';

// API base URL
const API_BASE_URL =  'http://localhost:5001/api';

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
      // Eğer zaten giriş/kayıt sayfasındaysak redirect yapma (sonsuz döngüyü önle)
      if (currentPath !== '/giris' && currentPath !== '/kayit' && currentPath !== '/admin/login') {
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
