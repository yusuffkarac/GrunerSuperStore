import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiChevronRight, FiChevronLeft, FiTag, FiPackage, FiTruck, FiClock, FiCheckCircle } from 'react-icons/fi';
import { MdLocalShipping, MdCheckCircle, MdCreditCard, MdInventory } from 'react-icons/md';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import settingsService from '../services/settingsService';
import campaignService from '../services/campaignService';
import orderService from '../services/orderService';
import UrunKarti from '../components/common/UrunKarti';
import Loading from '../components/common/Loading';
import useAuthStore from '../store/authStore';
import { normalizeImageUrl } from '../utils/imageUtils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Ana Sayfa
function AnaSayfa() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [homepageSettings, setHomepageSettings] = useState(null);
  const [canViewProducts, setCanViewProducts] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [showActiveOrderCard, setShowActiveOrderCard] = useState(true);
  const lastScrollY = useRef(0);

  // Default homepage settings
  const defaultHomepageSettings = {
    hero: {
      title: 'Willkommen bei Grüner SuperStore',
      titleHighlight: 'Grüner SuperStore',
      subtitle: 'Ihr vertrauenswürdiger Online-Supermarkt für frische Produkte',
      registerButton: 'Jetzt registrieren',
      loginButton: 'Anmelden',
    },
    features: {
      title: 'Warum Grüner SuperStore?',
      subtitle: 'Wir bieten Ihnen die beste Einkaufserfahrung mit frischen Produkten und schnellem Service',
      items: [
        {
          title: 'Schnelle Lieferung',
          description: 'Lieferung am selben Tag verfügbar. Ihre Bestellung kommt frisch und schnell zu Ihnen nach Hause.',
        },
        {
          title: 'Frische Garantie',
          description: '100% frische Produkte garantiert. Wir wählen nur die besten Produkte für Sie aus.',
        },
        {
          title: 'Sichere Zahlung',
          description: 'Alle gängigen Zahlungsmethoden werden akzeptiert. Ihre Daten sind bei uns sicher.',
        },
      ],
    },
    howItWorks: {
      title: "So funktioniert's",
      subtitle: 'In nur 4 einfachen Schritten zu Ihren frischen Produkten',
      steps: [
        {
          title: 'Registrieren',
          description: 'Erstellen Sie Ihr kostenloses Konto in wenigen Sekunden',
        },
        {
          title: 'Produkte wählen',
          description: 'Durchsuchen Sie unsere große Auswahl an frischen Produkten',
        },
        {
          title: 'Bestellen',
          description: 'Legen Sie Produkte in den Warenkorb und bestellen Sie',
        },
        {
          title: 'Genießen',
          description: 'Erhalten Sie Ihre Bestellung schnell und bequem zu Hause',
        },
      ],
    },
    cta: {
      title: 'Bereit, mit dem Einkaufen zu beginnen?',
      subtitle: 'Registrieren Sie sich jetzt und entdecken Sie unsere große Auswahl an frischen Produkten',
      registerButton: 'Jetzt registrieren',
      loginButton: 'Bereits Mitglied? Anmelden',
    },
  };

  const sliderRef = useRef(null);
  const campaignSliderRef = useRef(null);
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0);
  
  // Touch/swipe için state'ler
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const minSwipeDistance = 50; // Minimum kaydırma mesafesi (px)

  // Verileri yükle
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // Önce settings'i kontrol et
        const settingsRes = await settingsService.getSettings();
        const appSettings = settingsRes.data.settings;
        setSettings(appSettings);

        // Homepage settings'i yükle
        if (appSettings.homepageSettings) {
          setHomepageSettings({
            ...defaultHomepageSettings,
            ...appSettings.homepageSettings,
          });
        } else {
          setHomepageSettings(defaultHomepageSettings);
        }

        // Kullanıcı login değilse ve ayar kapalıysa, verileri çekme
        if (!isAuthenticated && !appSettings.guestCanViewProducts) {
          setCanViewProducts(false);
          setLoading(false);
          return;
        }

        setCanViewProducts(true);

        // Paralel olarak tüm verileri çek
        const [categoriesRes, featuredRes, bestSellersRes, campaignsRes] = await Promise.all([
          categoryService.getCategories(),
          productService.getFeaturedProducts(10),
          productService.getBestSellers(8),
          campaignService.getActiveCampaigns(),
        ]);

        setCategories(categoriesRes.data.categories || []);
        setFeaturedProducts(featuredRes.data.products || []);
        setBestSellers(bestSellersRes.data.products || []);
        const loadedCampaigns = campaignsRes.data.campaigns || [];
        setCampaigns(loadedCampaigns);
        
        // Debug: Kampanya görsellerini kontrol et
        // (log kaldırıldı)
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Aktif siparişi yükle
  useEffect(() => {
    const fetchActiveOrder = async () => {
      if (!isAuthenticated) {
        setActiveOrder(null);
        return;
      }

      try {
        // Tüm siparişleri çek (aktif olanı bulmak için)
        const response = await orderService.getOrders({ 
          limit: 10,
          page: 1 
        });
        
        const orders = response.data?.orders || [];
        // Aktif sipariş: pending, accepted, preparing, shipped durumlarında olanlar
        const activeStatuses = ['pending', 'accepted', 'preparing', 'shipped'];
        // En son aktif siparişi bul (zaten createdAt desc sıralı)
        const active = orders.find(order => activeStatuses.includes(order.status));
        
        setActiveOrder(active || null);
      } catch (error) {
        console.error('Fehler beim Laden der aktiven Bestellung:', error);
        setActiveOrder(null);
      }
    };

    fetchActiveOrder();
  }, [isAuthenticated]);

  // Scroll takibi - aşağı kaydırınca kartı gizle
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Aşağı kaydırma (scroll pozisyonu artıyorsa)
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowActiveOrderCard(false);
      } 
      // Yukarı kaydırma (scroll pozisyonu azalıyorsa)
      else if (currentScrollY < lastScrollY.current) {
        setShowActiveOrderCard(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Slider scroll fonksiyonları
  const scrollSlider = (direction) => {
    if (!sliderRef.current) return;

    const cardWidth = 160; // md:w-[160px]
    const gap = 16; // gap-4 = 16px
    const scrollAmount = cardWidth + gap;
    const newScrollLeft =
      direction === 'left'
        ? sliderRef.current.scrollLeft - scrollAmount
        : sliderRef.current.scrollLeft + scrollAmount;

    sliderRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  // Touch/swipe handler fonksiyonları
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && campaigns.length > 0) {
      // Sola kaydırma - sonraki kampanya
      setCurrentCampaignIndex((prev) => (prev + 1) % campaigns.length);
    } else if (isRightSwipe && campaigns.length > 0) {
      // Sağa kaydırma - önceki kampanya
      setCurrentCampaignIndex((prev) => (prev - 1 + campaigns.length) % campaigns.length);
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Kampanya otomatik döndürme
  useEffect(() => {
    if (campaigns.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentCampaignIndex((prev) => (prev + 1) % campaigns.length);
    }, 3000); // 3 saniye

    return () => clearInterval(interval);
  }, [campaigns.length]);

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

  if (loading) {
    return <Loading />;
  }

  // Eğer guest göremiyorsa ve login değilse - Tanıtım sayfası göster
  if (!canViewProducts || !homepageSettings) {
    const hs = homepageSettings || defaultHomepageSettings;
    return (
      <div className="pb-20 bg-gradient-to-b from-white to-gray-50">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20 md:py-28 px-4 overflow-hidden">
          {/* Dekoratif arka plan elemanları */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-300 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container-mobile text-center relative z-10">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
              {hs.hero.title.includes(hs.hero.titleHighlight) ? (
                <>
                  {hs.hero.title.split(hs.hero.titleHighlight)[0]}
                  <br />
                  <span className="text-primary-200">{hs.hero.titleHighlight}</span>
                </>
              ) : (
                hs.hero.title
              )}
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-primary-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              {hs.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate('/registrieren')}
                className="px-10 py-4 bg-white text-primary-700 rounded-xl font-bold hover:bg-primary-50 hover:scale-105 transition-all duration-300 text-lg shadow-2xl hover:shadow-primary-300/50"
              >
                {hs.hero.registerButton}
              </button>
              <button
                onClick={() => navigate('/anmelden')}
                className="px-10 py-4 bg-transparent text-white border-2 border-white/80 rounded-xl font-bold hover:bg-white/10 hover:border-white transition-all duration-300 text-lg backdrop-blur-sm"
              >
                {hs.hero.loginButton}
              </button>
            </div>
          </div>
        </section>

        <div className="container-mobile">
          {/* Özellikler */}
          <section className="py-16 md:py-20">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
              {hs.features.title}
            </h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              {hs.features.subtitle}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {hs.features.items.map((item, index) => {
                const icons = [
                  <MdLocalShipping key="shipping" className="text-5xl text-red-600" />,
                  <MdCheckCircle key="check" className="text-5xl text-green-600" />,
                  <MdCreditCard key="card" className="text-5xl text-purple-600" />,
                ];
                const bgColors = [
                  'from-red-100 to-red-200',
                  'from-green-100 to-green-200',
                  'from-purple-100 to-purple-200',
                ];
                return (
                  <div key={index} className="group text-center p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200 hover:-translate-y-2">
                    <div className={`w-24 h-24 bg-gradient-to-br ${bgColors[index]} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      {icons[index]}
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Wie es funktioniert */}
          <section className="py-16 md:py-20 bg-gradient-to-br from-gray-50 to-white rounded-3xl -mx-4 px-4 md:px-8 md:mx-0">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
              {hs.howItWorks.title}
            </h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              {hs.howItWorks.subtitle}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {hs.howItWorks.steps.map((step, index) => (
                <div key={index} className="text-center group">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl font-bold shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 md:py-20 text-center">
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl p-10 md:p-16 text-white shadow-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {hs.cta.title}
              </h2>
              <p className="text-lg md:text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
                {hs.cta.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/registrieren')}
                  className="px-10 py-4 bg-white text-primary-700 rounded-xl font-bold hover:bg-primary-50 hover:scale-105 transition-all duration-300 text-lg shadow-lg"
                >
                  {hs.cta.registerButton}
                </button>
                <button
                  onClick={() => navigate('/anmelden')}
                  className="px-10 py-4 bg-transparent text-white border-2 border-white/80 rounded-xl font-bold hover:bg-white/10 transition-all duration-300 text-lg"
                >
                  {hs.cta.loginButton}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-white">
      {/* Kampanyalar Bölümü - Üstte */}
      {campaigns.length > 0 && (
        <section className="bg-white py-4 md:py-6 border-b border-gray-100">
          <div className="container-mobile">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Kampagnen</h2>
              <Link
                to="/kampagnen"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 group"
              >
                Alle anzeigen
                <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Otomatik dönen kampanya banner - Tek satır */}
            <div 
              className="relative overflow-hidden rounded-2xl"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                ref={campaignSliderRef}
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentCampaignIndex * 100}%)` }}
              >
                {campaigns.map((campaign, index) => {
                  const normalizedImageUrl = campaign.imageUrl ? normalizeImageUrl(campaign.imageUrl) : null;
                  return (
                    <Link
                      key={campaign.id}
                      to={`/produkte?campaign=${campaign.id}`}
                      className="block w-full flex-shrink-0 group"
                    >
                      <div className="relative bg-gradient-to-br  to-primary-100 rounded-2xl overflow-hidden border border-primary-200 hover:shadow-lg transition-shadow">
                        {normalizedImageUrl ? (
                          <div className="relative h-48 md:h-64 bg-gray-200 overflow-hidden">
                            <img
                              src={normalizedImageUrl}
                              alt={campaign.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading={index === 0 ? "eager" : "lazy"}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                const parent = e.target.parentElement;
                                if (parent && !parent.querySelector('.fallback-icon')) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'h-full w-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center fallback-icon';
                                  fallback.innerHTML = '<svg class="w-16 h-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>';
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                            {/* Daha şeffaf overlay - görseli kapatmasın */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/40 to-transparent pointer-events-none"></div>
                          </div>
                        ) : (
                          <div className="h-48 md:h-64 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                            <FiTag className="w-16 h-16 text-white opacity-50" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4 md:top-6 md:left-6 right-4 md:right-6 z-10">
                          {/* <div className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm md:text-base font-bold shadow-lg inline-flex items-center gap-2 mb-3">
                            <FiTag className="w-4 h-4" />
                            <span>
                              {campaign.type === 'PERCENTAGE' && `%${campaign.discountPercent} Rabatt`}
                              {campaign.type === 'FIXED_AMOUNT' && `€${campaign.discountAmount} Rabatt`}
                              {campaign.type === 'BUY_X_GET_Y' && `${campaign.buyQuantity} kaufen ${campaign.getQuantity} zahlen`}
                              {campaign.type === 'FREE_SHIPPING' && 'Kostenloser Versand'}
                            </span>
                          </div> */}
                          {/* <h3 className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-lg">
                            {campaign.name}
                          </h3> */}
                          {/* {campaign.description && (
                            <p className="text-white/90 text-sm md:text-base drop-shadow-md line-clamp-2">
                              {campaign.description}
                            </p>
                          )} */}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* İndikatör noktaları */}
              {campaigns.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {campaigns.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentCampaignIndex(index);
                      }}
                      style={{ minWidth: '12px', minHeight: '12px' }}
                      className={`rounded-full transition-all duration-300 ${
                        index === currentCampaignIndex
                          ? 'bg-white'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Kampanya ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Kategoriler Bölümü - Altta Grid */}
      {categories.length > 0 && (
        <section className="bg-white py-6 md:py-8">
          <div className="container-mobile">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Kategorien</h2>

            {/* Kategori kartları - Grid düzeni */}
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
              {categories.map((category, index) => (
                <Link
                  key={category.id}
                  to={`/produkte?category=${category.id}`}
                  className="group text-center"
                >
                  <div className="bg-white rounded-xl p-0 md:p-4 hover:bg-gray-50 transition-all duration-200 border border-gray-100 hover:border-primary-200 hover:shadow-md h-full flex flex-col">
                    {/* Kategori görseli - Sabit boyut */}
                    <div className="w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-2 md:mb-3 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-full h-full object-cover"
                          loading={index < 12 ? "eager" : "lazy"}
                        />
                      ) : (
                        <MdInventory className="text-2xl md:text-3xl text-gray-300 group-hover:text-primary-400 transition-colors" />
                      )}
                    </div>
                    {/* Kategori adı - Daha geniş alan */}
                    <h3 className="font-medium text-xs md:text-sm text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 min-h-[3rem] md:min-h-[3.5rem] flex items-center justify-center px-1 pb-2 leading-tight">
                      {category.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="bg-white">
        <div className="container-mobile py-4">
          {/* Öne Çıkan Ürünler */}
          {featuredProducts.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Empfohlene Produkte</h2>
                <Link
                  to="/produkte"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 group"
                >
                  Alle anzeigen
                  <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {featuredProducts.slice(0, 10).map((product, index) => (
                  <UrunKarti 
                    key={product.id} 
                    product={product} 
                    campaign={getCampaignForProduct(product)}
                    priority={index < 10} // İlk 6 ürün için eager loading
                  />
                ))}
              </div>
            </section>
          )}

          {/* Çok Satanlar */}
          {bestSellers.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Bestseller</h2>
                <Link
                  to="/produkte"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 group"
                >
                  Alle anzeigen
                  <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {bestSellers.slice(0, 6).map((product, index) => (
                  <UrunKarti 
                    key={product.id} 
                    product={product} 
                    campaign={getCampaignForProduct(product)}
                    priority={index < 6} // İlk 6 ürün için eager loading
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Aktif Sipariş Kartı - Bottom menünün hemen üstünde */}
      {activeOrder && (
        <Link
          to={`/bestellung/${activeOrder.id}`}
          className={`fixed bottom-20 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-md z-[999998] transition-transform duration-300 ${
            showActiveOrderCard ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
          style={{ 
            bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 1rem)' 
          }}
        >
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3">
              {/* Durum ikonu */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                activeOrder.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                activeOrder.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
                activeOrder.status === 'preparing' ? 'bg-purple-100 text-purple-600' :
                activeOrder.status === 'shipped' ? 'bg-indigo-100 text-indigo-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {activeOrder.status === 'pending' ? <FiClock className="w-5 h-5" /> :
                 activeOrder.status === 'accepted' ? <FiCheckCircle className="w-5 h-5" /> :
                 activeOrder.status === 'preparing' ? <FiPackage className="w-5 h-5" /> :
                 activeOrder.status === 'shipped' ? (activeOrder.type === 'pickup' ? <FiCheckCircle className="w-5 h-5" /> : <FiTruck className="w-5 h-5" />) :
                 <FiPackage className="w-5 h-5" />}
              </div>

              {/* Sipariş bilgileri */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">
                    Bestellung #{activeOrder.orderNo}
                  </p>
                  <p className="text-sm font-bold text-primary-600 whitespace-nowrap flex-shrink-0">
                    {activeOrder.total ? parseFloat(activeOrder.total).toFixed(2) : '0.00'} €
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    {activeOrder.orderItems?.length || 0} {activeOrder.orderItems?.length === 1 ? 'Produkt' : 'Produkte'}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    activeOrder.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    activeOrder.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                    activeOrder.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                    activeOrder.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activeOrder.status === 'pending' ? 'Ausstehend' :
                     activeOrder.status === 'accepted' ? 'Akzeptiert' :
                     activeOrder.status === 'preparing' ? 'In Vorbereitung' :
                     activeOrder.status === 'shipped' ? (activeOrder.type === 'pickup' ? 'Bereit' : 'Unterwegs') :
                     'Unbekannt'}
                  </span>
                </div>
              </div>

              {/* Ok ikonu */}
              <div className="flex-shrink-0">
                <FiChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}

export default AnaSayfa;
