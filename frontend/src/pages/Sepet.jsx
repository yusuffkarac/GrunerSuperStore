import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { toast } from 'react-toastify';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowRight } from 'react-icons/fi';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { useAlert } from '../contexts/AlertContext';

// Sepet Item Component
function CartItem({ item, onRemove, onUpdateQuantity }) {
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Sol swipe için
      if (eventData.deltaX < 0) {
        setSwipeOffset(Math.max(eventData.deltaX, -100));
      }
    },
    onSwiped: (eventData) => {
      if (eventData.deltaX < -50) {
        onRemove(item.productId);
      }
      setSwipeOffset(0);
    },
    trackMouse: false,
  });

  return (
    <motion.div
      {...handlers}
      style={{ x: swipeOffset }}
      className="relative bg-white rounded-lg shadow-sm mb-3 overflow-hidden"
    >
      {/* Sil butonu arka plan */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center">
        <FiTrash2 className="text-white text-xl" />
      </div>

      {/* Ana içerik */}
      <div className="relative bg-white p-4 flex gap-4">
        {/* Ürün görseli */}
        <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FiShoppingBag className="text-gray-400 text-2xl" />
            </div>
          )}
        </div>

        {/* Ürün bilgileri */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {parseFloat(item.price).toFixed(2)} € {item.unit && `/ ${item.unit}`}
          </p>

          {/* Miktar kontrolü */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Menge verringern"
            >
              <FiMinus className="text-gray-700" />
            </button>

            <span className="w-12 text-center font-medium">{item.quantity}</span>

            <button
              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
              disabled={item.quantity >= item.stock}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Menge erhöhen"
            >
              <FiPlus className="text-gray-700" />
            </button>
          </div>

          {item.quantity >= item.stock && (
            <p className="text-xs text-amber-600 mt-1">Maximaler Bestand erreicht</p>
          )}
        </div>

        {/* Toplam fiyat */}
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-lg text-gray-900">
            {(parseFloat(item.price) * item.quantity).toFixed(2)} €
          </p>
          <button
            onClick={() => onRemove(item.productId)}
            className="text-red-500 text-sm mt-2 hover:text-red-700"
          >
            Entfernen
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Ana Sepet Sayfası
function Sepet() {
  const navigate = useNavigate();
  const { items, loading, getTotal, getItemCount, updateItemQuantity, removeItem, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { showConfirm } = useAlert();
  const [isClearing, setIsClearing] = useState(false);

  const total = getTotal();
  const itemCount = getItemCount();

  // Miktar güncelleme
  const handleUpdateQuantity = async (productId, newQuantity) => {
    try {
      await updateItemQuantity(productId, newQuantity);
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Menge');
    }
  };

  // Ürün silme
  const handleRemoveItem = async (productId) => {
    try {
      await removeItem(productId);
      toast.success('Produkt entfernt');
    } catch (error) {
      toast.error('Fehler beim Entfernen des Produkts');
    }
  };

  // Sepeti temizle
  const handleClearCart = async () => {
    const confirmed = await showConfirm('Möchten Sie wirklich alle Produkte aus dem Warenkorb entfernen?');
    if (confirmed) {
      setIsClearing(true);
      try {
        await clearCart();
        toast.success('Warenkorb geleert');
      } catch (error) {
        toast.error('Fehler beim Leeren des Warenkorbs');
      } finally {
        setIsClearing(false);
      }
    }
  };

  // Sipariş verme sayfasına git
  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.info('Bitte melden Sie sich an, um fortzufahren');
      navigate('/giris', { state: { from: '/sepet' } });
      return;
    }
    navigate('/siparis-ver');
  };

  // Loading state
  if (loading) {
    return (
      <div className="container-mobile py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32 mb-3"></div>
          ))}
        </div>
      </div>
    );
  }

  // Boş sepet
  if (items.length === 0) {
    return (
      <div className="container-mobile py-6 min-h-[60vh] flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <FiShoppingBag className="text-gray-400 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ihr Warenkorb ist leer</h2>
          <p className="text-gray-600 mb-6">Fügen Sie Produkte hinzu, um zu beginnen</p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Produkte durchsuchen
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container-mobile py-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warenkorb</h1>
          <p className="text-sm text-gray-600 mt-1">
            {itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearCart}
            disabled={isClearing}
            className="text-red-500 text-sm hover:text-red-700 disabled:opacity-50"
          >
            Alle löschen
          </button>
        )}
      </div>

      {/* Sepet item'ları */}
      <AnimatePresence>
        {items.map((item) => (
          <CartItem
            key={item.productId}
            item={item}
            onRemove={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
          />
        ))}
      </AnimatePresence>

      {/* Özet kartı - Fixed bottom */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg max-w-[600px] mx-auto"
      >
        {/* Toplam */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">Zwischensumme</span>
          <span className="text-2xl font-bold text-gray-900">{total.toFixed(2)} €</span>
        </div>

        {/* Checkout butonu */}
        <button
          onClick={handleCheckout}
          className="w-full bg-green-600 text-white py-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <span>Zur Kasse gehen</span>
          <FiArrowRight />
        </button>

        <p className="text-xs text-gray-500 text-center mt-2">
          Versandkosten werden an der Kasse berechnet
        </p>
      </motion.div>
    </div>
  );
}

export default Sepet;
