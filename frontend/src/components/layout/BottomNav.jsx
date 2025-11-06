import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiShoppingCart, FiHeart, FiUser } from 'react-icons/fi';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

// Bottom Navigation - Nur auf Mobilgeräten sichtbar
function BottomNav() {
  const location = useLocation();
  const itemCount = useCartStore((state) => state.getItemCount());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', icon: FiHome, label: 'Startseite' },
    { path: '/urunler', icon: FiGrid, label: 'Produkte' },
    { path: '/sepet', icon: FiShoppingCart, label: 'Warenkorb', badge: itemCount },
    { path: '/favorilerim', icon: FiHeart, label: 'Favoriten' },
    {
      path: isAuthenticated ? '/profil' : '/giris',
      icon: FiUser,
      label: isAuthenticated ? 'Profil' : 'Login'
    },
  ];

  return (
    <nav className="md:hidden bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 py-2 relative ${
              active ? 'text-primary-700' : 'text-gray-600'
            }`}
          >
            <Icon className={`w-6 h-6 mb-1 ${active ? 'stroke-2' : ''}`} />
            <span className="text-xs">{item.label}</span>

            {/* Badge (nur für Warenkorb) */}
            {item.badge > 0 && (
              <span className="absolute top-1 right-[calc(50%-12px)] bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
