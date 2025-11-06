import { Link, useLocation } from 'react-router-dom';
import { FiCompass, FiRepeat, FiShoppingCart, FiFileText, FiGift, FiHeart } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import useCartStore from '../../store/cartStore';
import campaignService from '../../services/campaignService';

// Bottom Navigation - Nur auf Mobilgeräten sichtbar
function BottomNav() {
  const location = useLocation();
  const itemCount = useCartStore((state) => state.getItemCount());
  const [campaignCount, setCampaignCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
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

  // Update active index when location changes
  useEffect(() => {
    const currentIndex = navItems.findIndex(item => isActive(item.path));
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    }
  }, [location.pathname]);

  return (
    <nav className="md:hidden bottom-nav-modern" ref={navRef}>
      {/* Animated active indicator */}
      <div
        className="bottom-nav-indicator"
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
            className="bottom-nav-item group"
          >
            {/* Ripple container */}
            <div className={`bottom-nav-item-content ${active ? 'active' : ''}`}>
              {/* Icon container with animation */}
              <div className="bottom-nav-icon-wrapper">
                <Icon className={`bottom-nav-icon ${active ? 'active' : ''}`} />

                {/* Badge with pulse animation */}
                {item.badge > 0 && (
                  <span className="bottom-nav-badge">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`bottom-nav-label ${active ? 'active' : ''}`}>
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
