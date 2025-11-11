import api from './api';

const notificationService = {
  // Bildirimleri listele
  getNotifications: async (params = {}) => {
    return await api.get('/notifications', { params });
  },

  // Okunmamış sayı
  getUnreadCount: async () => {
    return await api.get('/notifications/unread-count');
  },

  // Bildirimi okundu işaretle
  markAsRead: async (notificationId) => {
    return await api.put(`/notifications/${notificationId}/read`);
  },

  // Tümünü okundu işaretle
  markAllAsRead: async () => {
    return await api.put('/notifications/read-all');
  },

  // SSE stream bağlantısı (EventSource kullanılacak)
  // Bu fonksiyon doğrudan EventSource döndürür
  createEventSource: (token) => {
    // Development modunda Vite proxy kullan, production'da nginx proxy
    let baseURL;
    if (import.meta.env.VITE_API_URL) {
      baseURL = import.meta.env.VITE_API_URL;
    } else if (import.meta.env.DEV) {
      // Development'ta Vite proxy kullan (sadece /api)
      baseURL = '';
    } else {
      // Production'da nginx üzerinden git (port kullanma)
      baseURL = '';
    }
    // EventSource headers desteklemediği için token'ı query parameter olarak gönderiyoruz
    return new EventSource(`${baseURL}/api/notifications/stream?token=${encodeURIComponent(token)}`);
  },
};

export default notificationService;

