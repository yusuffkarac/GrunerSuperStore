import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiFilter, FiX, FiTag } from 'react-icons/fi';
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
  const [selectedCampaign, setSelectedCampaign] = useState(searchParams.get('campaign') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || '');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || '');

  // URL parametrelerinden kampanya değerini oku
  useEffect(() => {
    const urlCampaign = searchParams.get('campaign') || '';
    setSelectedCampaign(urlCampaign);
  }, [searchParams]);

  // URL parametrelerinden sıralama değerlerini oku
  useEffect(() => {
    const urlSortBy = searchParams.get('sortBy') || '';
    const urlSortOrder = searchParams.get('sortOrder') || '';
    setSortBy(urlSortBy);
    setSortOrder(urlSortOrder);
  }, [searchParams]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 24; // 12'den 24'e artırıldı

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
        if (selectedCampaign) params.campaignId = selectedCampaign;
        if (sortBy) params.sortBy = sortBy;
        if (sortOrder) params.sortOrder = sortOrder;

        const response = await productService.getProducts(params);

        setProducts(response.data.products || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalProducts(response.data.pagination?.total || 0);
      } catch (err) {
        setError(err.message || 'Fehler beim Laden der Produkte');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, searchQuery, selectedCategory, selectedCampaign, sortBy, sortOrder, canViewProducts]);

  // Debounced search - kullanıcı yazmayı bıraktıktan 500ms sonra ara
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParams = Object.fromEntries(searchParams);
      
      if (searchQuery) {
        setSearchParams({ ...currentParams, search: searchQuery });
      } else {
        // Sadece search parametresini kaldır, diğerlerini koru
        const { search, ...restParams } = currentParams;
        setSearchParams(restParams);
      }
      setCurrentPage(1); // Yeni arama yapıldığında sayfa 1'e dön
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, setSearchParams, searchParams]);

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

    const currentParams = Object.fromEntries(searchParams);
    
    if (categoryId) {
      setSearchParams({ ...currentParams, category: categoryId });
    } else {
      // Sadece category parametresini kaldır, diğerlerini koru
      const { category, ...restParams } = currentParams;
      setSearchParams(restParams);
    }
  };

  // Sıralama handler'ı
  const handleSort = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setShowSort(false);
    setCurrentPage(1);
    
    const newParams = { ...Object.fromEntries(searchParams) };
    if (newSortBy) {
      newParams.sortBy = newSortBy;
      newParams.sortOrder = newSortOrder;
    } else {
      delete newParams.sortBy;
      delete newParams.sortOrder;
    }
    setSearchParams(newParams);
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedCampaign('');
    setSortBy('');
    setSortOrder('');
    setCurrentPage(1);
    setSearchParams({});
  };

  // Aktif filtre sayısı
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedCategory) count++;
    if (selectedCampaign) count++;
    if (sortBy) count++;
    return count;
  }, [searchQuery, selectedCategory, selectedCampaign, sortBy]);

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

  // Seçili kategorideki ürün sayısını hesapla
  const getCategoryProductCount = (categoryId) => {
    if (!categoryId) {
      // Tümü seçiliyse, toplam aktif ürün sayısını göster
      return totalProducts;
    }
    // Kategori seçiliyse, o kategorideki aktif ürün sayısını göster
    const category = categories.find((c) => c.id === categoryId.toString());
    return category?._count?.products || 0;
  };

  // Seçili kampanyayı bul
  const selectedCampaignData = campaigns.find((c) => c.id === selectedCampaign);

  return (
    <div className="pb-20 bg-white pt-0">
      {/* Kampanya Filtresi Aktifken Bilgi Banner'ı */}
      {selectedCampaign && selectedCampaignData && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4">
          <div className="container-mobile">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiTag className="w-5 h-5" />
                <div>
                  <p className="font-semibold">{selectedCampaignData.name}</p>
                  {selectedCampaignData.description && (
                    <p className="text-sm text-white/90">{selectedCampaignData.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCampaign('');
                  const currentParams = Object.fromEntries(searchParams);
                  const { campaign, ...restParams } = currentParams;
                  setSearchParams(restParams);
                  setCurrentPage(1);
                }}
                className="text-white hover:text-white/80 transition-colors"
                aria-label="Kampanya filtresini kaldır"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtreleme/Sıralama Bar */}
      <div className="bg-white border-b border-primary-600  top-[73px] md:top-[105px] z-40">
        <div className="container-mobile">
          <div className="flex items-center">
            {/* Filtrele butonu */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'text-primary-600 font-medium'
                  : 'text-gray-600'
              }`}
            >
              <FiFilter className="w-5 h-5" />
              <span>Filtern</span>
            </button>

            {/* Ayırıcı çizgi */}
            <div className="w-px h-6 bg-gray-300"></div>

            {/* Sırala butonu */}
            <button
              onClick={() => setShowSort(!showSort)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors ${
                showSort || sortBy
                  ? 'text-primary-600 font-medium'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>Sortieren</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kategori Pill'leri */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide">
          <div className="container-mobile">
            <div className="flex gap-2 py-3">
              <button
                onClick={() => handleCategoryChange('')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === ''
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                Alle ({totalProducts})
              </button>
              {categories.map((category) => {
                const count = getCategoryProductCount(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id.toString())}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === category.id.toString()
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {category.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filtre paneli */}
      {showFilters && (
        <div className="container-mobile py-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filter</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                >
                  <FiX className="w-4 h-4" />
                  Zurücksetzen
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
                      ? 'bg-primary-600 text-white'
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
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sıralama paneli */}
      {showSort && (
        <div className="container-mobile py-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Sortieren</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleSort('price', 'asc')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  sortBy === 'price' && sortOrder === 'asc'
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                Preis: Niedrig bis Hoch
              </button>
              <button
                onClick={() => handleSort('price', 'desc')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  sortBy === 'price' && sortOrder === 'desc'
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                Preis: Hoch bis Niedrig
              </button>
              <button
                onClick={() => handleSort('name', 'asc')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  sortBy === 'name' && sortOrder === 'asc'
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                Name: A-Z
              </button>
              <button
                onClick={() => handleSort('name', 'desc')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  sortBy === 'name' && sortOrder === 'desc'
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                Name: Z-A
              </button>
              {(sortBy || sortOrder) && (
                <button
                  onClick={() => handleSort('', '')}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-500 text-sm border-t border-gray-200 pt-2 mt-2"
                >
                  Sortierung entfernen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="container-mobile py-8">
          <Loading />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="container-mobile py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && products.length === 0 && (
        <div className="container-mobile py-8">
          <EmptyState
            title="Keine Produkte gefunden"
            message="Versuchen Sie es mit anderen Filtern"
          />
        </div>
      )}

      {/* Ürün listesi */}
      {!loading && !error && products.length > 0 && (
        <>
          <div className="container-mobile py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {products.map((product, index) => (
                <UrunKarti
                  key={product.id}
                  product={product}
                  campaign={getCampaignForProduct(product)}
                  priority={index < 8} // İlk 8 ürün için eager loading
                />
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="container-mobile py-4">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Geri
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
                              ? 'bg-primary-600 text-white'
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
                  İleri
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UrunListesi;
