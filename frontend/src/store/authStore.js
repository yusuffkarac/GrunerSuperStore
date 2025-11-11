import { create } from 'zustand';
import authService from '../services/authService';
import userService from '../services/userService';

// Auth store
const useAuthStore = create((set, get) => ({
  user: authService.getCurrentUser(),
  token: localStorage.getItem('token'),
  isAuthenticated: authService.isAuthenticated(),
  loading: false,
  error: null,

  // Kayıt
  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.register(userData);
      set({
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
        loading: false,
      });
      return response;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Giriş
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.login({ email, password });
      set({
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
        loading: false,
      });
      return response;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Çıkış
  logout: () => {
    authService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // Profil güncelle
  updateProfile: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.updateProfile(userData);
      set({
        user: response.data.user,
        loading: false,
      });
      // LocalStorage'ı güncelle
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Profil bilgilerini yeniden yükle
  refreshProfile: async () => {
    try {
      // Token kontrolü - token yoksa refresh yapma
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Token bulunamadı, profil yenileme atlandı');
        return;
      }

      const response = await userService.getProfile();
      // API interceptor response.data döndürüyor, yani { success: true, data: { user: {...} } }
      // Bu yüzden response.data.user kullanmalıyız
      if (response?.data?.user) {
        set({ user: response.data.user });
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else if (response?.user) {
        // Alternatif format kontrolü
        set({ user: response.user });
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (error) {
      // API interceptor zaten logout yapıyor, burada sadece log at
      console.error('Profil yenileme hatası:', error);
      // Logout yapma - API interceptor zaten yapıyor
    }
  },

  // Kullanıcı bilgilerini güncelle
  setUser: (user) => {
    set({ user });
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Error'u temizle
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
