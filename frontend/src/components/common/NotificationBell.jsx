import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBell, FiCheck, FiX } from 'react-icons/fi';
import { useNotification } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

function NotificationBell({ alignLeft = false }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const prevUnreadCount = useRef(unreadCount);
  const [bellAnimationKey, setBellAnimationKey] = useState(0);

  // Yeni bildirim geldiğinde zil animasyonu
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      setBellAnimationKey(prev => prev + 1);
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  // Dışarı tıklandığında dropdown'u kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Bildirime tıklandığında
  const handleNotificationClick = async (notification) => {
    // Okundu işaretle
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Bildirim okundu işaretlenemedi:', error);
      }
    }

    // Dropdown'u kapat
    setIsOpen(false);

    // Action URL'e git (varsa)
    if (notification.actionUrl) {
      // Eğer sipariş bildirimi ise (metadata'da orderId varsa veya actionUrl sipariş detayı ise)
      // Orders sayfasına yönlendir ve highlight parametresi ekle
      if (notification.metadata?.orderId) {
        navigate(`/admin/orders?highlight=${notification.metadata.orderId}`);
      } else if (notification.actionUrl.includes('/admin/orders/')) {
        // Eski format: /admin/orders/{id} -> /admin/orders?highlight={id}
        const orderId = notification.actionUrl.split('/admin/orders/')[1];
        if (orderId) {
          navigate(`/admin/orders?highlight=${orderId}`);
        } else {
          navigate(notification.actionUrl);
        }
      } else {
        navigate(notification.actionUrl);
      }
    }
  };

  // Tümünü okundu işaretle
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Tüm bildirimler okundu işaretlenemedi:', error);
    }
  };

  // Bildirim tipine göre renk
  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Bildirim tipine göre ikon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bildirim İkonu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 md:p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Benachrichtigungen"
      >
        <motion.div
          key={bellAnimationKey}
          animate={bellAnimationKey > 0 ? {
            rotate: [0, -15, 15, -15, 15, 0],
            scale: [1, 1.15, 1],
          } : { scale: 1, rotate: 0 }}
          transition={{
            duration: 0.6,
            ease: 'easeOut',
          }}
        >
          <FiBell className="w-5 h-5 md:w-6 md:h-6" />
        </motion.div>
        {unreadCount > 0 && (
          <motion.span 
            className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
            key={`badge-${bellAnimationKey}`}
            initial={false}
            animate={bellAnimationKey > 0 ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute ${alignLeft ? 'left-0' : 'right-0'} top-full mt-2 w-[calc(100vw-3rem)] max-w-72 md:max-w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col`}>
          {/* Header */}
          <div className="p-3 md:p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm md:text-base">Benachrichtigungen</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs md:text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Alle als gelesen markieren
              </button>
            )}
          </div>

          {/* Bildirim Listesi */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FiBell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Keine Benachrichtigungen</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 md:gap-3">
                      {/* Tip İkonu */}
                      <div
                        className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-bold border ${getTypeColor(
                          notification.type
                        )}`}
                      >
                        {getTypeIcon(notification.type)}
                      </div>

                      {/* İçerik */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <span className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {/*{notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/bildirimler');
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Alle anzeigen
              </button>
            </div>
          )} */}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

