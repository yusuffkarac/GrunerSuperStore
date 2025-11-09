import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiShoppingCart, FiUser, FiArrowLeft, FiHome, FiGrid, FiHeart } from 'react-icons/fi';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import productService from '../../services/productService';
import { normalizeImageUrls } from '../../utils/imageUtils';
import NotificationBell from '../common/NotificationBell';

// Header Componenti - Sticky
function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const itemCount = useCartStore((state) => state.getItemCount());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Geri butonu gösterilecek sayfalar
  const showBackButton = !['/', '/urunler'].includes(location.pathname);

  // Debounced search - yazdıkça arama yap
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await productService.searchProducts(searchTerm.trim(), {
          limit: 5, // İlk 5 sonuç
        });
        setSearchResults(response.data.products || []);
        setShowResults(true);
      } catch (error) {
        console.error('Arama hatası:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Dışarı tıklandığında dropdown'u kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/urunler?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
      setShowResults(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setSearchTerm('');
    }
  };


  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/', icon: FiHome, label: 'Startseite' },
    { path: '/urunler', icon: FiGrid, label: 'Produkte' },
    { path: '/favorilerim', icon: FiHeart, label: 'Favoriten' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="container-mobile">
        {/* Desktop Navigasyon Menüsü */}
        <div className="hidden md:flex items-center justify-between py-3 border-b border-gray-200">
          {/* Logo */}
          <Link
            to="/"
            className="flex-shrink-0 flex items-center justify-center"
            aria-label="Ana Sayfa"
          >
            <img
              src="/logo.png"
              alt="Gruner SuperStore"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Navigasyon Butonları */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sağ Taraf - Sepet ve Profil */}
          <div className="flex items-center gap-3">
            {isAuthenticated && <NotificationBell />}
            <Link
              to="/sepet"
              className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Warenkorb"
            >
              <FiShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
            <Link
              to="/profil"
              className={`p-2 rounded-lg transition-colors ${
                isActive('/profil')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Profil"
            >
              <FiUser className="w-6 h-6" />
            </Link>
          </div>
        </div>

        {/* Mobil: Geri butonu ve arama çubuğu */}
        <div className="flex md:hidden items-center gap-3 py-3">
          {/* Geri butonu */}
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Zurück"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Logo - Geri butonu gösterilmediğinde göster */}
          {!showBackButton && (
            <Link
              to="/"
              className="flex-shrink-0 flex items-center justify-center"
              aria-label="Ana Sayfa"
            >
              <img
                src="/logo.png"
                alt="Gruner SuperStore"
                className="h-10 w-auto object-contain"
              />
            </Link>
          )}

          {/* Arama çubuğu - beyaz, yuvarlatılmış */}
          <div className="flex-1 relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Produkte suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowResults(true);
                  }
                }}
                className="w-full px-4 py-2 pl-10 pr-4 bg-white text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm border border-gray-300"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </form>

            {/* Arama sonuçları dropdown */}
            {showResults && (
              <div
                ref={resultsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] max-h-96 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500">
                    Suche...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((product) => {
                      const normalizedImages = normalizeImageUrls(product.imageUrls);
                      return (
                        <Link
                          key={product.id}
                          to={`/urun/${product.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchTerm('');
                            setShowResults(false);
                          }}
                          className="block px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                              {normalizedImages && normalizedImages[0] ? (
                                <img
                                  src={normalizedImages[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  Kein Bild
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {product.name}
                              </div>
                              <div className="text-sm text-primary-600 font-semibold">
                                €{parseFloat(product.price).toFixed(2)}
                                {product.unit && (
                                  <span className="text-gray-600 font-normal">
                                    {' '}/ {product.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                    {searchTerm.trim().length >= 2 && (
                      <div
                        onClick={handleSearch}
                        className="px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-center text-primary-600 font-medium border-t border-gray-200"
                      >
                        Alle Ergebnisse anzeigen ({searchTerm})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Keine Ergebnisse gefunden
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop: Arama Çubuğu */}
        <div className="hidden md:block py-3">
          <div className="relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Produkte suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowResults(true);
                  }
                }}
                className="w-full px-4 py-2 pl-10 pr-4 bg-gray-50 text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm border border-gray-200"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </form>

            {/* Arama sonuçları dropdown */}
            {showResults && (
              <div
                ref={resultsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] max-h-96 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500">
                    Suche...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((product) => {
                      const normalizedImages = normalizeImageUrls(product.imageUrls);
                      return (
                        <Link
                          key={product.id}
                          to={`/urun/${product.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchTerm('');
                            setShowResults(false);
                          }}
                          className="block px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                              {normalizedImages && normalizedImages[0] ? (
                                <img
                                  src={normalizedImages[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  Kein Bild
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {product.name}
                              </div>
                              <div className="text-sm text-primary-600 font-semibold">
                                €{parseFloat(product.price).toFixed(2)}
                                {product.unit && (
                                  <span className="text-gray-600 font-normal">
                                    {' '}/ {product.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                    {searchTerm.trim().length >= 2 && (
                      <div
                        onClick={handleSearch}
                        className="px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-center text-primary-600 font-medium border-t border-gray-200"
                      >
                        Alle Ergebnisse anzeigen ({searchTerm})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Keine Ergebnisse gefunden
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
