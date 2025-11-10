import { useState, useEffect, useCallback } from 'react';
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
  FiClock,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAlert } from '../../contexts/AlertContext';
import { BARCODE_ONLY_MODE } from '../../config/appConfig';
import adminService from '../../services/adminService';

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showConfirm } = useAlert();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

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

    // Süper admin kontrolü (sadece admin ve rol yönetimi için)
    const restrictedPaths = ['/admin/admins', '/admin/roles'];
    if (restrictedPaths.includes(pathname) && !currentIsSuperAdmin) {
      navigate('/admin/dashboard');
      toast.error('Zugriff verweigert - Nur für Super-Administratoren');
      return false;
    }

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
      '/admin/notifications': 'notification_management_view',
      '/admin/email-templates': 'email_template_management_view',
      '/admin/notification-templates': 'notification_template_management_view',
      '/admin/barcode-labels': 'barcode_label_view',
    };

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

    // Rol güncellendiğinde admin bilgilerini yeniden yükle
    const handlePermissionsUpdate = () => {
      loadAdminData();
    };

    window.addEventListener('adminPermissionsUpdated', handlePermissionsUpdate);

    return () => {
      window.removeEventListener('adminPermissionsUpdated', handlePermissionsUpdate);
    };
  }, [loadAdminData]);

  // Sayfa değiştiğinde erişim kontrolü yap
  useEffect(() => {
    if (!admin || loading) return;

    checkPageAccess(admin, location.pathname);
  }, [location.pathname, admin, loading, checkPageAccess]);

  const allMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: FiHome, permission: null }, // Dashboard herkese açık
    { path: '/admin/products', label: 'Produkte', icon: FiPackage, permission: 'product_management_view' },
    { path: '/admin/expiry-management', label: 'SKT Yönetimi', icon: FiClock, permission: 'expiry_management_view' },
    { path: '/admin/orders', label: 'Bestellungen', icon: FiShoppingBag, permission: 'order_management_view' },
    { path: '/admin/categories', label: 'Kategorien', icon: FiGrid, permission: 'product_management_view' },
    { path: '/admin/campaigns', label: 'Kampagnen', icon: FiTag, permission: 'marketing_campaigns' },
    { path: '/admin/coupons', label: 'Gutscheine', icon: FiTag, permission: 'marketing_coupons' },
    { path: '/admin/users', label: 'Benutzer', icon: FiUsers, permission: 'user_management_view' },
    { path: '/admin/admins', label: 'Administratoren', icon: FiShield, permission: 'admin_management', superAdminOnly: true },
    { path: '/admin/roles', label: 'Roller ve İzinler', icon: FiShield, permission: 'admin_management', superAdminOnly: true },
    { path: '/admin/notifications', label: 'Benachrichtigungen', icon: FiBell, permission: 'notification_management_view' },
    { path: '/admin/email-templates', label: 'E-Mail Templates', icon: FiMail, permission: 'email_template_management_view' },
    { path: '/admin/notification-templates', label: 'Benachrichtigungs Templates', icon: FiMessageSquare, permission: 'notification_template_management_view' },
    { path: '/admin/barcode-labels', label: 'Barcode-Etiketten', icon: FiPrinter, permission: 'barcode_label_view' },
    { path: '/admin/settings', label: 'Einstellungen', icon: FiSettings, permission: 'settings_view' },
    { path: '/admin/homepage-settings', label: 'Startseite', icon: FiEdit3, permission: 'settings_view' },
    { path: '/admin/design-settings', label: 'Design-Einstellungen', icon: FiDroplet, permission: 'settings_view' },
    { path: '/admin/help', label: 'Hilfe', icon: FiHelpCircle, permission: null }, // Help herkese açık
  ];

  // Menü öğelerini filtrele (güncel admin bilgileriyle)
  const menuItems = admin ? (() => {
    const currentIsSuperAdmin = admin?.role?.toString().trim().toLowerCase() === 'superadmin';
    const currentPermissions = getAdminPermissions(admin);

    return allMenuItems.filter(item => {
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

  // Loading durumunda göster
  if (loading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
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
    <div className="h-screen bg-gray-100 flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm p-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold text-green-600">Gruner Admin Panel</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 right-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 flex flex-col h-screen lg:h-full ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-6 border-b flex-shrink-0">
            <h1 className="text-xl font-bold text-green-600">Gruner Admin Panel</h1>
          </div>

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

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-auto"
            >
              <FiLogOut size={20} />
              <span>Abmelden</span>
            </button>
          </nav>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
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
