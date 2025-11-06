import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiMinus, FiPlus, FiCheck, FiArrowLeft, FiChevronLeft, FiChevronRight, FiTag } from 'react-icons/fi';
import { toast } from 'react-toastify';
import productService from '../services/productService';
import campaignService from '../services/campaignService';
import useFavoriteStore from '../store/favoriteStore';
import useCartStore from '../store/cartStore';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import { normalizeImageUrls } from '../utils/imageUtils';

// Ürün Detay Sayfası
function UrunDetay() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isRippleActive, setIsRippleActive] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);

  // Store'lar
  const favoriteIds = useFavoriteStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const addItem = useCartStore((state) => state.addItem);

  const isProductFavorite = favoriteIds.includes(id);

  // Ürün verilerini yükle
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await productService.getProductById(id);
        const productData = response.data.product;
        setProduct(productData);

        // Kampanya bilgisini çek
        try {
          const campaignResponse = await campaignService.getApplicableCampaigns({
            productId: id,
            categoryId: productData.categoryId,
          });
          const campaigns = campaignResponse.data.campaigns || [];
          // En yüksek öncelikli kampanyayı seç
          if (campaigns.length > 0) {
            setCampaign(campaigns[0]);
          }
        } catch (campaignErr) {
          console.error('Kampanya yükleme hatası:', campaignErr);
          // Kampanya hatası ürün görünümünü etkilemesin
        }
      } catch (err) {
        setError(err.message || 'Ürün yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Favori ID'lerini yükle
  useEffect(() => {
    const loadFavoriteIds = async () => {
      try {
        await useFavoriteStore.getState().loadFavoriteIds();
      } catch (err) {
        console.error('Favori ID yükleme hatası:', err);
      }
    };
    loadFavoriteIds();
  }, []);

  // Seçili varyantı bul
  useEffect(() => {
    if (!product?.variants || !product?.variantOptions) return;

    // Tüm varyant seçenekleri seçilmiş mi kontrol et
    const allOptionsSelected = product.variantOptions.every(
      (option) => selectedVariantOptions[option.id] !== undefined && selectedVariantOptions[option.id] !== null && selectedVariantOptions[option.id] !== ''
    );

    if (allOptionsSelected && product.variantOptions.length > 0) {
      // Seçilen varyantı bul
      const matchingVariant = product.variants.find((variant) => {
        if (!variant.values || variant.values.length === 0) return false;
        
        return product.variantOptions.every((option) => {
          const selectedValue = selectedVariantOptions[option.id];
          if (!selectedValue) return false;
          const variantValue = variant.values.find((v) => v.optionId === option.id);
          return variantValue && variantValue.value === selectedValue;
        });
      });

      setSelectedVariant(matchingVariant || null);
    } else {
      setSelectedVariant(null);
    }
  }, [product, selectedVariantOptions]);

  // Varyant seçeneği değiştiğinde görseli güncelle
  useEffect(() => {
    if (selectedVariant && selectedVariant.imageUrls && Array.isArray(selectedVariant.imageUrls) && selectedVariant.imageUrls.length > 0) {
      setSelectedImageIndex(0);
    }
  }, [selectedVariant]);

  // Miktar artır
  const increaseQuantity = useCallback(() => {
    const availableStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0);
    if (product && quantity < availableStock) {
      setQuantity((prev) => prev + 1);
    }
  }, [product, quantity, selectedVariant]);

  // Miktar azalt
  const decreaseQuantity = useCallback(() => {
    setQuantity((prev) => Math.max(1, prev - 1));
  }, []);

  // Favori toggle
  const handleToggleFavorite = useCallback(async () => {
    // Heart beat animasyonu
    setIsHeartAnimating(true);
    setTimeout(() => setIsHeartAnimating(false), 600);

    try {
      await toggleFavorite(id);
    } catch (err) {
      toast.error('Fehler bei Favoriten', {
        position: 'bottom-center',
        autoClose: 2000,
      });
    }
  }, [id, toggleFavorite]);

  // Varyant seçeneği değiştir
  const handleVariantOptionChange = useCallback((optionId, value) => {
    setSelectedVariantOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }));
    setQuantity(1); // Varyant değiştiğinde miktarı sıfırla
  }, []);

  // Sepete ekle
  const handleAddToCart = useCallback(async () => {
    const availableStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0);
    if (!product || availableStock <= 0) return;

    // Varyantlı ürünlerde tüm seçenekler seçilmeli
    if (product.variantOptions && product.variantOptions.length > 0) {
      const allSelected = product.variantOptions.every(
        (option) => selectedVariantOptions[option.id] !== undefined && selectedVariantOptions[option.id] !== null && selectedVariantOptions[option.id] !== ''
      );
      if (!allSelected) {
        toast.error('Bitte wählen Sie alle Varianten aus', {
          position: 'bottom-center',
          autoClose: 2000,
        });
        return;
      }
      if (!selectedVariant) {
        toast.error('Bitte wählen Sie alle Varianten aus', {
          position: 'bottom-center',
          autoClose: 2000,
        });
        return;
      }
    }

    // Ripple efekti
    setIsRippleActive(true);
    setTimeout(() => setIsRippleActive(false), 600);
    setAddingToCart(true);

    try {
      const variantId = selectedVariant ? selectedVariant.id : null;
      await addItem(product, quantity, variantId);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (err) {
      toast.error('Fehler beim Hinzufügen', {
        position: 'bottom-center',
        autoClose: 2000,
      });
    } finally {
      setAddingToCart(false);
    }
  }, [product, quantity, selectedVariant, selectedVariantOptions, addItem]);

  // Görselleri hazırla ve normalize et (varyant varsa varyant görsellerini kullan)
  const images = selectedVariant && selectedVariant.imageUrls && Array.isArray(selectedVariant.imageUrls) && selectedVariant.imageUrls.length > 0
    ? normalizeImageUrls(selectedVariant.imageUrls)
    : (product?.imageUrls ? normalizeImageUrls(product.imageUrls) : []);

  // Fiyat: varyant varsa varyant fiyatını, yoksa ürün fiyatını kullan
  const displayPrice = selectedVariant ? parseFloat(selectedVariant.price) : parseFloat(product?.price || 0);

  // Kampanya fiyatı hesaplama
  const calculateDiscountedPrice = () => {
    if (!campaign) return null;

    let discountPerUnit = 0;

    switch (campaign.type) {
      case 'PERCENTAGE':
        discountPerUnit = displayPrice * (parseFloat(campaign.discountPercent) / 100);
        break;
      case 'FIXED_AMOUNT':
        discountPerUnit = parseFloat(campaign.discountAmount);
        break;
      case 'BUY_X_GET_Y':
        // X Al Y Öde kampanyası için ortalama indirim
        if (quantity >= campaign.buyQuantity) {
          const sets = Math.floor(quantity / campaign.buyQuantity);
          const freeItems = campaign.buyQuantity - campaign.getQuantity;
          const totalFreeItems = sets * freeItems;
          const totalDiscount = totalFreeItems * displayPrice;
          discountPerUnit = totalDiscount / quantity; // Ortalama indirim per ürün
        }
        break;
      default:
        discountPerUnit = 0;
    }

    const discountedPrice = displayPrice - discountPerUnit;
    return Math.max(0, discountedPrice);
  };

  const discountedPrice = campaign ? calculateDiscountedPrice() : null;
  const finalPrice = discountedPrice !== null ? discountedPrice : displayPrice;

  // Stok: varyant varsa varyant stokunu, yoksa ürün stokunu kullan
  const availableStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0);

  // Görsel değiştir
  const changeImage = useCallback((index) => {
    setSelectedImageIndex(index);
  }, []);

  // Önceki görsel
  const prevImage = useCallback(() => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  // Sonraki görsel
  const nextImage = useCallback(() => {
    setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Loading state
  if (loading) {
    return (
      <div className="container-mobile py-6">
        <Loading text="Produkt wird geladen..." />
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="container-mobile py-6">
        <ErrorMessage
          message={error || 'Produkt nicht gefunden'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container-mobile py-4 pb-24 lg:pb-6">
      {/* Geri butonu */}
      <Link
        to="/urunler"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4 lg:mb-6"
      >
        <FiArrowLeft className="w-4 h-4" />
        <span>Zurück zu Produkten</span>
      </Link>

      {/* Desktop: İki sütunlu grid, Mobile: Tek sütun */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        {/* Ürün görselleri */}
        <div className="mb-6 lg:mb-0 flex flex-col items-center lg:items-start">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-3 w-full max-w-[350px] aspect-square lg:max-w-none lg:max-h-none lg:w-full">
            {images.length > 0 ? (
              <>
                <img
                  src={images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                
                {/* Görsel navigasyon butonları (birden fazla görsel varsa) */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 p-2 lg:p-3 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
                      aria-label="Vorheriges Bild"
                    >
                      <FiChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 p-2 lg:p-3 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
                      aria-label="Nächstes Bild"
                    >
                      <FiChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700" />
                    </button>
                  </>
                )}

                {/* Favori butonu */}
                <button
                  onClick={handleToggleFavorite}
                  className={`absolute top-2 lg:top-4 right-2 lg:right-4 p-2 lg:p-3 rounded-full shadow-md transition-colors btn-press ${
                    isProductFavorite
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-600'
                  }`}
                  aria-label={
                    isProductFavorite
                      ? 'Aus Favoriten entfernen'
                      : 'Zu Favoriten hinzufügen'
                  }
                >
                  <FiHeart
                    className={`w-4 h-4 lg:w-5 lg:h-5 transition-all duration-300 ${
                      isProductFavorite ? 'fill-current animate-heart-fill' : ''
                    } ${isHeartAnimating ? 'animate-heart-beat' : ''}`}
                  />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 min-h-[350px] lg:min-h-[400px]">
                <span className="text-sm lg:text-base">Kein Bild</span>
              </div>
            )}
          </div>

          {/* Thumbnail görselleri (birden fazla görsel varsa) */}
          {images.length > 1 && (
            <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-1 justify-center lg:justify-start w-full">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => changeImage(index)}
                  className={`flex-shrink-0 w-12 h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImageIndex === index
                      ? 'border-primary-700'
                      : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ürün bilgileri */}
        <div className="mb-6 lg:mb-0">
          {/* Kategori */}
          {product.category && (
            <Link
              to={`/urunler?category=${product.category.id}`}
              className="inline-block text-xs lg:text-sm text-primary-700 hover:text-primary-800 mb-2 lg:mb-3"
            >
              {product.category.name}
            </Link>
          )}

          {/* Ürün adı */}
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 lg:mb-3 leading-tight">{product.name}</h1>

          {/* Marka */}
          {product.brand && (
            <p className="text-sm lg:text-sm text-gray-600 mb-3 lg:mb-4">{product.brand}</p>
          )}

          {/* Varyant Seçenekleri */}
          {product.variantOptions && product.variantOptions.length > 0 && (
            <div className="mb-4 lg:mb-5 space-y-3">
              {product.variantOptions.map((option) => {
                // Bu seçenek için mevcut değerleri bul
                const availableValues = product.variants
                  ?.flatMap((v) => v.values || [])
                  .filter((v) => v.optionId === option.id)
                  .map((v) => v.value)
                  .filter((v, i, arr) => arr.indexOf(v) === i) || [];

                return (
                  <div key={option.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {option.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableValues.map((value) => {
                        const isSelected = selectedVariantOptions[option.id] === value;
                        // Bu değerin mevcut olup olmadığını kontrol et
                        const isAvailable = product.variants?.some((variant) => {
                          if (!variant.isActive || variant.stock <= 0) return false;
                          const hasThisValue = variant.values?.some(
                            (v) => v.optionId === option.id && v.value === value
                          );
                          if (!hasThisValue) return false;
                          // Diğer seçilen seçeneklerle uyumlu mu kontrol et
                          return product.variantOptions.every((opt) => {
                            if (opt.id === option.id) return true;
                            const selectedValue = selectedVariantOptions[opt.id];
                            if (!selectedValue) return true; // Henüz seçilmemiş
                            return variant.values?.some(
                              (v) => v.optionId === opt.id && v.value === selectedValue
                            );
                          });
                        });

                        return (
                          <button
                            key={value}
                            onClick={() => handleVariantOptionChange(option.id, value)}
                            disabled={!isAvailable}
                            className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                              isSelected
                                ? 'border-green-600 bg-green-50 text-green-700'
                                : isAvailable
                                ? 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fiyat */}
          <div className="mb-4 lg:mb-5">
            {campaign && discountedPrice !== null ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-3xl lg:text-4xl font-bold text-red-600">
                    €{discountedPrice.toFixed(2)}
                  </span>
                  <span className="text-xl lg:text-xl text-gray-500 line-through">
                    €{displayPrice.toFixed(2)}
                  </span>
                </div>
                {product.unit && (
                  <span className="text-base lg:text-base text-gray-600">/ {product.unit}</span>
                )}
              </div>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl lg:text-4xl font-bold text-primary-600">
                  €{displayPrice.toFixed(2)}
                </span>
                {product.unit && (
                  <span className="text-base lg:text-base text-gray-600">/ {product.unit}</span>
                )}
              </div>
            )}
          </div>

          {/* Kampanya bilgisi */}
          {campaign && 
           campaign.name && 
           campaign.name.toLowerCase() !== 'test' && 
           campaign.name.trim() !== '' && (
            <div className="mb-4 lg:mb-5 bg-red-50 border border-red-200 rounded-lg p-3 lg:p-4">
              <div className="flex items-start gap-2">
                <FiTag className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-red-900 mb-1 truncate">{campaign.name}</p>
                  {campaign.description && 
                   campaign.description.toLowerCase() !== 'asdasdsa' && 
                   campaign.description.trim() !== '' && (
                    <p className="text-sm text-red-800 break-words">{campaign.description}</p>
                  )}
                  {campaign.endDate && (
                    <p className="text-xs text-red-700 mt-2">
                      Gültig bis: {new Date(campaign.endDate).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stok durumu */}
          <div className="mb-4 lg:mb-6">
            {availableStock > 0 ? (
              <span className="inline-block px-4 py-1.5 lg:px-4 lg:py-1.5 bg-green-100 text-green-700 rounded-full text-sm lg:text-sm font-medium">
                Auf Lager{product.showStock ? ` (${availableStock} verfügbar)` : ''}
              </span>
            ) : (
              <span className="inline-block px-4 py-1.5 lg:px-4 lg:py-1.5 bg-red-100 text-red-700 rounded-full text-sm lg:text-sm font-medium">
                Nicht verfügbar
              </span>
            )}
          </div>

          {/* Desktop: Sepete ekle kartı */}
          {availableStock > 0 && (
            <div className="hidden lg:block bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                {/* Miktar kontrolü */}
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg bg-white">
                  <button
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Menge verringern"
                  >
                    <FiMinus className="w-5 h-5 text-gray-700" />
                  </button>

                  <span className="w-12 text-center font-medium text-lg">
                    {quantity}
                  </span>

                  <button
                    onClick={increaseQuantity}
                    disabled={quantity >= availableStock}
                    className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Menge erhöhen"
                  >
                    <FiPlus className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                {/* Toplam fiyat */}
                <div className="flex-1 text-right">
                  <span className="text-sm text-gray-600">Gesamt: </span>
                  <span className="text-xl font-bold text-gray-900">
                    €{(finalPrice * quantity).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Sepete ekle butonu */}
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || justAdded}
                className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg text-base font-medium transition-colors ${
                  justAdded
                    ? 'bg-green-600 text-white'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {justAdded ? (
                  <>
                    <FiCheck className="w-5 h-5" />
                    <span>Hinzugefügt</span>
                  </>
                ) : (
                  <>
                    <FiShoppingCart className="w-5 h-5" />
                    <span>
                      {addingToCart ? 'Wird hinzugefügt...' : 'Zum Warenkorb hinzufügen'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Açıklama */}
          {product.description && (
            <div className="mb-6 lg:mb-0">
              <h2 className="text-lg lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-3">
                Beschreibung
              </h2>
              <p className="text-base lg:text-base text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Miktar ve sepete ekle (fixed bottom) */}
      {availableStock > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg lg:hidden" style={{ zIndex: 999998 }}>
          <div className="container-mobile">
            <div className="flex items-center gap-2">
              {/* Miktar kontrolü */}
              <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg bg-white">
                <button
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Menge verringern"
                >
                  <FiMinus className="w-5 h-5 text-gray-700" />
                </button>

                <span className="w-12 text-center font-medium text-lg">
                  {quantity}
                </span>

                <button
                  onClick={increaseQuantity}
                  disabled={quantity >= availableStock}
                  className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Menge erhöhen"
                >
                  <FiPlus className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Sepete ekle butonu */}
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || justAdded}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all min-w-0 btn-press ripple-effect ${
                  justAdded
                    ? 'bg-green-600 text-white animate-cart-add-success'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                } ${isRippleActive ? 'active' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {justAdded ? (
                  <>
                    <FiCheck className="w-5 h-5 flex-shrink-0 animate-success-check" />
                    <span className="truncate">Hinzugefügt</span>
                  </>
                ) : (
                  <>
                    <FiShoppingCart className={`w-5 h-5 flex-shrink-0 transition-transform ${isRippleActive ? 'animate-cart-bounce' : ''}`} />
                    <span className="truncate">
                      {addingToCart ? 'Wird hinzugefügt...' : 'Zum Warenkorb'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Toplam fiyat */}
            <div className="mt-2 text-center">
              <span className="text-sm text-gray-600">Gesamt: </span>
              <span className="text-lg font-bold text-gray-900">
                €{(finalPrice * quantity).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stok yoksa mesaj */}
      {availableStock <= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 lg:p-4 text-center">
          <p className="text-red-800 text-sm lg:text-base font-medium">
            Dieses Produkt ist derzeit nicht verfügbar
          </p>
        </div>
      )}
    </div>
  );
}

export default UrunDetay;
