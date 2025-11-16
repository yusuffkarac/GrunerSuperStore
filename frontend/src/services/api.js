import axios from 'axios';

// API base URL - dinamik olarak hostname'i kullan
// Development'ta: Vite proxy kullan (sadece /api)
// Production'da: environment variable veya tam URL kullan
const getApiBaseUrl = () => {
  // Eğer environment variable varsa onu kullan
  if (import.meta.env.VITE_API_URL) {
    // Eğer /api ile bitmiyorsa ekle
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // Development modunda Vite proxy kullan (sadece /api)
  // Vite proxy'si /api isteklerini otomatik olarak backend'e yönlendirir
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // Production'da nginx üzerinden git (port kullanma, nginx proxy kullan)
  // Nginx /api isteklerini backend'e yönlendirir
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Axios instance oluştur
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // CORS credentials için gerekli
  headers: {
    'Content-Type': 'application/json',
    // 304 Not Modified yanıtlarını engellemek için istemci tarafı cache'i kapat
    'Cache-Control': 'no-store',
  },
});

// Request interceptor - token ekleme
api.interceptors.request.use(
  (config) => {
    // Önce user token, yoksa admin token kullan
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
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
    // 403 Forbidden - İzin yok
    if (error.response?.status === 403) {
      return Promise.reject({
        message: 'Sie haben keine Berechtigung für diese Aktion',
        status: 403,
        data: error.response?.data,
      });
    }

    // Token expired veya unauthorized
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Eğer zaten giriş/kayıt/email doğrulama sayfasındaysak redirect yapma (sonsuz döngüyü önle)
      const publicPaths = [
        '/anmelden',
        '/registrieren',
        '/email-verifizieren',
        '/passwort-vergessen',
        '/passwort-zuruecksetzen',
        '/reset-password',
        '/giris',
        '/kayit',
        '/email-dogrula',
        '/sifremi-unuttum',
        '/sifre-sifirla',
        '/admin/login'
      ];
      
      // Public path'te değilsek ve token yoksa, sessizce redirect et (hata gösterme)
      if (!publicPaths.includes(currentPath)) {
        const token = localStorage.getItem('token');
        if (!token) {
          // Token yoksa, bu beklenen bir durum - sessizce redirect et
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/anmelden';
          // Promise'i reject etme, sessizce işle
          return Promise.reject({
            message: 'Authentication required',
            status: 401,
            silent: true, // Component'lere bu hatanın sessizce handle edildiğini belirt
          });
        } else {
          // Token varsa ama geçersizse, normal hata handling
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/anmelden';
        }
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
