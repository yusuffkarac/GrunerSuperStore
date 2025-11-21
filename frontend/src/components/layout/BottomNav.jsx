import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiGrid, FiShoppingCart, FiHeart, FiUser } from 'react-icons/fi';
import { useRef, useMemo, useEffect, useState } from 'react';
import useCartStore from '../../store/cartStore';

// Bottom Navigation - Nur auf Mobilgeräten sichtbar
function BottomNav() {
  const location = useLocation();
  const itemCount = useCartStore((state) => state.getItemCount());
  const navRef = useRef(null);
  const prevItemCount = useRef(itemCount);
  const [cartAnimationKey, setCartAnimationKey] = useState(0);

  const navItems = useMemo(() => [
    { path: '/', icon: FiHome, label: 'Startseite' },
    { path: '/produkte', icon: FiGrid, label: 'Produkte' },
    { path: '/warenkorb', icon: FiShoppingCart, label: 'Warenkorb', badge: itemCount },
    { path: '/favoriten', icon: FiHeart, label: 'Favoriten' },
    { path: '/profil', icon: FiUser, label: 'Profil' },
  ], [itemCount]);

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

  // Sepet animasyonu - itemCount değiştiğinde tetikle
  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      setCartAnimationKey(prev => prev + 1);
    }
    prevItemCount.current = itemCount;
  }, [itemCount]);

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
                  {item.path === '/warenkorb' ? (
                    <motion.div
                      key={cartAnimationKey}
                      animate={cartAnimationKey > 0 ? {
                        scale: [1, 1.3, 1],
                        rotate: [0, -10, 10, 0],
                      } : { scale: 1, rotate: 0 }}
                      transition={{
                        duration: 0.5,
                        ease: 'easeOut',
                      }}
                    >
                      <Icon 
                        className={`nav-icon ${active ? 'nav-icon-active' : ''}`}
                      />
                    </motion.div>
                  ) : item.path === '/favoriten' ? (
                    <motion.div
                      animate={active ? {
                        scale: [1, 1.15, 1],
                      } : {}}
                      transition={{
                        duration: 0.6,
                        repeat: active ? Infinity : 0,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                      }}
                    >
                      <Icon 
                        className={`nav-icon ${active ? 'nav-icon-active' : ''}`}
                      />
                    </motion.div>
                  ) : (
                    <Icon 
                      className={`nav-icon ${active ? 'nav-icon-active' : ''}`}
                    />
                  )}
                  {/* Badge */}
                  {item.badge > 0 && (
                    <motion.span 
                      className={`nav-badge ${active ? 'nav-badge-active' : ''}`}
                      key={`badge-${cartAnimationKey}`}
                      initial={false}
                      animate={cartAnimationKey > 0 ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.badge}
                    </motion.span>
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
