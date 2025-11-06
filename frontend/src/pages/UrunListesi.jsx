import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiSearch, FiGrid, FiList, FiFilter, FiX } from 'react-icons/fi';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import settingsService from '../services/settingsService';
import campaignService from '../services/campaignService';
import UrunKarti from '../components/common/UrunKarti';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import useAuthStore from '../store/authStore';

// Ürün Listesi Sayfası
function UrunListesi() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canViewProducts, setCanViewProducts] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [viewMode, setViewMode] = useState('grid'); // grid veya list
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  // Ayarları kontrol et
  useEffect(() => {
    const checkSettings = async () => {
      try {
        const settingsRes = await settingsService.getSettings();
        const appSettings = settingsRes.data.settings;

        // Kullanıcı login değilse ve ayar kapalıysa
        if (!isAuthenticated && !appSettings.guestCanViewProducts) {
          setCanViewProducts(false);
        } else {
          setCanViewProducts(true);
        }
      } catch (err) {
        console.error('Ayarlar yükleme hatası:', err);
      }
    };

    checkSettings();
  }, [isAuthenticated]);

  // Kategorileri ve kampanyaları yükle
  useEffect(() => {
    if (!canViewProducts) return;

    const fetchCategoriesAndCampaigns = async () => {
      try {
        const [categoriesRes, campaignsRes] = await Promise.all([
          categoryService.getCategories(),
          campaignService.getActiveCampaigns(),
        ]);
        setCategories(categoriesRes.data.categories || []);
        setCampaigns(campaignsRes.data.campaigns || []);
      } catch (err) {
        console.error('Kategori/Kampanya yükleme hatası:', err);
      }
    };

    fetchCategoriesAndCampaigns();
  }, [canViewProducts]);

  // Ürünleri yükle
  useEffect(() => {
    if (!canViewProducts) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = {
          page: currentPage,
          limit: itemsPerPage,
        };

        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.categoryId = selectedCategory;

        const response = await productService.getProducts(params);

        setProducts(response.data.products || []);
        setTotalPages(response.data.totalPages || 1);
      } catch (err) {
        setError(err.message || 'Ürünler yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, searchQuery, selectedCategory, canViewProducts]);

  // Debounced search - kullanıcı yazmayı bıraktıktan 500ms sonra ara
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        setSearchParams({ search: searchQuery });
      } else {
        setSearchParams({});
      }
      setCurrentPage(1); // Yeni arama yapıldığında sayfa 1'e dön
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, setSearchParams]);

  // Ürün için geçerli kampanyayı bul
  const getCampaignForProduct = (product) => {
    if (!campaigns || campaigns.length === 0) return null;

    // Ürüne uygulanabilir kampanyaları filtrele
    const applicableCampaigns = campaigns.filter((campaign) => {
      // FREE_SHIPPING kampanyaları ürün kartında gösterilmez
      if (campaign.type === 'FREE_SHIPPING') return false;

      // Tüm mağazaya uygulanan kampanyalar
      if (campaign.applyToAll) return true;

      // Kategoriye özgü kampanyalar
      if (product.categoryId && campaign.categoryIds) {
        const categoryIds = Array.isArray(campaign.categoryIds)
          ? campaign.categoryIds
          : [];
        if (categoryIds.includes(product.categoryId)) return true;
      }

      // Ürüne özgü kampanyalar
      if (campaign.productIds) {
        const productIds = Array.isArray(campaign.productIds)
          ? campaign.productIds
          : [];
        if (productIds.includes(product.id)) return true;
      }

      return false;
    });

    // En yüksek öncelikli kampanyayı döndür
    return applicableCampaigns.length > 0 ? applicableCampaigns[0] : null;
  };

  // Kategori değişikliği
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);

    if (categoryId) {
      setSearchParams({ category: categoryId });
    } else {
      setSearchParams({});
    }
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setCurrentPage(1);
    setSearchParams({});
  };

  // Aktif filtre sayısı
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedCategory) count++;
    return count;
  }, [searchQuery, selectedCategory]);

  // Eğer guest göremiyorsa
  if (!canViewProducts) {
    return (
      <div className="container-mobile py-4 pb-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Anmeldung erforderlich
            </h2>
            <p className="text-gray-600 mb-6">
              Um Produkte und Kategorien anzusehen, müssen Sie sich anmelden.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/giris')}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Anmelden
              </button>
              <button
                onClick={() => navigate('/kayit')}
                className="px-6 py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Registrieren
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile py-4 pb-20">
      {/* Header - Arama ve görünüm toggle */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Produkte</h1>

        {/* Arama çubuğu */}
        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Produkte suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filtre ve görünüm butonları */}
        <div className="flex items-center justify-between gap-3">
          {/* Filtre butonu */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-700 text-white border-primary-700'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            <FiFilter className="w-5 h-5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-primary-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Görünüm toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-700 text-white border-primary-700'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              aria-label="Grid-Ansicht"
            >
              <FiGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-700 text-white border-primary-700'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              aria-label="Listen-Ansicht"
            >
              <FiList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtre paneli */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filter</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-700 hover:underline flex items-center gap-1"
              >
                <FiX className="w-4 h-4" />
                Alle löschen
              </button>
            )}
          </div>

          {/* Kategori filtresi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorie
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === ''
                    ? 'bg-primary-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alle
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id.toString())}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id.toString()
                      ? 'bg-primary-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && <Loading />}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && products.length === 0 && (
        <EmptyState
          title="Keine Produkte gefunden"
          message="Versuchen Sie, andere Filter zu verwenden"
        />
      )}

      {/* Ürün listesi */}
      {!loading && !error && products.length > 0 && (
        <>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                : 'flex flex-col gap-4'
            }
          >
            {products.map((product, index) => (
              <UrunKarti
                key={product.id}
                product={product}
                campaign={getCampaignForProduct(product)}
                priority={index < 8} // İlk 8 ürün için eager loading
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Zurück
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Sadece geçerli sayfa etrafındaki sayfaları göster
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg ${
                          currentPage === page
                            ? 'bg-primary-700 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page}>...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Weiter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UrunListesi;
