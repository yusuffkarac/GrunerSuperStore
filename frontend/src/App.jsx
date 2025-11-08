import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Config
import { BARCODE_ONLY_MODE } from './config/appConfig';

// Context
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

// Components
import InstallPrompt from './components/common/InstallPrompt';
import PageLoading from './components/common/PageLoading';
import ErrorBoundary from './components/common/ErrorBoundary';
import SuperAdminRoute from './components/common/SuperAdminRoute';

// Pages
import AnaSayfa from './pages/AnaSayfa';
import UrunListesi from './pages/UrunListesi';
import UrunDetay from './pages/UrunDetay';
import Sepet from './pages/Sepet';
import SiparisVer from './pages/SiparisVer';
import Giris from './pages/Giris';
import Kayit from './pages/Kayit';
import EmailDogrula from './pages/EmailDogrula';
import SifremiUnuttum from './pages/SifremiUnuttum';
import SifreSifirla from './pages/SifreSifirla';
import Profil from './pages/Profil';
import Siparislerim from './pages/Siparislerim';
import SiparisDetay from './pages/SiparisDetay';
import Favorilerim from './pages/Favorilerim';
import Kampanyalar from './pages/Kampanyalar';
import Karsilastir from './pages/Karsilastir';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import Produkte from './pages/admin/Produkte';
import Orders from './pages/admin/Orders';
import Categories from './pages/admin/Categories';
import Campaigns from './pages/admin/Campaigns';
import Coupons from './pages/admin/Coupons';
import Users from './pages/admin/Users';
import Admins from './pages/admin/Admins';
import Settings from './pages/admin/Settings';
import HomePageSettings from './pages/admin/HomePageSettings';
import DesignSettings from './pages/admin/DesignSettings';
import BarcodeLabels from './pages/admin/BarcodeLabels';
import BarcodeLabelsPrint from './pages/admin/BarcodeLabelsPrint';

// Sayfa geçişlerini yöneten iç bileşen
function AppContent() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Sayfa değiştiğinde loading göster
    setIsLoading(true);
    
    // Kısa bir süre sonra loading'i kapat (minimum gösterim süresi - animasyon için)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Number inputlarda mouse wheel ile değer değişimini engelle
  useEffect(() => {
    const handleWheel = (e) => {
      // Eğer event target bir number input ise wheel event'ini engelle
      const target = e.target;
      if (target && target.type === 'number') {
        e.preventDefault();
      }
    };

    // Wheel event'ini dinle (passive: false ile preventDefault çalışsın)
    document.addEventListener('wheel', handleWheel, { passive: false });
    // Eski tarayıcılar için mousewheel event'i
    document.addEventListener('mousewheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousewheel', handleWheel);
    };
  }, []);

  // Sağ tıklamayı (context menu) engelle - admin sayfalarında engelleme
  useEffect(() => {
    const handleContextMenu = (e) => {
      // Admin sayfalarında context menu'yu engelleme
      if (location.pathname.startsWith('/admin')) {
        return;
      }
      e.preventDefault();
    };

    // Context menu event'ini dinle
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [location.pathname]);

  return (
    <>
      {isLoading && <PageLoading />}
      <Routes>
        {/* User Layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<AnaSayfa />} />
          <Route path="/urunler" element={<UrunListesi />} />
          <Route path="/urun/:id" element={<UrunDetay />} />
          <Route path="/sepet" element={<Sepet />} />
          <Route path="/siparis-ver" element={<SiparisVer />} />
          <Route path="/giris" element={<Giris />} />
          <Route path="/kayit" element={<Kayit />} />
          <Route path="/email-dogrula" element={<EmailDogrula />} />
          <Route path="/sifremi-unuttum" element={<SifremiUnuttum />} />
          <Route path="/sifre-sifirla" element={<SifreSifirla />} />
          <Route path="/reset-password" element={<SifreSifirla />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/siparislerim" element={<Siparislerim />} />
          <Route path="/siparis/:id" element={<SiparisDetay />} />
          <Route path="/favorilerim" element={<Favorilerim />} />
          <Route path="/kampanyalar" element={<Kampanyalar />} />
          <Route path="/karsilastir" element={<Karsilastir />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Barcode Labels Print - Ayrı sayfa (AdminLayout dışında) */}
        <Route path="/admin/barcode-labels/print" element={<BarcodeLabelsPrint />} />

        <Route path="/admin" element={<AdminLayout />}>
          {BARCODE_ONLY_MODE ? (
            // Sadece barkod etiketleri modu aktifse - belirli sayfalar erişilebilir
            <>
              <Route index element={<Navigate to="/admin/barcode-labels" replace />} />
              <Route path="barcode-labels" element={<BarcodeLabels />} />
              <Route 
                path="admins" 
                element={
                  <SuperAdminRoute>
                    <Admins />
                  </SuperAdminRoute>
                } 
              />
              <Route 
                path="users" 
                element={
                  <SuperAdminRoute>
                    <Users />
                  </SuperAdminRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/admin/barcode-labels" replace />} />
            </>
          ) : (
            // Normal mod - tüm sayfalar erişilebilir
            <>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Produkte />} />
              <Route path="orders" element={<Orders />} />
              <Route path="categories" element={<Categories />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="coupons" element={<Coupons />} />
              <Route 
                path="users" 
                element={
                  <SuperAdminRoute>
                    <Users />
                  </SuperAdminRoute>
                } 
              />
              <Route 
                path="admins" 
                element={
                  <SuperAdminRoute>
                    <Admins />
                  </SuperAdminRoute>
                } 
              />
              <Route path="barcode-labels" element={<BarcodeLabels />} />
              <Route path="settings" element={<Settings />} />
              <Route path="homepage-settings" element={<HomePageSettings />} />
              <Route path="design-settings" element={<DesignSettings />} />
            </>
          )}
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <ErrorBoundary>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
            <ToastContainer
            position="bottom-center"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            limit={2}
          />

            {/* PWA Install Prompt */}
            <InstallPrompt />
          </Router>
        </ErrorBoundary>
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;
