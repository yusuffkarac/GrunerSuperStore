import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiPackage,
  FiShoppingBag,
  FiUsers,
  FiGrid,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiEdit3,
  FiTag,
  FiDroplet,
  FiPrinter,
  FiShield,
  FiBell,
  FiHelpCircle,
  FiMail,
  FiMessageSquare,
  FiCheckCircle,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAlert } from '../../contexts/AlertContext';
import { BARCODE_ONLY_MODE } from '../../config/appConfig';
import settingsService from '../../services/settingsService';
import { normalizeImageUrl } from '../../utils/imageUtils';

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showConfirm } = useAlert();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);
  const [logo, setLogo] = useState(null);

  // Window resize listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Logo yükle
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await settingsService.getSettings();
        const storeSettings = response.data.settings?.storeSettings;
        if (storeSettings?.logo) {
          setLogo(normalizeImageUrl(storeSettings.logo));
        }
      } catch (error) {
        console.error('Logo yüklenirken hata:', error);
      }
    };
    fetchLogo();
  }, []);

  // Admin rolünü kontrol et
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

  const isSuperAdmin = getAdminRole() === 'superadmin';

  // Admin authentication kontrolü
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      toast.error('Bitte melden Sie sich an');
    } else {
      // Süper admin olmayanların "Benutzer" ve "Administratoren" sayfalarına erişimini engelle
      const restrictedPaths = ['/admin/users', '/admin/admins'];
      if (restrictedPaths.includes(location.pathname) && !isSuperAdmin) {
        navigate('/admin/dashboard');
        toast.error('Zugriff verweigert - Nur für Super-Administratoren');
        return;
      }

      // Barkod-only modunda izin verilen sayfalar (süper adminler hariç)
      const allowedPathsInBarcodeMode = [
        '/admin/barcode-labels',
        '/admin/admins',
        '/admin/users'
      ];
      
      // Barkod-only modunda ve izin verilen sayfalardan biri değilsek yönlendir (süper adminler hariç)
      if (BARCODE_ONLY_MODE && !isSuperAdmin && !allowedPathsInBarcodeMode.includes(location.pathname)) {
        navigate('/admin/barcode-labels');
      }
    }
  }, [navigate, location.pathname, isSuperAdmin]);

  const allMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/admin/products', label: 'Produkte', icon: FiPackage },
    { path: '/admin/orders', label: 'Bestellungen', icon: FiShoppingBag },

    { path: '/admin/categories', label: 'Kategorien', icon: FiGrid },
    { path: '/admin/campaigns', label: 'Kampagnen', icon: FiTag },
    { path: '/admin/coupons', label: 'Gutscheine', icon: FiTag },
    { path: '/admin/admins', label: 'Administratoren', icon: FiShield, superAdminOnly: true },
    { path: '/admin/email-templates', label: 'E-Mail Templates', icon: FiMail },
    { path: '/admin/notification-templates', label: 'Benachrichtigungs Templates', icon: FiMessageSquare },
    { path: '/admin/barcode-labels', label: 'Barcode-Etiketten', icon: FiPrinter },
    { path: '/admin/homepage-settings', label: 'Startseite', icon: FiEdit3 },
    { path: '/admin/design-settings', label: 'Design-Einstellungen', icon: FiDroplet },
  ];

  // Üst menü öğeleri (sağdan sola sıralama: Hilfe, Çıkış, Einstellungen, Bildirim, Kullanıcılar, Aufgaben)
  const topMenuItems = [
    { path: '/admin/help', label: 'Hilfe', icon: FiHelpCircle },
    { type: 'logout', label: 'Abmelden', icon: FiLogOut },
    { path: '/admin/settings', label: 'Einstellungen', icon: FiSettings },
    { path: '/admin/notifications', label: 'Benachrichtigungen', icon: FiBell },
    { path: '/admin/users', label: 'Benutzer', icon: FiUsers, superAdminOnly: true },
    { path: '/admin/tasks', label: 'Aufgaben', icon: FiCheckCircle },
  ];

  // Barkod-only modunda sadece izin verilen menü öğelerini göster (süper adminler hariç)
  // Normal modda veya süper admin ise tüm menü öğeleri gösterilir
  const menuItems = (BARCODE_ONLY_MODE && !isSuperAdmin)
    ? allMenuItems.filter(item => {
        // Barkod-only modunda sadece belirli sayfalar gösterilir
        // Ancak "Benutzer" ve "Administratoren" sadece superadmin'ler için
        if (item.path === '/admin/barcode-labels') return true;
        if (item.superAdminOnly) return isSuperAdmin;
        return false;
      })
    : allMenuItems.filter(item => 
        !item.superAdminOnly || isSuperAdmin
      );

  const handleLogout = async () => {
    const confirmed = await showConfirm('Möchten Sie sich wirklich abmelden?');
    if (confirmed) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin');
      toast.success('Erfolgreich abgemeldet');
      navigate('/admin/login');
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Top Header Menu */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Mobile Menu Button ve Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            {logo && (
              <img 
                src={logo} 
                alt="Logo" 
                className="h-7 max-w-[150px] object-contain"
                onError={() => setLogo(null)}
              />
            )}
          </div>

          {/* Desktop Logo */}
          <div className="hidden lg:flex items-center gap-2">
            {logo && (
              <img 
                src={logo} 
                alt="Logo" 
                className="h-8 max-w-[200px] object-contain"
                onError={() => setLogo(null)}
              />
            )}
            <h1 className="text-xl font-bold text-green-600">Gruner Admin Panel</h1>
          </div>

          {/* Top Menu Items (sağdan sola) */}
          <div className="flex flex-row-reverse items-center gap-2 ml-auto">
            {topMenuItems
              .filter(item => !item.superAdminOnly || isSuperAdmin)
              .map((item) => {
                const Icon = item.icon;
                const isActive = item.path && location.pathname === item.path;

                // Logout butonu
                if (item.type === 'logout') {
                  return (
                    <button
                      key="logout"
                      onClick={handleLogout}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title={item.label}
                    >
                      <Icon size={20} />
                    </button>
                  );
                }

                // Diğer menü öğeleri (Link)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={item.label}
                  >
                    <Icon size={20} />
                  </Link>
                );
              })}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static right-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 flex flex-col lg:h-full ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
          style={isMobile ? { 
            top: '57px',
            bottom: '0',
            height: 'calc(100vh - 57px)'
          } : {}}
        >
          <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ top: '57px' }}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 px-4 py-2 md:p-6 lg:p-8 w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
