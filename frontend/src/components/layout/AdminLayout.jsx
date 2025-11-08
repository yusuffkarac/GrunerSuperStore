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
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAlert } from '../../contexts/AlertContext';
import { BARCODE_ONLY_MODE } from '../../config/appConfig';

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showConfirm } = useAlert();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { path: '/admin/users', label: 'Benutzer', icon: FiUsers, superAdminOnly: true },
    { path: '/admin/admins', label: 'Administratoren', icon: FiShield, superAdminOnly: true },
    { path: '/admin/barcode-labels', label: 'Barkod Etiketleri', icon: FiPrinter },
    { path: '/admin/settings', label: 'Einstellungen', icon: FiSettings },
    { path: '/admin/homepage-settings', label: 'Homepage-Einstellungen', icon: FiEdit3 },
    { path: '/admin/design-settings', label: 'Design-Einstellungen', icon: FiDroplet },
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
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
