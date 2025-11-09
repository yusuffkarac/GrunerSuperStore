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

  // Admin sayfalarında bildirim sistemi çalışmasın
  const isAdminPage = location.pathname.startsWith('/admin');
  
  // Admin token kontrolü - admin sayfalarında kullanıcı token'ı olmamalı
  const hasAdminToken = typeof window !== 'undefined' && !!localStorage.getItem('adminToken');

  // Bildirimleri yükle
  const loadData = useCallback(async () => {
    if (isAdminPage || hasAdminToken || !isAuthenticated || !token) {
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
      console.error('Bildirimler yüklenemedi:', error);
    }
  }, [isAdminPage, hasAdminToken, isAuthenticated, token]);

  // SSE bağlantısı kur
  const setupSSE = useCallback(() => {
    if (isAdminPage || hasAdminToken || !isAuthenticated || !token) {
      return;
    }

    // Mevcut bağlantıyı kapat
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // SSE bağlantısı kur
      const eventSource = notificationService.createEventSource(token);
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
        if (!isAdminPage && !hasAdminToken && isAuthenticated && token) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isAdminPage && !hasAdminToken && isAuthenticated && token && !eventSourceRef.current) {
              setupSSE();
            }
          }, 5000);
        }
      };
    } catch (error) {
      console.error('SSE bağlantısı kurulamadı:', error);
    }
  }, [isAdminPage, hasAdminToken, isAuthenticated, token]);

  // Polling mekanizması (SSE yedek olarak)
  const setupPolling = useCallback(() => {
    if (isAdminPage || hasAdminToken || !isAuthenticated || !token) {
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
  }, [isAdminPage, hasAdminToken, isAuthenticated, token, loadData]);

  // Ana effect - SSE ve polling kurulumu
  useEffect(() => {
    // Admin sayfalarında, admin token varsa veya authenticated değilse çalışma
    if (isAdminPage || hasAdminToken || !isAuthenticated || !token) {
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
  }, [isAuthenticated, token, location.pathname, isAdminPage, hasAdminToken, loadData, setupSSE, setupPolling]);

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
      console.error('Tüm bildirimler okundu işaretlenemedi:', error);
      throw error;
    }
  };

  // Bildirimleri yeniden yükle
  const refreshNotifications = async () => {
    if (isAdminPage || hasAdminToken || !isAuthenticated) return;
    
    try {
      setLoading(true);
      await loadData();
    } catch (error) {
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

