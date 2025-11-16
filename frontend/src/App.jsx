import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Config
import { BARCODE_ONLY_MODE } from './config/appConfig';

// Context
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CookieConsentProvider } from './contexts/CookieConsentContext';

// Layout
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

// Components
import InstallPrompt from './components/common/InstallPrompt';
import CookieConsent from './components/common/CookieConsent';
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
import FAQ from './pages/FAQ';
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
import FooterSettings from './pages/admin/FooterSettings';
import CookieSettings from './pages/admin/CookieSettings';
import Seiteneinstellungen from './pages/admin/Seiteneinstellungen';
import BarcodeLabels from './pages/admin/BarcodeLabels';
import BarcodeLabelsPrint from './pages/admin/BarcodeLabelsPrint';
import Notifications from './pages/admin/Notifications';
import Help from './pages/admin/Help';
import EmailTemplates from './pages/admin/EmailTemplates';
import NotificationTemplates from './pages/admin/NotificationTemplates';
import RoleManagement from './pages/admin/RoleManagement';
import ExpiryManagement from './pages/admin/ExpiryManagement';
import StockManagement from './pages/admin/StockManagement';
import BulkPriceUpdates from './pages/admin/BulkPriceUpdates';
import Tasks from './pages/admin/Tasks';
import ActivityLogs from './pages/admin/ActivityLogs';
import Magazines from './pages/admin/Magazines';
import FAQs from './pages/admin/FAQs';

// Süper admin kontrolü için yardımcı fonksiyon
const getAdminRole = () => {
  try {
    const adminData = localStorage.getItem('admin');
    if (!adminData) return null;
    const admin = JSON.parse(adminData);
    return admin.role?.toString().trim().toLowerCase();
  } catch (error) {
    return null;
  }
};

// Parametreli route'lar için redirect component'i
function RedirectWithParams({ to }) {
  const params = useParams();
  const { search } = useLocation();
  const newPath = Object.keys(params).reduce((path, key) => {
    return path.replace(`:${key}`, params[key]);
  }, to);
  return <Navigate to={`${newPath}${search}`} replace />;
}

// Sayfa geçişlerini yöneten iç bileşen
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Süper admin kontrolü
  const isSuperAdmin = getAdminRole() === 'superadmin';

  // Barkod-only mod kontrolü: Sadece admin sayfalarına erişim izni (süper adminler hariç)
  useEffect(() => {
    if (BARCODE_ONLY_MODE && !isSuperAdmin && !location.pathname.startsWith('/admin')) {
      navigate('/admin/login', { replace: true });
    }
  }, [location.pathname, navigate, isSuperAdmin]);

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
        {/* User Layout - Barkod-only modda erişim engellenir (süper adminler hariç) */}
        {(!BARCODE_ONLY_MODE || isSuperAdmin) && (
          <Route element={<MainLayout />}>
            <Route path="/" element={<AnaSayfa />} />
            {/* Almanca route'lar */}
            <Route path="/produkte" element={<UrunListesi />} />
            <Route path="/produkt/:id" element={<UrunDetay />} />
            <Route path="/warenkorb" element={<Sepet />} />
            <Route path="/bestellen" element={<SiparisVer />} />
            <Route path="/anmelden" element={<Giris />} />
            <Route path="/registrieren" element={<Kayit />} />
            <Route path="/email-verifizieren" element={<EmailDogrula />} />
            <Route path="/passwort-vergessen" element={<SifremiUnuttum />} />
            <Route path="/passwort-zuruecksetzen" element={<SifreSifirla />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/meine-bestellungen" element={<Siparislerim />} />
            <Route path="/bestellung/:id" element={<SiparisDetay />} />
            <Route path="/favoriten" element={<Favorilerim />} />
            <Route path="/kampagnen" element={<Kampanyalar />} />
            <Route path="/vergleichen" element={<Karsilastir />} />
            <Route path="/faq" element={<FAQ />} />
            {/* Eski Türkçe route'lara redirect */}
            <Route path="/urunler" element={<Navigate to="/produkte" replace />} />
            <Route path="/urun/:id" element={<RedirectWithParams to="/produkt/:id" />} />
            <Route path="/sepet" element={<Navigate to="/warenkorb" replace />} />
            <Route path="/siparis-ver" element={<Navigate to="/bestellen" replace />} />
            <Route path="/giris" element={<Navigate to="/anmelden" replace />} />
            <Route path="/kayit" element={<Navigate to="/registrieren" replace />} />
            <Route path="/email-dogrula" element={<Navigate to="/email-verifizieren" replace />} />
            <Route path="/sifremi-unuttum" element={<Navigate to="/passwort-vergessen" replace />} />
            <Route path="/sifre-sifirla" element={<Navigate to="/passwort-zuruecksetzen" replace />} />
            <Route path="/reset-password" element={<Navigate to="/passwort-zuruecksetzen" replace />} />
            <Route path="/siparislerim" element={<Navigate to="/meine-bestellungen" replace />} />
            <Route path="/siparis/:id" element={<RedirectWithParams to="/bestellung/:id" />} />
            <Route path="/favorilerim" element={<Navigate to="/favoriten" replace />} />
            <Route path="/kampanyalar" element={<Navigate to="/kampagnen" replace />} />
            <Route path="/karsilastir" element={<Navigate to="/vergleichen" replace />} />
          </Route>
        )}

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Barcode Labels Print - Ayrı sayfa (AdminLayout dışında) */}
        <Route path="/admin/barcode-labels/print" element={<BarcodeLabelsPrint />} />

        <Route path="/admin" element={<AdminLayout />}>
          {BARCODE_ONLY_MODE && !isSuperAdmin ? (
            // Sadece barkod etiketleri modu aktifse - belirli sayfalar erişilebilir (süper adminler hariç)
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
              <Route path="help" element={<Help />} />
              <Route path="*" element={<Navigate to="/admin/barcode-labels" replace />} />
            </>
          ) : (
            // Normal mod veya süper admin - tüm sayfalar erişilebilir
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
              <Route
                path="roles"
                element={
                  <SuperAdminRoute>
                    <RoleManagement />
                  </SuperAdminRoute>
                }
              />
              <Route path="expiry-management" element={<ExpiryManagement />} />
              <Route path="stock-management" element={<StockManagement />} />
              <Route path="bulk-price-updates" element={<BulkPriceUpdates />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="barcode-labels" element={<BarcodeLabels />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="email-templates" element={<EmailTemplates />} />
              <Route path="notification-templates" element={<NotificationTemplates />} />
              <Route path="settings" element={<Settings />} />
              <Route path="seiteneinstellungen" element={<Seiteneinstellungen />} />
              <Route path="homepage-settings" element={<HomePageSettings />} />
              <Route path="design-settings" element={<DesignSettings />} />
              <Route path="footer-settings" element={<FooterSettings />} />
              <Route path="cookie-settings" element={<CookieSettings />} />
              <Route path="magazines" element={<Magazines />} />
              <Route path="faqs" element={<FAQs />} />
              <Route path="activity-logs" element={<ActivityLogs />} />
              <Route path="help" element={<Help />} />
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
            <NotificationProvider>
              <CookieConsentProvider>
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

                {/* Cookie Consent Banner */}
                <CookieConsent />

                {/* PWA Install Prompt */}
                <InstallPrompt />
              </CookieConsentProvider>
            </NotificationProvider>
          </Router>
        </ErrorBoundary>
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;
