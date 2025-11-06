import { Link, useLocation } from 'react-router-dom';
import { FiCompass, FiRepeat, FiShoppingCart, FiFileText, FiGift, FiHeart } from 'react-icons/fi';
import { useState, useEffect, useRef, useMemo, useRef } from 'react';
import useCartStore from '../../store/cartStore';
import campaignService from '../../services/campaignService';

// Bottom Navigation - Nur auf Mobilgeräten sichtbar
function BottomNav() {
  const location = useLocation();
  const itemCount = useCartStore((state) => state.getItemCount());
  const [campaignCount, setCampaignCount] = useState(0);
  const navRef = useRef(null);

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

  const navItems = useMemo(() => [
    { path: '/', icon: FiCompass, label: 'Entdecken' },
    { path: '/favorilerim', icon: FiHeart, label: 'Favoriten' },
    { path: '/sepet', icon: FiShoppingCart, label: 'Warenkorb', badge: itemCount },
    { path: '/siparislerim', icon: FiFileText, label: 'Bestellungen'},
    { path: '/kampanyalar', icon: FiGift, label: 'Aktionen', badge: campaignCount },
  ], [itemCount, campaignCount]);

  // Aktif index'i hesapla
  const activeIndex = useMemo(() => {
    const currentPath = location.pathname;
    const currentIndex = navItems.findIndex(item => {
      if (item.path === '/') {
        return currentPath === '/';
      }
      return currentPath.startsWith(item.path);
    });
    return currentIndex !== -1 ? currentIndex : 0;
  }, [location.pathname, navItems]);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav ref={navRef} className="md:hidden bottom-nav-enhanced">
      {/* Aktif item için animasyonlu arka plan */}
      <div 
        className="nav-active-indicator"
        style={{
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${active ? 'nav-item-active' : ''}`}
          >
            {/* Ripple efekti için container */}
            <div className="nav-item-ripple">
              <div className="nav-item-content">
                <div className="relative mb-0.5">
                  <Icon 
                    className={`nav-icon ${active ? 'nav-icon-active' : ''}`}
                  />
                  {/* Badge */}
                  {item.badge > 0 && (
                    <span className={`nav-badge ${active ? 'nav-badge-active' : ''}`}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`nav-label ${active ? 'nav-label-active' : ''}`}>
                  {item.label}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
