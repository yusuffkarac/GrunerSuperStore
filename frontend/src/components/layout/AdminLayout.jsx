import { useState, useEffect, useCallback, useRef } from 'react';
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
  FiGift,
  FiPercent,
  FiDroplet,
  FiPrinter,
  FiShield,
  FiLock,
  FiKey,
  FiBell,
  FiHelpCircle,
  FiMail,
  FiMessageSquare,
  FiClock,
  FiCheckSquare,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { HiNewspaper } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BARCODE_ONLY_MODE } from '../../config/appConfig';
import adminService from '../../services/adminService';
import settingsService from '../../services/settingsService';
import NotificationBell from '../common/NotificationBell';

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showConfirm } = useAlert();
  const { themeColors } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [hoveredTopMenuItem, setHoveredTopMenuItem] = useState(null);
  const [topTooltipPosition, setTopTooltipPosition] = useState({ top: 0, left: 0 });
  const menuItemRefs = useRef({});
  const topMenuBarRef = useRef(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState('/logo.png');
  const [adminPanelTitle, setAdminPanelTitle] = useState('');

  // Admin bilgilerini al
  const getAdminData = () => {
    try {
      const adminData = localStorage.getItem('admin');
      if (!adminData) return null;
      return JSON.parse(adminData);
    } catch (error) {
      return null;
    }
  };

  // Admin'in izinlerini al
  const getAdminPermissions = (adminData) => {
    if (!adminData) return [];
    // permissions array'i varsa kullan, yoksa adminRole.permissions'dan al
    if (adminData.permissions && Array.isArray(adminData.permissions)) {
      return adminData.permissions.map(p => p.name || p);
    }
    if (adminData.adminRole?.permissions) {
      return adminData.adminRole.permissions.map(rp => rp.permission?.name || rp.permission);
    }
    return [];
  };

  // Sayfa erişim kontrolü
  const checkPageAccess = useCallback((adminData, pathname) => {
    if (!adminData) return false;

    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      toast.error('Bitte melden Sie sich an');
      return false;
    }

    const currentIsSuperAdmin = adminData?.role?.toString().trim().toLowerCase() === 'superadmin';
    const currentPermissions = getAdminPermissions(adminData);

    // İzin kontrolü - sayfa bazlı
    const pathPermissionMap = {
      '/admin/products': 'product_management_view',
      '/admin/expiry-management': 'expiry_management_view',
      '/admin/orders': 'order_management_view',
      '/admin/categories': 'product_management_view',
      '/admin/campaigns': 'marketing_campaigns',
      '/admin/coupons': 'marketing_coupons',
      '/admin/users': 'user_management_view',
      '/admin/settings': 'settings_view',
      '/admin/homepage-settings': 'settings_view',
      '/admin/design-settings': 'settings_view',
      '/admin/magazines': 'magazine_management_view',
      '/admin/notifications': 'notification_management_view',
      '/admin/email-templates': 'email_template_management_view',
      '/admin/notification-templates': 'notification_template_management_view',
      '/admin/barcode-labels': 'barcode_label_view',
      '/admin/activity-logs': 'admin_management',
    };

    // Super admin kontrolü - sayfa bazlı
    const superAdminOnlyPaths = ['/admin/admins', '/admin/roles', '/admin/activity-logs'];
    if (superAdminOnlyPaths.includes(pathname) && !currentIsSuperAdmin) {
      navigate('/admin/dashboard');
      toast.error('Zugriff verweigert - Nur für Super-Administratoren');
      return false;
    }

    const requiredPermission = pathPermissionMap[pathname];
    if (requiredPermission && !currentIsSuperAdmin && !currentPermissions.includes(requiredPermission)) {
      navigate('/admin/dashboard');
      toast.error('Sie haben keine Berechtigung für diese Seite');
      return false;
    }

    // Barkod-only modunda izin verilen sayfalar (süper adminler hariç)
    const allowedPathsInBarcodeMode = [
      '/admin/barcode-labels',
      '/admin/admins',
      '/admin/users'
    ];
    
    // Barkod-only modunda ve izin verilen sayfalardan biri değilsek yönlendir (süper adminler hariç)
    if (BARCODE_ONLY_MODE && !currentIsSuperAdmin && !allowedPathsInBarcodeMode.includes(pathname)) {
      navigate('/admin/barcode-labels');
      return false;
    }

    return true;
  }, [navigate]);

  // Admin bilgilerini yeniden yükle (permissions dahil)
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      toast.error('Bitte melden Sie sich an');
      setLoading(false);
      return;
    }

    // Önce localStorage'dan yükle (hızlı render için)
    const localAdmin = getAdminData();
    if (localAdmin) {
      setAdmin(localAdmin);
      // Sayfa erişim kontrolü yap
      if (!checkPageAccess(localAdmin, location.pathname)) {
        setLoading(false);
        return;
      }
    }

    try {
      // Admin bilgilerini API'den al (permissions dahil)
      const response = await adminService.getMe();
      if (response.data?.admin) {
        localStorage.setItem('admin', JSON.stringify(response.data.admin));
        setAdmin(response.data.admin);
        // Sayfa erişim kontrolü yap
        if (!checkPageAccess(response.data.admin, location.pathname)) {
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('Admin bilgileri yüklenirken hata:', error);
      // Hata durumunda mevcut localStorage verisini kullanmaya devam et
      if (localAdmin && !checkPageAccess(localAdmin, location.pathname)) {
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  }, [navigate, location.pathname, checkPageAccess]);

  useEffect(() => {
    loadAdminData();
    loadLogo();

    // Rol güncellendiğinde admin bilgilerini yeniden yükle
    const handlePermissionsUpdate = () => {
      loadAdminData();
    };

    window.addEventListener('adminPermissionsUpdated', handlePermissionsUpdate);

    return () => {
      window.removeEventListener('adminPermissionsUpdated', handlePermissionsUpdate);
    };
  }, [loadAdminData]);

  // Logo ve admin panel başlığını yükle
  const loadLogo = useCallback(async () => {
    try {
      const response = await settingsService.getSettings();
      const settings = response.data?.settings;
      
      if (settings?.storeSettings?.logo) {
        const API_BASE = import.meta.env.VITE_API_URL 
          ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL.slice(0, -4) : import.meta.env.VITE_API_URL)
          : (import.meta.env.DEV ? 'http://localhost:5001' : '');
        const logoUrl = settings.storeSettings.logo.startsWith('http')
          ? settings.storeSettings.logo
          : `${API_BASE}${settings.storeSettings.logo}`;
        setLogo(logoUrl);
      } else {
        setLogo('/logo.png');
      }

      // Admin panel başlığını yükle
      if (settings?.storeSettings?.adminPanelTitle) {
        setAdminPanelTitle(settings.storeSettings.adminPanelTitle);
      } else {
        setAdminPanelTitle('');
      }
    } catch (error) {
      console.error('Logo yüklenirken hata:', error);
      setLogo('/logo.png');
      setAdminPanelTitle('');
    }
  }, []);

  // Sayfa değiştiğinde erişim kontrolü yap
  useEffect(() => {
    if (!admin || loading) return;

    checkPageAccess(admin, location.pathname);
  }, [location.pathname, admin, loading, checkPageAccess]);

  // Sayfa değiştiğinde hover state'ini temizle
  useEffect(() => {
    setHoveredTopMenuItem(null);
  }, [location.pathname]);

  // Üst menü öğeleri (soldan sağa sıralama)
  const topMenuItems = [
    { path: '/admin/tasks', label: 'Aufgaben', icon: FiCheckSquare, permission: 'product_management_view', isAction: false }, // En solda
    { path: '/admin/users', label: 'Benutzer', icon: FiUsers, permission: 'user_management_view', isAction: false },
    { path: '/admin/admins', label: 'Administratoren', icon: FiLock, permission: 'admin_management', superAdminOnly: true, isAction: false },
    { path: '/admin/activity-logs', label: 'Protokolle', icon: FiClock, permission: 'admin_management', superAdminOnly: true, isAction: false },
    { path: '/admin/notifications', label: 'Benachrichtigungen', icon: FiBell, permission: 'notification_management_view', isAction: false },
    { path: '/admin/settings', label: 'Einstellungen', icon: FiSettings, permission: 'settings_view', isAction: false },
    { path: null, label: 'Abmelden', icon: FiLogOut, permission: null, isAction: true }, // Logout action
    { path: '/admin/help', label: 'Hilfe', icon: FiHelpCircle, permission: null, isAction: false }, // En sağda
  ];

  const allMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: FiHome, permission: null }, // Dashboard herkese açık
    { path: '/admin/products', label: 'Produkte', icon: FiPackage, permission: 'product_management_view' },
    { path: '/admin/expiry-management', label: 'MHD Verwaltung', icon: FiClock, permission: 'expiry_management_view' },
    { path: '/admin/stock-management', label: 'Lagerbestand', icon: FiAlertCircle, permission: 'stock_management_view' },
    { path: '/admin/orders', label: 'Bestellungen', icon: FiShoppingBag, permission: 'order_management_view' },
    { path: '/admin/categories', label: 'Kategorien', icon: FiGrid, permission: 'product_management_view' },
    { path: '/admin/campaigns', label: 'Kampagnen', icon: FiGift, permission: 'marketing_campaigns' },
    { path: '/admin/coupons', label: 'Gutscheine', icon: FiPercent, permission: 'marketing_coupons' },
    { path: '/admin/roles', label: 'Rollen & Berechtigungen', icon: FiKey, permission: 'admin_management', superAdminOnly: true },
    { path: '/admin/email-templates', label: 'E-Mail Templates', icon: FiMail, permission: 'email_template_management_view' },
    { path: '/admin/notification-templates', label: 'Benachr.-Templates', icon: FiMessageSquare, permission: 'notification_template_management_view' },
    { path: '/admin/barcode-labels', label: 'Barcode-Etiketten', icon: FiPrinter, permission: 'barcode_label_view' },
    { path: '/admin/seiteneinstellungen', label: 'Seiteneinstellungen', icon: FiSettings, permission: 'settings_view' },
    { path: '/admin/design-settings', label: 'Design-Einstellungen', icon: FiDroplet, permission: 'settings_view' },
    { path: '/admin/magazines', label: 'Wöchentliche Prospekte', icon: HiNewspaper, permission: 'magazine_management_view' },
    // Eski route'lar - geriye dönük uyumluluk için
    { path: '/admin/homepage-settings', label: 'Startseite', icon: FiEdit3, permission: 'settings_view', hidden: true },
    { path: '/admin/footer-settings', label: 'Footer-Einstellungen', icon: FiEdit3, permission: 'settings_view', hidden: true },
    { path: '/admin/cookie-settings', label: 'Cookie-Einstellungen', icon: FiShield, permission: 'settings_view', hidden: true },
    { path: '/admin/faqs', label: 'FAQ-Verwaltung', icon: FiHelpCircle, permission: 'settings_view', hidden: true },
  ];

  // Üst menü öğelerini filtrele (güncel admin bilgileriyle)
  const filteredTopMenuItems = admin ? (() => {
    const currentIsSuperAdmin = admin?.role?.toString().trim().toLowerCase() === 'superadmin';
    const currentPermissions = getAdminPermissions(admin);

    return topMenuItems.filter(item => {
      // Logout her zaman gösterilir
      if (item.isAction) return true;

      // İzin kontrolü
      if (item.permission === null) {
        return true;
      }

      // Super admin kontrolü
      if (item.superAdminOnly && !currentIsSuperAdmin) {
        return false;
      }

      // İzin kontrolü yap
      return currentIsSuperAdmin || currentPermissions.includes(item.permission);
    });
  })() : [];

  // Menü öğelerini filtrele (güncel admin bilgileriyle)
  const menuItems = admin ? (() => {
    const currentIsSuperAdmin = admin?.role?.toString().trim().toLowerCase() === 'superadmin';
    const currentPermissions = getAdminPermissions(admin);

    return allMenuItems.filter(item => {
      // Hidden öğeleri gizle
      if (item.hidden) return false;

      // Barkod-only modunda sadece izin verilen menü öğelerini göster (süper adminler hariç)
      if (BARCODE_ONLY_MODE && !currentIsSuperAdmin) {
        if (item.path === '/admin/barcode-labels') return true;
        if (item.superAdminOnly) return currentIsSuperAdmin;
        return false;
      }

      // Super admin kontrolü
      if (item.superAdminOnly && !currentIsSuperAdmin) {
        return false;
      }

      // İzin kontrolü
      if (item.permission === null) {
        // İzin gerektirmeyen sayfalar (dashboard, help, vb.)
        return true;
      }

      // İzin kontrolü yap
      return currentIsSuperAdmin || currentPermissions.includes(item.permission);
    });
  })() : [];

  const handleLogout = async () => {
    const confirmed = await showConfirm('Möchten Sie sich wirklich abmelden?');
    if (confirmed) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin');
      toast.success('Erfolgreich abgemeldet');
      navigate('/admin/login');
    }
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  // Loading durumunda göster
  if (loading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: themeColors?.primary?.[600] || '#16a34a' }}
          ></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  // Admin yoksa veya erişim yoksa göster
  if (!admin) {
    return null;
  }

  return (
    <div className="admin-layout h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Top Menu Bar - Desktop */}
      <div ref={topMenuBarRef} className="hidden lg:flex bg-white shadow-sm border-b px-6 py-3 flex-shrink-0 items-center justify-between relative">
        <div className="flex items-center gap-3">
        <div className={`hidden lg:flex ${sidebarCollapsed ? 'justify-center' : 'justify-end'} mb-0`}>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title={sidebarCollapsed ? 'Menü erweitern' : 'Menü reduzieren'}
              >
                {sidebarCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
              </button>
            </div>
          <img src={logo} alt="Gruner Logo" className="w-8 h-8 object-contain flex-shrink-0" onError={(e) => { e.target.src = '/logo.png'; }} />
          {adminPanelTitle && (
            <h1 
              className="text-xl font-bold" 
              style={{ color: themeColors?.primary?.[600] || '#16a34a' }}
            >
              {adminPanelTitle}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div
            className="relative"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();

              setTopTooltipPosition({
                top: rect.bottom + 8,
                left: rect.left + (rect.width / 2)
              });
              setHoveredTopMenuItem('notifications');
            }}
            onMouseLeave={() => setHoveredTopMenuItem(null)}
          >
            <NotificationBell alignLeft />
          </div>
          {filteredTopMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = !item.isAction && location.pathname === item.path;
            const itemKey = item.path || item.label;

            if (item.isAction) {
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    setTopTooltipPosition({
                      top: rect.bottom + 8,
                      left: rect.left + (rect.width / 2)
                    });
                    setHoveredTopMenuItem(item.label);
                  }}
                  onMouseLeave={() => setHoveredTopMenuItem(null)}
                >
                  <button
                    onClick={() => {
                      setHoveredTopMenuItem(null);
                      handleLogout();
                    }}
                    className="p-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Icon size={20} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={item.path}
                className="relative"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();

                  setTopTooltipPosition({
                    top: rect.bottom + 8,
                    left: rect.left + (rect.width / 2)
                  });
                  setHoveredTopMenuItem(itemKey);
                }}
                onMouseLeave={() => setHoveredTopMenuItem(null)}
              >
                <Link
                  to={item.path}
                  onClick={() => setHoveredTopMenuItem(null)}
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? ''
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={isActive ? {
                    color: themeColors?.primary?.[600] || '#16a34a'
                  } : {}}
                >
                  <Icon size={20} />
                </Link>
              </div>
            );
          })}
        </div>
        
        {/* Top Menu Tooltip */}
        {hoveredTopMenuItem && (
          <div 
            className="hidden lg:block fixed z-[9999] pointer-events-none -translate-x-1/2"
            style={{
              left: `${topTooltipPosition.left}px`,
              top: `${topTooltipPosition.top}px`
            }}
          >
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl whitespace-nowrap relative">
              {hoveredTopMenuItem === 'notifications' 
                ? 'Benachrichtigungen'
                : filteredTopMenuItems.find(item => (item.path || item.label) === hoveredTopMenuItem)?.label}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm p-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          <img src={logo} alt="Gruner Logo" className="w-6 h-6 object-contain flex-shrink-0" onError={(e) => { e.target.src = '/logo.png'; }} />
        </div>
        <div className="flex items-center gap-1">
          {/* Mobile Top Menu Icons */}
          <div className="flex items-center gap-1">
            <NotificationBell alignLeft />
            {filteredTopMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = !item.isAction && location.pathname === item.path;

              if (item.isAction) {
                return (
                  <button
                    key={item.label}
                    onClick={handleLogout}
                    className="p-1 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title={item.label}
                  >
                    <Icon size={16} />
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    isActive
                      ? ''
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={isActive ? {
                    color: themeColors?.primary?.[600] || '#16a34a'
                  } : {}}
                  title={item.label}
                >
                  <Icon size={16} />
                </Link>
              );
            })}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 right-0 z-50 bg-white shadow-lg transform transition-all duration-300 flex flex-col h-screen lg:h-full ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          } ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64`}
        >
          <nav className={`p-3 space-y-1.5 flex-1 overflow-y-auto min-h-0 ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
            {/* Toggle Button - Desktop Only */}
            
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isHovered = hoveredMenuItem === item.path;

              return (
                <div
                  key={item.path}
                  ref={(el) => {
                    if (el) menuItemRefs.current[item.path] = el;
                  }}
                  className={`relative ${sidebarCollapsed ? 'lg:flex lg:justify-center' : ''}`}
                  onMouseEnter={(e) => {
                    if (sidebarCollapsed) {
                      // Link elementinin pozisyonunu al (içerideki Link, dıştaki div değil)
                      const linkElement = e.currentTarget.querySelector('a');
                      const rect = linkElement ? linkElement.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
                      // Tooltip, aside üzerinde 'fixed' olduğundan koordinatları aside'a göre hesapla
                      const asideEl = e.currentTarget.closest('aside');
                      const asideRect = asideEl ? asideEl.getBoundingClientRect() : { top: 0, left: 0 };

                      setTooltipPosition({
                        top: rect.top - asideRect.top + (rect.height / 2),
                        left: rect.right - asideRect.left + 8
                      });
                      setHoveredMenuItem(item.path);
                    }
                  }}
                  onMouseLeave={() => setHoveredMenuItem(null)}
                >
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                      sidebarCollapsed ? 'lg:px-2 lg:justify-center' : ''
                    } ${
                      isActive
                        ? 'font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    style={isActive ? {
                      backgroundColor: themeColors?.primary?.[50] || '#f0fdf4',
                      color: themeColors?.primary?.[600] || '#16a34a'
                    } : {}}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span className={`${sidebarCollapsed ? 'lg:hidden' : ''} whitespace-nowrap`}>
                      {item.label}
                    </span>
                  </Link>
                </div>
              );
            })}
          </nav>
          
          {/* Tooltip - Sidebar dışında render ediliyor */}
          {sidebarCollapsed && hoveredMenuItem && (
            <div 
              className="hidden lg:block fixed z-[9999] pointer-events-none -translate-y-1/2"
              style={{
                left: `${tooltipPosition.left}px`,
                top: `${tooltipPosition.top}px`
              }}
            >
              <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl whitespace-nowrap relative">
                {menuItems.find(item => item.path === hoveredMenuItem)?.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
              </div>
            </div>
          )}
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main
          className="flex-1 p-2 md:p-6 lg:p-8 w-full overflow-y-auto min-h-0"
          style={{
            willChange: 'scroll-position',
            transform: 'translateZ(0)',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
