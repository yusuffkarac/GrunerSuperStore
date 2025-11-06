import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { toast } from 'react-toastify';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowRight, FiPackage, FiTag } from 'react-icons/fi';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import campaignService from '../services/campaignService';
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
        onRemove(item.productId, item.variantId);
      }
      setSwipeOffset(0);
    },
    trackMouse: false,
  });

  return (
    <motion.div
      {...handlers}
      style={{ x: swipeOffset }}
      className="relative bg-white rounded-lg shadow-sm mb-2 overflow-hidden"
    >
      {/* Sil butonu arka plan */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center">
        <FiTrash2 className="text-white text-xl" />
      </div>

      {/* Ana içerik */}
      <div className="relative bg-white p-3 flex gap-3">
        {/* Ürün görseli */}
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FiShoppingBag className="text-gray-400 text-xl" />
            </div>
          )}
        </div>

        {/* Ürün bilgileri */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-gray-900 truncate">{item.name}</h3>
          {item.variantName && (
            <p className="text-xs text-purple-600 font-medium mt-0.5">
              {item.variantName}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            {parseFloat(item.price).toFixed(2)} € {item.unit && `/ ${item.unit}`}
          </p>

          {/* Miktar kontrolü */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1, item.variantId)}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Menge verringern"
            >
              <FiMinus className="text-gray-700 text-xs" />
            </button>

            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>

            <button
              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1, item.variantId)}
              disabled={item.quantity >= item.stock}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Menge erhöhen"
            >
              <FiPlus className="text-gray-700 text-xs" />
            </button>
          </div>

          {item.quantity >= item.stock && (
            <p className="text-xs text-amber-600 mt-0.5">Maximaler Bestand erreicht</p>
          )}
        </div>

        {/* Toplam fiyat */}
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-base text-gray-900">
            {(parseFloat(item.price) * item.quantity).toFixed(2)} €
          </p>
          <button
            onClick={() => onRemove(item.productId, item.variantId)}
            className="text-red-500 text-xs mt-1 hover:text-red-700"
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
  const [campaigns, setCampaigns] = useState([]);

  const total = getTotal();
  const itemCount = getItemCount();

  // Kampanya bilgisini çek
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (total > 0) {
        try {
          const response = await campaignService.getActiveCampaigns();
          const activeCampaigns = response.data.campaigns || [];
          // Minimum tutar kontrolü
          const applicableCampaigns = activeCampaigns.filter(c => {
            if (c.minPurchase && parseFloat(c.minPurchase) > total) return false;
            return true;
          });
          setCampaigns(applicableCampaigns);
        } catch (error) {
          console.error('Kampanya yükleme hatası:', error);
        }
      }
    };
    fetchCampaigns();
  }, [total]);

  // Ürün için geçerli kampanyaları filtrele
  const getApplicableCampaignsForItem = (item) => {
    return campaigns.filter((campaign) => {
      // FREE_SHIPPING kampanyaları ürün bazında değil
      if (campaign.type === 'FREE_SHIPPING') return false;

      // Tüm mağazaya uygulanan kampanyalar
      if (campaign.applyToAll) return true;

      // Kategoriye özgü kampanyalar
      if (item.categoryId && campaign.categoryIds) {
        const categoryIds = Array.isArray(campaign.categoryIds) ? campaign.categoryIds : [];
        if (categoryIds.includes(item.categoryId)) return true;
      }

      // Ürüne özgü kampanyalar
      if (campaign.productIds) {
        const productIds = Array.isArray(campaign.productIds) ? campaign.productIds : [];
        if (productIds.includes(item.productId)) return true;
      }

      return false;
    });
  };

  // Tek kampanya için indirim hesapla
  const calculateSingleCampaignDiscount = (price, quantity, campaign) => {
    const { type, discountPercent, discountAmount, buyQuantity, getQuantity, maxDiscount } = campaign;
    let discount = 0;

    switch (type) {
      case 'PERCENTAGE':
        discount = price * (parseFloat(discountPercent) / 100);
        break;

      case 'FIXED_AMOUNT':
        discount = parseFloat(discountAmount);
        discount = Math.min(discount, price);
        break;

      case 'BUY_X_GET_Y':
        // X Al Y Öde kampanyası
        if (quantity >= buyQuantity) {
          const sets = Math.floor(quantity / buyQuantity);
          const freeItems = buyQuantity - getQuantity;
          const totalFreeItems = sets * freeItems;
          discount = totalFreeItems * price;
        }
        break;

      default:
        discount = 0;
    }

    // Max indirim kontrolü
    if (maxDiscount && discount > parseFloat(maxDiscount)) {
      discount = parseFloat(maxDiscount);
    }

    return discount;
  };

  // Kampanya indirimi hesapla
  const calculateDiscount = () => {
    if (campaigns.length === 0 || items.length === 0) return { discount: 0, details: [] };

    let totalDiscount = 0;
    const discountDetails = [];

    // Her ürün için ayrı ayrı indirim hesapla
    items.forEach((item) => {
      const itemPrice = parseFloat(item.price);
      const quantity = parseInt(item.quantity);

      // Bu ürün için geçerli kampanyaları bul
      const applicableCampaigns = getApplicableCampaignsForItem(item);

      if (applicableCampaigns.length === 0) return;

      // En yüksek indirimi veren kampanyayı bul
      let bestDiscount = 0;
      let bestCampaign = null;

      applicableCampaigns.forEach((campaign) => {
        const discount = calculateSingleCampaignDiscount(itemPrice, quantity, campaign);
        if (discount > bestDiscount) {
          bestDiscount = discount;
          bestCampaign = campaign;
        }
      });

      if (bestDiscount > 0 && bestCampaign) {
        totalDiscount += bestDiscount;
        discountDetails.push({
          productName: item.name,
          campaignName: bestCampaign.name,
          discount: bestDiscount,
        });
      }
    });

    return { discount: totalDiscount, details: discountDetails };
  };

  const discountResult = calculateDiscount();
  const discount = discountResult.discount;
  const discountDetails = discountResult.details;
  const finalTotal = total - discount;

  // Miktar güncelleme
  const handleUpdateQuantity = async (productId, newQuantity, variantId = null) => {
    try {
      await updateItemQuantity(productId, newQuantity, variantId);
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Menge');
    }
  };

  // Ürün silme
  const handleRemoveItem = async (productId, variantId = null) => {
    try {
      await removeItem(productId, variantId);
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sepetiniz Boş</h2>
          <p className="text-gray-600 mb-6">Sepetinize ürün ekleyerek başlayın</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Ürünlere Göz At
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-white">
      <div className="container-mobile py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sepetim</h1>
            <p className="text-sm text-gray-600 mt-1">
              {itemCount} {itemCount === 1 ? 'ürün' : 'ürün'}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleClearCart}
              disabled={isClearing}
              className="text-red-500 text-sm hover:text-red-700 disabled:opacity-50"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Sepet item'ları */}
        <AnimatePresence>
          {items.map((item) => (
            <CartItem
              key={`${item.productId}-${item.variantId || 'no-variant'}`}
              item={item}
              onRemove={handleRemoveItem}
              onUpdateQuantity={handleUpdateQuantity}
            />
          ))}
        </AnimatePresence>

        {/* Özet kartı - Normal flow, en alta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-2 shadow-md mt-2 mb-4"
        >
        {/* Toplam */}
        <div className="space-y-1.5 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Ara Toplam</span>
            <span className="text-sm text-gray-900 font-semibold">{total.toFixed(2)} €</span>
          </div>

          {/* Kampanya indirimi */}
          {discount > 0 && discountDetails.length > 0 && (
            <div className="space-y-0.5">
              {discountDetails.map((detail, index) => (
                <div key={index} className="flex items-center justify-between text-red-600">
                  <div className="flex items-center gap-1">
                    <FiTag className="w-3 h-3" />
                    <span className="text-xs">{detail.campaignName}</span>
                  </div>
                  <span className="text-xs font-semibold">-{detail.discount.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}

          {/* Final toplam */}
          <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
            <span className="text-sm text-gray-900 font-bold">Toplam</span>
            <div className="text-right">
              <span className="text-lg font-bold text-primary-600 block">{finalTotal.toFixed(2)} €</span>
              <span className="text-[10px] text-gray-500">Kargo ücreti kasadan hesaplanır</span>
            </div>
          </div>
        </div>

        {/* Checkout butonu */}
        <button
          onClick={handleCheckout}
          className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 text-xs"
        >
          <span>Sipariş Ver</span>
          <FiArrowRight className="w-3 h-3" />
        </button>

        {/* Siparişlerim butonu */}
        <button
          onClick={() => navigate('/siparislerim')}
          className="w-full mt-1.5 border border-gray-300 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-xs"
        >
          <FiPackage className="w-3 h-3" />
          Siparişlerim
        </button>
      </motion.div>
      </div>
    </div>
  );
}

export default Sepet;
