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

          {/* Arama çubuğu - şık tasarım */}
          <div className="flex-1 relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <div className="relative group">
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
                  className="w-full px-4 py-2.5 pl-11 pr-4 bg-white text-gray-900 rounded-full 
                             border border-gray-200 shadow-md
                             transition-all duration-300 ease-in-out
                             focus:outline-none focus:ring-2 focus:ring-primary-500/50 
                             focus:border-primary-500 focus:shadow-lg focus:shadow-primary-500/20
                             hover:border-gray-300 hover:shadow-lg
                             placeholder:text-gray-400"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FiSearch className={`text-gray-400 transition-colors duration-300 ${
                    searchTerm ? 'text-primary-500' : 'group-hover:text-gray-500'
                  }`} />
                </div>
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                  </div>
                )}
                {searchTerm && !isSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setShowResults(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Temizle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            {/* Arama sonuçları dropdown */}
            {showResults && (
              <div
                ref={resultsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] max-h-96 overflow-y-auto
                           backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                    <span>Suche...</span>
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
                          className="block px-4 py-3 hover:bg-gradient-to-r hover:from-primary-50 hover:to-transparent cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                              {normalizedImages && normalizedImages[0] ? (
                                <img
                                  src={normalizedImages[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  Kein Bild
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">
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
                        className="px-4 py-3 bg-gradient-to-r from-primary-50 to-transparent hover:from-primary-100 hover:to-transparent cursor-pointer text-center text-primary-600 font-medium border-t border-gray-200 transition-all duration-200"
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

        {/* Desktop: Arama Çubuğu - şık tasarım */}
        <div className="hidden md:block py-3">
          <div className="relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <div className="relative group">
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
                  className="w-full px-5 py-3 pl-12 pr-12 bg-gradient-to-r from-gray-50 to-white 
                             text-gray-900 rounded-full 
                             border border-gray-200 shadow-lg
                             transition-all duration-300 ease-in-out
                             focus:outline-none focus:ring-2 focus:ring-primary-500/50 
                             focus:border-primary-500 focus:shadow-xl focus:shadow-primary-500/25
                             hover:border-gray-300 hover:shadow-xl hover:from-gray-100 hover:to-white
                             placeholder:text-gray-400 placeholder:font-light"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FiSearch className={`text-gray-400 transition-all duration-300 ${
                    searchTerm ? 'text-primary-500 scale-110' : 'group-hover:text-gray-500 group-hover:scale-105'
                  }`} size={18} />
                </div>
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                  </div>
                )}
                {searchTerm && !isSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setShowResults(false);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Temizle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            {/* Arama sonuçları dropdown */}
            {showResults && (
              <div
                ref={resultsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] max-h-96 overflow-y-auto
                           backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                    <span>Suche...</span>
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
                          className="block px-4 py-3 hover:bg-gradient-to-r hover:from-primary-50 hover:to-transparent cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                              {normalizedImages && normalizedImages[0] ? (
                                <img
                                  src={normalizedImages[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  Kein Bild
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">
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
                        className="px-4 py-3 bg-gradient-to-r from-primary-50 to-transparent hover:from-primary-100 hover:to-transparent cursor-pointer text-center text-primary-600 font-medium border-t border-gray-200 transition-all duration-200"
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
