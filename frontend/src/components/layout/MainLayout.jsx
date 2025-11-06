import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import useAuthStore from '../../store/authStore';
import useFavoriteStore from '../../store/favoriteStore';
import settingsService from '../../services/settingsService';

// Ana Layout - Header, Content, Footer, BottomNav
function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const { loadFavoriteIds } = useFavoriteStore();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Admin kontrolü
  const isAdmin = !!localStorage.getItem('adminToken');

  // Bakım modu kontrolü
  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await settingsService.getSettings();
        const settings = response.data.settings;
        
        if (settings?.storeSettings?.bakimModu) {
          setMaintenanceMode(true);
          setMaintenanceMessage(
            settings.storeSettings.bakimModuMesaji || 
            'Unser Geschäft befindet sich derzeit im Wartungsmodus. Wir sind bald wieder für Sie da.'
          );
        } else {
          setMaintenanceMode(false);
        }
      } catch (error) {
        console.error('Bakım modu kontrolü hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceMode();
  }, []);

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

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 pb-4">
        <Outlet />
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}

export default MainLayout;
