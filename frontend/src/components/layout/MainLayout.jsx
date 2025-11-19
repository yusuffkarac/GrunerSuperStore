import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { FiClock } from 'react-icons/fi';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import useAuthStore from '../../store/authStore';
import useFavoriteStore from '../../store/favoriteStore';
import settingsService from '../../services/settingsService';

const ORDER_POPUP_STORAGE_KEY = 'orderHoursPopupShownDate';

const parseTimeToMinutes = (timeString) => {
  if (!timeString || typeof timeString !== 'string') {
    return null;
  }

  const [hours, minutes] = timeString.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const buildOrderHoursInfo = (deliverySettings = {}) => {
  const startTime = deliverySettings.siparisBaslangicSaati || '00:00';
  const endTime = deliverySettings.siparisKapanisSaati || '23:59';
  const isDeliveryOpen = deliverySettings.teslimatAcik !== false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  let isWithinConfiguredWindow = true;

  if (startMinutes !== null && endMinutes !== null) {
    if (startMinutes <= endMinutes) {
      isWithinConfiguredWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Günlük aralık geceye taşıyorsa (örn. 22:00 - 02:00)
      isWithinConfiguredWindow = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  return {
    startTime,
    endTime,
    isDeliveryOpen,
    isWithinOrderHours: isDeliveryOpen && isWithinConfiguredWindow,
    lastCheckedAt: now.toISOString(),
  };
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

// Ana Layout - Header, Content, Footer, BottomNav
function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const { loadFavoriteIds } = useFavoriteStore();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [whatsappSettings, setWhatsappSettings] = useState(null);
  const [showWhatsAppButton, setShowWhatsAppButton] = useState(false);
  const [settingsData, setSettingsData] = useState(null);
  const [orderHoursInfo, setOrderHoursInfo] = useState(null);
  const [showOrderHoursPopup, setShowOrderHoursPopup] = useState(false);

  // Admin kontrolü
  const isAdmin = !!localStorage.getItem('adminToken');

  // Bakım modu ve WhatsApp ayarları kontrolü
  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await settingsService.getSettings();
        const settings = response.data.settings;
        setSettingsData(settings);
        
        if (settings?.storeSettings?.bakimModu) {
          setMaintenanceMode(true);
          setMaintenanceMessage(
            settings.storeSettings.bakimModuMesaji || 
            'Unser Geschäft befindet sich derzeit im Wartungsmodus. Wir sind bald wieder für Sie da.'
          );
        } else {
          setMaintenanceMode(false);
        }

        // WhatsApp ayarlarını yükle
        if (settings?.whatsappSettings) {
          setWhatsappSettings(settings.whatsappSettings);
        }
      } catch (error) {
        console.error('Bakım modu kontrolü hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceMode();
  }, []);

  // WhatsApp butonunun gösterilip gösterilmeyeceğini kontrol et (saat bazlı)
  useEffect(() => {
    const checkWhatsAppButtonVisibility = () => {
      if (!whatsappSettings || !whatsappSettings.enabled || !whatsappSettings.link) {
        setShowWhatsAppButton(false);
        return;
      }

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const startTime = whatsappSettings.showStartTime || '00:00';
      const endTime = whatsappSettings.showEndTime || '23:59';

      // Saatleri karşılaştır
      const isWithinTimeRange = currentTime >= startTime && currentTime <= endTime;
      setShowWhatsAppButton(isWithinTimeRange);
    };

    checkWhatsAppButtonVisibility();
    
    // Her dakika kontrol et
    const interval = setInterval(checkWhatsAppButtonVisibility, 60000);
    
    return () => clearInterval(interval);
  }, [whatsappSettings]);

  // Sipariş saatlerini takip et
  useEffect(() => {
    if (!settingsData) return;

    const updateOrderHours = () => {
      setOrderHoursInfo(buildOrderHoursInfo(settingsData.deliverySettings || {}));
    };

    updateOrderHours();
    const intervalId = setInterval(updateOrderHours, 60000);

    return () => clearInterval(intervalId);
  }, [settingsData]);

  // Popup gösterim kontrolü
  useEffect(() => {
    if (!orderHoursInfo) return;

    if (orderHoursInfo.isWithinOrderHours) {
      setShowOrderHoursPopup(false);
      return;
    }

    if (typeof window === 'undefined') return;

    const todayKey = getTodayKey();
    const storedKey = window.localStorage.getItem(ORDER_POPUP_STORAGE_KEY);

    if (storedKey === todayKey) {
      setShowOrderHoursPopup(false);
    } else {
      setShowOrderHoursPopup(true);
    }
  }, [orderHoursInfo]);

  const dismissOrderHoursPopup = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ORDER_POPUP_STORAGE_KEY, getTodayKey());
    }
    setShowOrderHoursPopup(false);
  };

  // Kullanıcı giriş yaptığında favori durumunu yükle
  useEffect(() => {
    if (isAuthenticated) {
      loadFavoriteIds();
    }
  }, [isAuthenticated, loadFavoriteIds]);

  // Bakım modu aktifse ve admin değilse bakım mesajını göster
  if (!loading && maintenanceMode && !isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-primary-50/30 to-blue-50">
        {/* Animated background pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
          <div className="max-w-lg w-full bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-10 text-center transform transition-all duration-300 hover:shadow-3xl">
            {/* Animated icon container */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 animate-pulse"></div>
              </div>
              <div className="relative">
                <svg
                  className="mx-auto h-24 w-24 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-extrabold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Wartungsmodus
            </h1>
            
            {/* Subtitle */}
            <p className="text-gray-500 text-sm mb-6 font-medium">
              Unser Geschäft wird derzeit aktualisiert
            </p>

            {/* Divider */}
            <div className="w-20 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto mb-8 rounded-full"></div>

            {/* Message */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
              <p className="text-gray-700 whitespace-pre-line leading-relaxed text-base">
                {maintenanceMessage}
              </p>
            </div>

            {/* Progress indicator */}
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-xs text-gray-400 font-medium">
                Bitte versuchen Sie es später erneut
              </p>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-yellow-100 to-primary-100 rounded-full opacity-40 -z-10"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-blue-100 to-primary-100 rounded-full opacity-40 -z-10"></div>
          </div>
        </div>

        {/* Add custom animations */}
        <style>{`
          @keyframes blob {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    );
  }

  const orderHoursNoticeSettings = settingsData?.deliverySettings?.orderHoursNotice || null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 pb-20 md:pb-4">
        <Outlet context={{ orderHoursInfo, orderHoursNoticeSettings }} />
      </main>

      <Footer />
      <BottomNav />

      {showOrderHoursPopup && orderHoursInfo && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={dismissOrderHoursPopup}
          ></div>
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <FiClock className="h-6 w-6" />
            </div>
            <h3 className="text-center text-xl font-semibold text-gray-900">
              {orderHoursInfo.isDeliveryOpen
                ? 'Wir befinden uns außerhalb unserer Bestellzeiten'
                : 'Die Bestellannahme ist vorübergehend geschlossen'}
            </h3>
            <p className="mt-3 text-center text-sm text-gray-600">
              {orderHoursInfo.startTime && orderHoursInfo.endTime
                ? `Unsere Bestellzeiten sind von ${orderHoursInfo.startTime} bis ${orderHoursInfo.endTime}.`
                : 'Unsere Bestellzeiten werden in Kürze aktualisiert.'}
            </p>
            <p className="mt-2 text-center text-sm font-medium text-gray-900">
              Aktuelle Bestellungen werden als Vorbestellung eingeplant und in den angegebenen Zeiten bearbeitet.
            </p>
            <button
              type="button"
              onClick={dismissOrderHoursPopup}
              className="mt-6 w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Button - Sol alt köşe */}
      {showWhatsAppButton && whatsappSettings?.link && (
        <a
          href={whatsappSettings.link}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-50 bg-green-500/90 backdrop-blur-sm hover:bg-green-600/90 text-white rounded-full p-3 md:p-4 shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="WhatsApp kontaktieren"
        >
          <FaWhatsapp className="w-5 h-5 md:w-7 md:h-7" />
        </a>
      )}
    </div>
  );
}

export default MainLayout;
