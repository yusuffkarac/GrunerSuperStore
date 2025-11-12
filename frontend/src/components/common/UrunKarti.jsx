import { useState, memo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiPlus, FiCheck, FiTag } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useFavoriteStore from '../../store/favoriteStore';
import useCartStore from '../../store/cartStore';
import { normalizeImageUrls } from '../../utils/imageUtils';

// Ürün Kartı Componenti
const UrunKarti = memo(function UrunKarti({ product, campaign, priority = false }) {
  // product: { id, name, price, imageUrls, stock, unit }
  // campaign: { type, discountPercent, discountAmount, ... } (opsiyonel)
  // priority: İlk görünür görseller için true (eager loading)
  const [addingToCart, setAddingToCart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const imgRef = useRef(null);

  // Store'dan sadece gerekli değerleri oku - selector pattern
  const favoriteIds = useFavoriteStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const addItem = useCartStore((state) => state.addItem);

  const isProductFavorite = favoriteIds.includes(product.id);

  // Image URL'lerini normalize et
  const normalizedImageUrls = normalizeImageUrls(product.imageUrls);

  // Resim zaten yüklenmişse (cache'den geliyorsa) onLoad tetiklenmeyebilir
  // Bu durumu kontrol et
  useEffect(() => {
    // Resim URL'i değiştiğinde state'i sıfırla
    setImageLoaded(false);
    setImageError(false);

    // Kısa bir gecikme ile resmin yüklenip yüklenmediğini kontrol et
    // (DOM'a eklenmesi için zaman tanı)
    const checkImageLoaded = () => {
      if (imgRef.current && normalizedImageUrls && normalizedImageUrls[0]) {
        // Resim zaten yüklenmişse (complete property true ise)
        if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
          setImageLoaded(true);
          setImageError(false);
        }
      }
    };

    // DOM'a eklenmesi için kısa bir gecikme
    const timeoutId = setTimeout(checkImageLoaded, 0);
    
    return () => clearTimeout(timeoutId);
  }, [normalizedImageUrls?.[0]]);

  // Kampanya hesaplaması
  const calculateDiscountedPrice = () => {
    if (!campaign) return null;

    const price = parseFloat(product.price);
    let discountedPrice = price;

    switch (campaign.type) {
      case 'PERCENTAGE':
        discountedPrice = price * (1 - parseFloat(campaign.discountPercent) / 100);
        break;
      case 'FIXED_AMOUNT':
        discountedPrice = price - parseFloat(campaign.discountAmount);
        break;
      default:
        discountedPrice = price;
    }

    return Math.max(0, discountedPrice);
  };

  const discountedPrice = campaign ? calculateDiscountedPrice() : null;

  // Kampanya badge metni
  const getCampaignBadge = () => {
    if (!campaign) return null;

    switch (campaign.type) {
      case 'PERCENTAGE':
        return `-${Math.round(campaign.discountPercent)}%`;
      case 'FIXED_AMOUNT':
        return 'Rabatt';
      case 'BUY_X_GET_Y':
        return `${campaign.buyQuantity} für ${campaign.getQuantity}`;
      case 'FREE_SHIPPING':
        return 'Gratis Versand';
      default:
        return 'Aktion';
    }
  };

  // Favori toggle handler - useCallback ile memoize et
  const handleToggleFavorite = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Heart beat animasyonu
    setIsHeartAnimating(true);
    setTimeout(() => setIsHeartAnimating(false), 600);

    try {
      await toggleFavorite(product.id);
      // Görsel geri bildirim yeterli (kalp rengi değişiyor), toaster sadece hata durumlarında
    } catch (error) {
      // Sadece hata durumlarında toaster göster
      toast.error('Fehler bei Favoriten', {
        position: 'bottom-center',
        autoClose: 2000
      });
    }
  }, [product.id, toggleFavorite]);

  // Sepete ekle handler - useCallback ile memoize et
  const handleAddToCart = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stock <= 0) return;

    // Tıklama animasyonu
    setIsAnimating(true);
    setAddingToCart(true);

    try {
      await addItem(product, 1);
      setJustAdded(true);
      // Görsel geri bildirim yeterli (check işareti ve buton rengi değişiyor), toaster sadece hata durumlarında

      // 2 saniye sonra check işaretini kaldır
      setTimeout(() => {
        setJustAdded(false);
        setIsAnimating(false);
      }, 2000);
    } catch (error) {
      setIsAnimating(false);
      toast.error('Fehler beim Hinzufügen', {
        position: 'bottom-center',
        autoClose: 2000
      });
    } finally {
      setAddingToCart(false);
    }
  }, [product, addItem]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-2 md:p-3 relative">
      {/* Ürün resmi */}
      <Link to={`/urun/${product.id}`} className="block relative mb-2">
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
          {normalizedImageUrls && normalizedImageUrls[0] ? (
            <>
              {/* Loading placeholder */}
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-gray-300 border-t-primary-600 rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* Görsel */}
              <img
                ref={imgRef}
                src={normalizedImageUrls[0]}
                alt={product.name}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
              />
              
              {/* Hata durumu */}
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100">
                  <div className="text-center">
                    <div className="text-2xl mb-1">📷</div>
                    <div className="text-xs">Kein Bild</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Kein Bild
            </div>
          )}
        </div>

        {/* Kampanya badge */}
        {campaign && (
          <div className="absolute top-2 left-2 bg-red-600 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg text-[10px] md:text-xs font-bold shadow-lg flex items-center gap-1 z-10">
            <FiTag className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span>{getCampaignBadge()}</span>
          </div>
        )}

        {/* Sepete ekle butonu - Sağ üstte, yuvarlak, yeşil */}
        {product.stock > 0 && (
          <button
            className={`absolute top-2 right-2 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-md transition-all btn-press ${
              justAdded
                ? 'bg-green-600 text-white animate-cart-add-success'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            } ${isAnimating && !justAdded ? 'animate-cart-bounce' : ''}`}
            onClick={handleAddToCart}
            disabled={addingToCart || justAdded}
            aria-label="Zum Warenkorb hinzufügen"
          >
            {justAdded ? (
              <FiCheck className="w-4 h-4 md:w-5 md:h-5 animate-success-check" />
            ) : (
              <FiPlus className={`w-4 h-4 md:w-5 md:h-5 transition-transform ${isAnimating ? 'animate-cart-bounce' : ''}`} />
            )}
          </button>
        )}

        {/* Favori butonu - Sol altta, yuvarlak, beyaz */}
        <button
          className={`absolute bottom-2 left-2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-md flex items-center justify-center transition-all btn-press ${
            isProductFavorite ? 'text-red-500' : 'text-gray-600'
          }`}
          onClick={handleToggleFavorite}
          aria-label={isProductFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        >
          <FiHeart
            className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${
              isProductFavorite ? 'fill-current animate-heart-fill' : ''
            } ${isHeartAnimating ? 'animate-heart-beat' : ''}`}
          />
        </button>
      </Link>

      {/* Ürün bilgileri */}
      <Link to={`/urun/${product.id}`}>
        {/* Fiyat - Yeşil renkte */}
        <div className="mb-1">
          {campaign && discountedPrice !== null ? (
            <div className="flex items-center gap-2">
              <p className="text-base md:text-lg font-bold text-primary-600">
                €{discountedPrice.toFixed(2)}
              </p>
              <p className="text-xs md:text-sm text-gray-500 line-through">
                €{parseFloat(product.price).toFixed(2)}
              </p>
            </div>
          ) : (
            <p className="text-base md:text-lg font-bold text-primary-600">
              €{parseFloat(product.price).toFixed(2)}
              {product.unit && <span className="text-xs md:text-sm text-gray-500 font-normal"> / {product.unit}</span>}
            </p>
          )}
        </div>

        {/* Ürün adı */}
        <h3 className="text-xs md:text-sm text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
      </Link>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - sadece product prop'u değiştiğinde re-render
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.stock === nextProps.product.stock &&
    JSON.stringify(prevProps.product.imageUrls) === JSON.stringify(nextProps.product.imageUrls) &&
    prevProps.priority === nextProps.priority
  );
});

UrunKarti.displayName = 'UrunKarti';

export default UrunKarti;
