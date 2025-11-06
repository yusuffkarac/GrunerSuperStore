import { Link, useLocation } from 'react-router-dom';
import { FiCompass, FiRepeat, FiShoppingCart, FiFileText, FiGift, FiHeart } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import useCartStore from '../../store/cartStore';
import campaignService from '../../services/campaignService';

// Bottom Navigation - Nur auf Mobilgeräten sichtbar
function BottomNav() {
  const location = useLocation();
  const itemCount = useCartStore((state) => state.getItemCount());
  const [campaignCount, setCampaignCount] = useState(0);

  // Aktif kampanya sayısını yükle
  useEffect(() => {
    const loadCampaignCount = async () => {
      try {
        const response = await campaignService.getActiveCampaigns();
        const campaigns = response.data.campaigns || [];
        setCampaignCount(campaigns.length);
      } catch (error) {
        console.error('Kampanya sayısı yüklenirken hata:', error);
      }
    };

    loadCampaignCount();
  }, []);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/', icon: FiCompass, label: 'Entdecken' },
    { path: '/favorilerim', icon: FiHeart, label: 'Favoriten' },
    { path: '/sepet', icon: FiShoppingCart, label: 'Warenkorb', badge: itemCount },
    { path: '/siparislerim', icon: FiFileText, label: 'Bestellungen'},
    { path: '/kampanyalar', icon: FiGift, label: 'Aktionen', badge: campaignCount },
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
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 relative min-w-0 ${
              active ? 'text-primary-600' : 'text-gray-600'
            }`}
          >
            <div className="relative mb-0.5">
              <Icon className={`w-5 h-5 ${active ? 'stroke-2' : ''}`} />
              {/* Badge */}
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] leading-tight truncate w-full text-center ${active ? 'font-medium' : ''}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
