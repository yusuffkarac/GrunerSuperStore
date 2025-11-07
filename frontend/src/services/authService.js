import api from './api';

const authService = {
  // Kayıt
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },

  // Giriş
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },

  // Çıkış
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Profil bilgilerini getir
  getProfile: async () => {
    return await api.get('/auth/profile');
  },

  // Profil güncelle
  updateProfile: async (userData) => {
    return await api.put('/auth/profile', userData);
  },

  // Token'ı kontrol et
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Kullanıcı bilgilerini getir
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Admin giriş
  adminLogin: async (credentials) => {
    const response = await api.post('/admin/auth/login', credentials);
    return response;
  },

  // Email doğrulama
  verifyEmail: async ({ email, code }) => {
    const response = await api.post('/auth/verify-email', { email, code });
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },

  // Doğrulama kodunu yeniden gönder
  resendVerification: async (email) => {
    return await api.post('/auth/resend-verification', { email });
  },
};

export default authService;
