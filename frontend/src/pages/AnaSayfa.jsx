import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiChevronRight, FiChevronLeft, FiTag } from 'react-icons/fi';
import { MdLocalShipping, MdCheckCircle, MdCreditCard, MdInventory } from 'react-icons/md';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import settingsService from '../services/settingsService';
import campaignService from '../services/campaignService';
import UrunKarti from '../components/common/UrunKarti';
import Loading from '../components/common/Loading';
import useAuthStore from '../store/authStore';

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
          productService.getProducts({ limit: 8}),
          campaignService.getActiveCampaigns(),
        ]);

        setCategories(categoriesRes.data.categories || []);
        setFeaturedProducts(featuredRes.data.products || []);
        setBestSellers(bestSellersRes.data.products || []);
        setCampaigns(campaignsRes.data.campaigns || []);
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Slider scroll fonksiyonları
  const scrollSlider = (direction) => {
    if (!sliderRef.current) return;

    const scrollAmount = sliderRef.current.offsetWidth * 0.8;
    const newScrollLeft =
      direction === 'left'
        ? sliderRef.current.scrollLeft - scrollAmount
        : sliderRef.current.scrollLeft + scrollAmount;

    sliderRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

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
                onClick={() => navigate('/kayit')}
                className="px-10 py-4 bg-white text-primary-700 rounded-xl font-bold hover:bg-primary-50 hover:scale-105 transition-all duration-300 text-lg shadow-2xl hover:shadow-primary-300/50"
              >
                {hs.hero.registerButton}
              </button>
              <button
                onClick={() => navigate('/giris')}
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
                  onClick={() => navigate('/kayit')}
                  className="px-10 py-4 bg-white text-primary-700 rounded-xl font-bold hover:bg-primary-50 hover:scale-105 transition-all duration-300 text-lg shadow-lg"
                >
                  {hs.cta.registerButton}
                </button>
                <button
                  onClick={() => navigate('/giris')}
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
      {/* Hero Banner / Kategoriler */}
      <section className="relative bg-primary-600 text-white py-6 px-4 mb-0 overflow-hidden">
        {/* Dekoratif arka plan */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container-mobile relative z-10">
          {/* Kategori kartları */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.slice(0, 6).map((category, index) => (
              <Link
                key={category.id}
                to={`/urunler?category=${category.id}`}
                className="group text-center"
              >
                <div className="aspect-square bg-white/20 rounded-xl mb-2 flex items-center justify-center overflow-hidden group-hover:bg-white/30 transition-all">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="w-full h-full object-cover"
                      loading={index < 6 ? "eager" : "lazy"}
                    />
                  ) : (
                    <MdInventory className="text-2xl text-white/80" />
                  )}
                </div>
                <h3 className="font-medium text-center text-xs text-white">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-white">
        <div className="container-mobile py-4">
          {/* Kampanyalar Bölümü */}
          {campaigns.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Kampanyalar</h2>
                <Link
                  to="/kampanyalar"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 group"
                >
                  Tümünü gör
                  <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {campaigns.slice(0, 3).map((campaign, index) => (
                <Link
                  key={campaign.id}
                  to="/kampanyalar"
                  className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  {campaign.imageUrl ? (
                    <div className="relative h-40 bg-gray-200 overflow-hidden">
                      <img
                        src={campaign.imageUrl}
                        alt={campaign.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading={index < 3 ? "eager" : "lazy"}
                      />
                      <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                        <FiTag className="w-3 h-3" />
                        <span>
                          {campaign.type === 'PERCENTAGE' && `%${campaign.discountPercent} Rabatt`}
                          {campaign.type === 'FIXED_AMOUNT' && `€${campaign.discountAmount} Rabatt`}
                          {campaign.type === 'BUY_X_GET_Y' && `${campaign.buyQuantity} Al ${campaign.getQuantity} Öde`}
                          {campaign.type === 'FREE_SHIPPING' && 'Kostenloser Versand'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-40 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                      <FiTag className="w-12 h-12 text-white opacity-50" />
                      <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                        <FiTag className="w-3 h-3" />
                        <span>
                          {campaign.type === 'PERCENTAGE' && `%${campaign.discountPercent} Rabatt`}
                          {campaign.type === 'FIXED_AMOUNT' && `€${campaign.discountAmount} Rabatt`}
                          {campaign.type === 'BUY_X_GET_Y' && `${campaign.buyQuantity} Al ${campaign.getQuantity} Öde`}
                          {campaign.type === 'FREE_SHIPPING' && 'Kostenloser Versand'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{campaign.name}</h3>
                    {campaign.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{campaign.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

          {/* Öne Çıkan Ürünler */}
          {featuredProducts.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Öne Çıkan Ürünler</h2>
                <Link
                  to="/urunler"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 group"
                >
                  Tümünü gör
                  <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {featuredProducts.slice(0, 6).map((product, index) => (
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

          {/* Çok Satanlar */}
          {bestSellers.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Çok Satanlar</h2>
                <Link
                  to="/urunler"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 group"
                >
                  Tümünü gör
                  <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
}

export default AnaSayfa;
