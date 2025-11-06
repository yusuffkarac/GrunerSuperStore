import { useState, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useFavoriteStore from '../../store/favoriteStore';
import useCartStore from '../../store/cartStore';
import { normalizeImageUrls } from '../../utils/imageUtils';

// Ürün Kartı Componenti
const UrunKarti = memo(function UrunKarti({ product }) {
  // product: { id, name, price, imageUrls, stock, unit }
  const [addingToCart, setAddingToCart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Store'dan sadece gerekli değerleri oku - selector pattern
  const favoriteIds = useFavoriteStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const addItem = useCartStore((state) => state.addItem);

  const isProductFavorite = favoriteIds.includes(product.id);
  
  // Image URL'lerini normalize et
  const normalizedImageUrls = normalizeImageUrls(product.imageUrls);

  // Favori toggle handler - useCallback ile memoize et
  const handleToggleFavorite = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

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

    setAddingToCart(true);

    try {
      await addItem(product, 1);
      setJustAdded(true);
      // Görsel geri bildirim yeterli (check işareti ve buton rengi değişiyor), toaster sadece hata durumlarında

      // 2 saniye sonra check işaretini kaldır
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      toast.error('Fehler beim Hinzufügen', {
        position: 'bottom-center',
        autoClose: 2000
      });
    } finally {
      setAddingToCart(false);
    }
  }, [product, addItem]);

  return (
    <div className="card">
      {/* Ürün resmi */}
      <Link to={`/urun/${product.id}`} className="block relative mb-3">
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          {normalizedImageUrls && normalizedImageUrls[0] ? (
            <img
              src={normalizedImageUrls[0]}
              alt={product.name}
              className="w-full h-full object-cover"
              style={{
                transform: 'scale(1)',
                transition: 'transform 0.2s ease-out',
              }}
              onMouseEnter={(e) => {
                if (window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Kein Bild
            </div>
          )}
        </div>

        {/* Favori butonu */}
        <button
          className={`absolute top-2 right-2 p-2 bg-white rounded-full shadow-md flex items-center justify-center ${
            isProductFavorite ? 'text-red-500' : 'text-gray-600'
          }`}
          style={{
            transition: 'background-color 0.15s ease-out, transform 0.15s ease-out',
          }}
          onMouseEnter={(e) => {
            if (window.matchMedia('(hover: hover)').matches) {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
          onClick={handleToggleFavorite}
          aria-label={isProductFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        >
          <FiHeart
            className={`w-4 h-4 ${isProductFavorite ? 'fill-current' : ''}`}
          />
        </button>
      </Link>

      {/* Ürün bilgileri */}
      <Link to={`/urun/${product.id}`}>
        <h3 
          className="font-semibold text-gray-900 mb-1 line-clamp-2"
          style={{
            transition: 'color 0.15s ease-out',
          }}
          onMouseEnter={(e) => {
            if (window.matchMedia('(hover: hover)').matches) {
              e.currentTarget.style.color = '#1e40af';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#111827';
          }}
        >
          {product.name}
        </h3>
        <p className="text-lg font-bold text-primary-700 mb-2">
          €{parseFloat(product.price).toFixed(2)}
          {product.unit && <span className="text-sm text-gray-600"> / {product.unit}</span>}
        </p>
      </Link>

      {/* Stok durumu ve sepete ekle */}
      <div className="flex items-center justify-between mt-3">
        {product.stock > 0 ? (
          <>
            <span className="text-sm text-green-600 font-medium">
              Auf Lager{product.showStock ? ` (${product.stock})` : ''}
            </span>
            <button
              className={`p-2 rounded-lg ${
                justAdded
                  ? 'bg-green-600 text-white'
                  : 'bg-primary-700 text-white'
              }`}
              style={{
                transition: 'background-color 0.15s ease-out, transform 0.1s ease-out',
              }}
              onMouseEnter={(e) => {
                if (!justAdded && !addingToCart && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.backgroundColor = '#1e3a8a';
                }
              }}
              onMouseLeave={(e) => {
                if (!justAdded) {
                  e.currentTarget.style.backgroundColor = '#1e40af';
                }
              }}
              onClick={handleAddToCart}
              disabled={addingToCart || justAdded}
              aria-label="Zum Warenkorb hinzufügen"
            >
              {justAdded ? (
                <FiCheck className="w-5 h-5" />
              ) : (
                <FiShoppingCart className="w-5 h-5" />
              )}
            </button>
          </>
        ) : (
          <span className="text-sm text-red-600 font-medium w-full text-center">
            Nicht verfügbar
          </span>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - sadece product prop'u değiştiğinde re-render
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.stock === nextProps.product.stock &&
    JSON.stringify(prevProps.product.imageUrls) === JSON.stringify(nextProps.product.imageUrls)
  );
});

UrunKarti.displayName = 'UrunKarti';

export default UrunKarti;
