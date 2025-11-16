import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import notificationService from '../services/notificationService';
import useAuthStore from '../store/authStore';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const location = useLocation();
  const { isAuthenticated, token } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastNotificationIdRef = useRef(null);

  // Bildirimleri yükle
  const loadData = useCallback(async () => {
    // Token kontrolü - hem store'dan hem de localStorage'dan kontrol et
    // Admin token veya user token kabul edilir
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const adminTokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    const hasToken = tokenFromStorage || adminTokenFromStorage;
    
    // Admin panelinde isAuthenticated false olabilir, bu yüzden sadece token kontrolü yapıyoruz
    if (!hasToken) {
      return;
    }

      try {
        const [notificationsRes, unreadRes] = await Promise.all([
          notificationService.getNotifications({ limit: 20 }),
          notificationService.getUnreadCount(),
        ]);
      
      const newNotifications = notificationsRes.data.notifications || [];
      const newUnreadCount = unreadRes.data.count || 0;
      
      // Yeni bildirimler var mı kontrol et
      if (newNotifications.length > 0) {
        const latestNotificationId = newNotifications[0].id;
        
        // Eğer yeni bildirim varsa (son bildirim ID'si farklıysa)
        if (lastNotificationIdRef.current && lastNotificationIdRef.current !== latestNotificationId) {
          // Yeni bildirimleri ekle (zaten listede olmayanlar)
          setNotifications((prev) => {
            const existingIds = new Set(prev.map(n => n.id));
            const newOnes = newNotifications.filter(n => !existingIds.has(n.id));
            return [...newOnes, ...prev];
          });
        } else {
          // İlk yükleme veya aynı bildirimler
          setNotifications(newNotifications);
        }
        
        lastNotificationIdRef.current = latestNotificationId;
      } else {
        setNotifications([]);
        lastNotificationIdRef.current = null;
      }
      
      setUnreadCount(newUnreadCount);
    } catch (error) {
      // Silent authentication errors should not be logged
      if (error.silent) {
        return;
      }
      console.error('Bildirimler yüklenemedi:', error);
    }
  }, []);

    // SSE bağlantısı kur
  const setupSSE = useCallback(() => {
    // Token kontrolü - hem store'dan hem de localStorage'dan kontrol et
    // Admin token veya user token kabul edilir
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const adminTokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    const hasToken = tokenFromStorage || adminTokenFromStorage;
    
    // Admin panelinde isAuthenticated false olabilir, bu yüzden sadece token kontrolü yapıyoruz
    if (!hasToken) {
      return;
    }

    // Mevcut bağlantıyı kapat
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // SSE bağlantısı kur - önce user token, yoksa admin token kullan
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const adminTokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      const tokenToUse = tokenFromStorage || adminTokenFromStorage;
      
      if (!tokenToUse) {
        return;
      }
      const eventSource = notificationService.createEventSource(tokenToUse);
    eventSourceRef.current = eventSource;

    // Yeni bildirim geldiğinde
    eventSource.onmessage = (event) => {
      try {
          // Heartbeat mesajlarını yok say
          if (event.data.trim() === '' || event.data.startsWith(':')) {
            return;
          }

        const data = JSON.parse(event.data);

        if (data.type === 'notification') {
            // Yeni bildirimi ekle (zaten listede yoksa)
            setNotifications((prev) => {
              const exists = prev.some(n => n.id === data.data.id);
              if (exists) return prev;
              return [data.data, ...prev];
            });
          // Okunmamış sayıyı artır
          setUnreadCount((prev) => prev + 1);
            lastNotificationIdRef.current = data.data.id;
        } else if (data.type === 'unread_count') {
          // Okunmamış sayıyı güncelle
          setUnreadCount(data.data.count);
        }
      } catch (error) {
        console.error('SSE mesaj parse hatası:', error);
      }
    };

    // Hata durumunda
      eventSource.onerror = () => {
      // Bağlantıyı kapat
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
      eventSourceRef.current = null;
        }
      
        // Yeniden bağlanmayı dene (5 saniye sonra)
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const adminTokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      const hasToken = tokenFromStorage || adminTokenFromStorage;
      
      if (hasToken) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
          const tokenCheck = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          const adminTokenCheck = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
          const hasTokenCheck = tokenCheck || adminTokenCheck;
          
          if (hasTokenCheck && !eventSourceRef.current) {
              setupSSE();
          }
        }, 5000);
      }
    };
    } catch (error) {
      console.error('SSE bağlantısı kurulamadı:', error);
    }
  }, []);

  // Polling mekanizması (SSE yedek olarak)
  const setupPolling = useCallback(() => {
    // Token kontrolü - hem store'dan hem de localStorage'dan kontrol et
    // Admin token veya user token kabul edilir
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const adminTokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    const hasToken = tokenFromStorage || adminTokenFromStorage;
    
    // Admin panelinde isAuthenticated false olabilir, bu yüzden sadece token kontrolü yapıyoruz
    if (!hasToken) {
      return;
    }

    // Mevcut polling'i temizle
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Her 10 saniyede bir bildirimleri kontrol et
    pollingIntervalRef.current = setInterval(() => {
      loadData();
    }, 10000);
  }, [loadData]);

  // Ana effect - SSE ve polling kurulumu
  useEffect(() => {
    // Token kontrolü - hem store'dan hem de localStorage'dan kontrol et
    // Admin token veya user token kabul edilir
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const adminTokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    const hasToken = tokenFromStorage || adminTokenFromStorage;
    
    // Admin panelinde isAuthenticated false olabilir, bu yüzden sadece token kontrolü yapıyoruz
    if (!hasToken) {
      // Bağlantıları kapat
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // State'i temizle
      setNotifications([]);
      setUnreadCount(0);
      lastNotificationIdRef.current = null;
      return;
    }

    // İlk yükleme
    setLoading(true);
    loadData().finally(() => {
      setLoading(false);
    });

    // SSE bağlantısı kur
    setupSSE();

    // Polling mekanizması kur (yedek olarak)
    setupPolling();

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [location.pathname, loadData, setupSSE, setupPolling]);

  // Bildirimi okundu işaretle
  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Local state'i güncelle
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        )
      );
      // Okunmamış sayıyı azalt
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      // Silent authentication errors should not be logged
      if (error.silent) {
        return;
      }
      console.error('Bildirim okundu işaretlenemedi:', error);
      throw error;
    }
  };

  // Tümünü okundu işaretle
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Local state'i güncelle
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      // Okunmamış sayıyı sıfırla
      setUnreadCount(0);
    } catch (error) {
      // Silent authentication errors should not be logged
      if (error.silent) {
        return;
      }
      console.error('Tüm bildirimler okundu işaretlenemedi:', error);
      throw error;
    }
  };

  // Bildirimleri yeniden yükle
  const refreshNotifications = async () => {
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const adminTokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    const hasToken = tokenFromStorage || adminTokenFromStorage;
    
    // Admin panelinde isAuthenticated false olabilir, bu yüzden sadece token kontrolü yapıyoruz
    if (!hasToken) return;
    
    try {
      setLoading(true);
      await loadData();
    } catch (error) {
      // Silent authentication errors should not be logged
      if (error.silent) {
        return;
      }
      console.error('Bildirimler yeniden yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

