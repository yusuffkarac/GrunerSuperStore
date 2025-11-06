import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiShoppingCart, FiUser } from 'react-icons/fi';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import productService from '../../services/productService';
import { normalizeImageUrls } from '../../utils/imageUtils';

// Header Componenti - Sticky
function Header() {
  const navigate = useNavigate();
  const itemCount = useCartStore((state) => state.getItemCount());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

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


  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container-mobile">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <h1 className="text-xl font-bold text-primary-700">Gruner</h1>
          </Link>

          {/* Arama (desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full" ref={searchRef}>
              <div className="relative w-full">
                <form onSubmit={handleSearch} className="relative w-full">
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
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                                <div className="text-sm text-primary-700 font-semibold">
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
                          className="px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-center text-primary-700 font-medium border-t border-gray-200"
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

          {/* Sağ menü */}
          <div className="flex items-center gap-4">
            {/* Sepet */}
            <Link
              to="/sepet"
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiShoppingCart className="w-6 h-6 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Kullanıcı */}
            <Link
              to={isAuthenticated ? '/profil' : '/giris'}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiUser className="w-6 h-6 text-gray-700" />
            </Link>
          </div>
        </div>

        {/* Mobil arama */}
        <div className="md:hidden pb-3">
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
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </form>

            {/* Arama sonuçları dropdown (mobil) */}
            {showResults && (
              <div
                ref={resultsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
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
                          onClick={() => {
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
                              <div className="text-sm text-primary-700 font-semibold">
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
                        className="px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-center text-primary-700 font-medium border-t border-gray-200"
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
