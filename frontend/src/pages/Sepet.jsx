import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { toast } from 'react-toastify';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowRight, FiPackage, FiTag, FiHeart, FiTruck, FiX } from 'react-icons/fi';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import useFavoriteStore from '../store/favoriteStore';
import campaignService from '../services/campaignService';
import settingsService from '../services/settingsService';
import { useAlert } from '../contexts/AlertContext';
import { normalizeImageUrl } from '../utils/imageUtils';

// Sepet Item Component
function CartItem({ item, onRemove, onUpdateQuantity }) {
  const navigate = useNavigate();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  
  // Favorite store
  const favoriteIds = useFavoriteStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const isProductFavorite = favoriteIds.includes(item.productId);

  // İlk kaydırmada ipucu göster
  useEffect(() => {
    if (Math.abs(swipeOffset) > 5 && !showHint) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2000);
    }
  }, [swipeOffset, showHint]);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Sol swipe için (silme)
      if (eventData.deltaX < 0 && swipeOffset <= 0) {
        const newOffset = Math.max(eventData.deltaX, -100);
        setSwipeOffset(newOffset);
      }
      // Sağ swipe için (favorilere ekleme)
      else if (eventData.deltaX > 0 && swipeOffset >= 0) {
        const newOffset = Math.min(eventData.deltaX, 100);
        setSwipeOffset(newOffset);
      }
      // Geri getirme - zaten kaydırılmışsa
      else if (eventData.deltaX > 0 && swipeOffset < 0) {
        const newOffset = Math.min(0, swipeOffset + eventData.deltaX * 0.5);
        setSwipeOffset(newOffset);
      }
      else if (eventData.deltaX < 0 && swipeOffset > 0) {
        const newOffset = Math.max(0, swipeOffset + eventData.deltaX * 0.5);
        setSwipeOffset(newOffset);
      }
    },
    onSwiped: async (eventData) => {
      // Sol swipe - Silme eşiği: -70px
      if (eventData.deltaX < -70) {
        try {
          await onRemove(item.productId, item.variantId);
          setHasError(false);
        } catch (error) {
          setHasError(true);
          setTimeout(() => setHasError(false), 500);
          setSwipeOffset(0);
        }
      }
      // Sağ swipe - Favorilere ekleme eşiği: +70px
      else if (eventData.deltaX > 70) {
        try {
          setIsHeartAnimating(true);
          setTimeout(() => setIsHeartAnimating(false), 600);
          const wasFavorite = isProductFavorite;
          await toggleFavorite(item.productId);
          toast.success(wasFavorite ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt', {
            position: 'bottom-center',
            autoClose: 2000,
          });
          setSwipeOffset(0);
        } catch (error) {
          toast.error('Fehler bei Favoriten', {
            position: 'bottom-center',
            autoClose: 2000,
          });
          setSwipeOffset(0);
        }
      } else {
        // Eşik altındaysa geri getir
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    preventDefaultTouchmoveEvent: false,
    delta: 5,
  });

  // Silme butonuna tıklama
  const handleDeleteClick = async () => {
    try {
      await onRemove(item.productId, item.variantId);
      setHasError(false);
      setSwipeOffset(0);
    } catch (error) {
      setHasError(true);
      setTimeout(() => setHasError(false), 500);
    }
  };

  // Favori butonuna tıklama
  const handleFavoriteClick = async () => {
    try {
      setIsHeartAnimating(true);
      setTimeout(() => setIsHeartAnimating(false), 600);
      const wasFavorite = isProductFavorite;
      await toggleFavorite(item.productId);
      toast.success(wasFavorite ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt', {
        position: 'bottom-center',
        autoClose: 2000,
      });
      setSwipeOffset(0);
    } catch (error) {
      toast.error('Fehler bei Favoriten', {
        position: 'bottom-center',
        autoClose: 2000,
      });
      setSwipeOffset(0);
    }
  };

  // Ürün detay sayfasına git
  const handleProductClick = (e) => {
    // Swipe işlemi varsa veya butonlara tıklanmışsa navigate etme
    if (Math.abs(swipeOffset) > 5) {
      return;
    }
    // Butonlara tıklanmışsa navigate etme
    if (e.target.closest('button') || e.target.closest('.btn-press')) {
      return;
    }
    navigate(`/urun/${item.productId}`);
  };

  return (
    <div
      className={`relative bg-white rounded-lg shadow-sm mb-2 overflow-hidden ${
        hasError ? 'animate-shake' : ''
      }`}
    >
      {/* Favori butonu arka plan - Sol tarafta, sağa kaydırınca görünür */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-pink-500 to-red-500 flex flex-col items-center justify-center gap-1.5 shadow-xl transition-all duration-300"
        style={{
          opacity: swipeOffset > 5 ? Math.min(swipeOffset / 100, 1) : 0,
          transform: `translateX(${swipeOffset <= 0 ? -100 : -100 + swipeOffset}px)`,
          pointerEvents: swipeOffset > 5 ? 'auto' : 'none',
          zIndex: 10
        }}
        onClick={handleFavoriteClick}
      >
        <div className={`flex flex-col items-center justify-center gap-1 ${swipeOffset > 70 ? 'scale-110' : ''} transition-transform duration-200`}>
          <FiHeart className={`text-white text-2xl ${swipeOffset > 70 ? 'animate-pulse' : ''} ${isProductFavorite ? 'fill-current' : ''} ${isHeartAnimating ? 'animate-heart-beat' : ''}`} />
          <span className="text-white text-xs font-bold">
            {isProductFavorite ? 'Entfernen' : 'Favorit'}
          </span>
          {swipeOffset > 70 && (
            <span className="text-white text-[10px] font-medium animate-pulse">Loslassen</span>
          )}
        </div>
      </div>

      {/* Sil butonu arka plan - Sağ tarafta, sola kaydırınca görünür */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-r from-red-500 to-red-600 flex flex-col items-center justify-center gap-1.5 shadow-xl transition-all duration-300"
        style={{
          opacity: Math.abs(swipeOffset) > 5 && swipeOffset < 0 ? Math.min(Math.abs(swipeOffset) / 100, 1) : 0,
          transform: `translateX(${swipeOffset >= 0 ? 100 : 100 + swipeOffset}px)`,
          pointerEvents: Math.abs(swipeOffset) > 5 && swipeOffset < 0 ? 'auto' : 'none',
          zIndex: 10
        }}
        onClick={handleDeleteClick}
      >
        <div className={`flex flex-col items-center justify-center gap-1 ${Math.abs(swipeOffset) > 70 && swipeOffset < 0 ? 'scale-110' : ''} transition-transform duration-200`}>
          <FiTrash2 className={`text-white text-2xl ${Math.abs(swipeOffset) > 70 && swipeOffset < 0 ? 'animate-pulse' : ''}`} />
          <span className="text-white text-xs font-bold">Löschen</span>
          {Math.abs(swipeOffset) > 70 && swipeOffset < 0 && (
            <span className="text-white text-[10px] font-medium animate-pulse">Loslassen</span>
          )}
        </div>
      </div>
      
      {/* Swipe ipucu - İlk kaydırmada göster */}
      {/* {showHint && Math.abs(swipeOffset) > 5 && Math.abs(swipeOffset) < 70 && (
        <div className="absolute right-32 top-1/2 transform -translate-y-1/2 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg z-50 animate-pulse flex items-center gap-1.5 whitespace-nowrap">
          <FiTrash2 className="w-3.5 h-3.5" />
          <span>← Zum Löschen ziehen</span>
        </div>
      )} */}
      
      {/* Silme eşiği göstergesi
      {Math.abs(swipeOffset) > 50 && Math.abs(swipeOffset) < 70 && (
        <div className="absolute left-1/2 top-2 transform -translate-x-1/2 bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-medium shadow-md z-40">
          Weiter ziehen...
        </div>
      )} */}

      {/* Ana içerik - Swipe ile hareket eder */}
      <motion.div
        {...handlers}
        className="relative bg-white p-3 flex gap-3 cursor-pointer"
        animate={{ x: swipeOffset }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        onClick={handleProductClick}
      >
        {/* Ürün görseli */}
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
          {item.imageUrl ? (
            <img
              src={normalizeImageUrl(item.imageUrl)}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (parent && !parent.querySelector('.fallback-icon')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex items-center justify-center fallback-icon';
                  fallback.innerHTML = '<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                  parent.appendChild(fallback);
                }
              }}
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
          <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setIsAnimating(true);
                onUpdateQuantity(item.productId, item.quantity - 1, item.variantId);
                setTimeout(() => setIsAnimating(false), 400);
              }}
              className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors btn-press ${
                isAnimating ? 'animate-button-bounce' : ''
              }`}
              aria-label="Menge verringern"
            >
              <FiMinus className="text-gray-700 text-xs" />
            </button>

            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>

            <button
              onClick={() => {
                setIsAnimating(true);
                onUpdateQuantity(item.productId, item.quantity + 1, item.variantId);
                setTimeout(() => setIsAnimating(false), 400);
              }}
              disabled={item.quantity >= item.stock}
              className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-press ${
                isAnimating ? 'animate-button-bounce' : ''
              }`}
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
        <div className="text-right flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <p className="font-bold text-base text-gray-900">
            {(parseFloat(item.price) * item.quantity).toFixed(2)} €
          </p>
          <button
            onClick={() => onRemove(item.productId, item.variantId)}
            className="text-red-500 mt-1 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors"
            aria-label="Entfernen"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Ana Sepet Sayfası
function Sepet() {
  const navigate = useNavigate();
  const { items, loading, getTotal, getItemCount, updateItemQuantity, removeItem, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { showConfirm } = useAlert();
  const [isClearing, setIsClearing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [applicableCampaigns, setApplicableCampaigns] = useState([]);

  const total = getTotal();
  const itemCount = getItemCount();

  // Settings bilgisini çek
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsService.getSettings();
        setSettings(response?.data?.settings || null);
      } catch (error) {
        console.error('Settings yükleme hatası:', error);
      }
    };
    fetchSettings();
  }, []);

  // Tüm uygun kampanyaları bul
  const getAllApplicableCampaigns = () => {
    if (campaigns.length === 0 || items.length === 0) return [];

    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);

    const applicableCampaigns = [];

    // Global kampanyalar
    campaigns.filter(c => c.applyToAll).forEach((campaign) => {
      let discount = 0;
      const { type, discountPercent, discountAmount, maxDiscount } = campaign;

      switch (type) {
        case 'PERCENTAGE':
          discount = subtotal * (parseFloat(discountPercent) / 100);
          break;
        case 'FIXED_AMOUNT':
          discount = Math.min(parseFloat(discountAmount), subtotal);
          break;
        default:
          discount = 0;
      }

      if (maxDiscount && discount > parseFloat(maxDiscount)) {
        discount = parseFloat(maxDiscount);
      }

      if (discount > 0) {
        applicableCampaigns.push({
          ...campaign,
          calculatedDiscount: discount,
          scope: 'global',
        });
      }
    });

    // Ürün bazlı kampanyalar
    const productCampaignMap = new Map(); // Kampanya ID -> toplam indirim

    items.forEach((item) => {
      const itemPrice = parseFloat(item.price);
      const quantity = parseInt(item.quantity);

      const productSpecificCampaigns = campaigns.filter((campaign) => {
        if (campaign.applyToAll || campaign.type === 'FREE_SHIPPING') return false;

        if (item.categoryId && campaign.categoryIds) {
          const categoryIds = Array.isArray(campaign.categoryIds) ? campaign.categoryIds : [];
          const normalizedItemCategoryId = String(item.categoryId).toLowerCase().trim();
          const hasMatchingCategory = categoryIds.some(catId => 
            String(catId).toLowerCase().trim() === normalizedItemCategoryId
          );
          if (hasMatchingCategory) return true;
        }

        if (campaign.productIds) {
          const productIds = Array.isArray(campaign.productIds) ? campaign.productIds : [];
          const normalizedItemProductId = String(item.productId).toLowerCase().trim();
          const hasMatchingProduct = productIds.some(prodId => 
            String(prodId).toLowerCase().trim() === normalizedItemProductId
          );
          if (hasMatchingProduct) return true;
        }

        return false;
      });

      productSpecificCampaigns.forEach((campaign) => {
        const discount = calculateSingleCampaignDiscount(itemPrice, quantity, campaign);
        if (discount > 0) {
          // Aynı kampanya için toplam indirimi biriktir
          const currentTotal = productCampaignMap.get(campaign.id) || 0;
          productCampaignMap.set(campaign.id, currentTotal + discount);
          
          // İlk kez görüyorsak kampanya bilgilerini ekle
          if (!applicableCampaigns.find(c => c.id === campaign.id)) {
            applicableCampaigns.push({
              ...campaign,
              calculatedDiscount: discount, // İlk ürün için indirim
              scope: 'product',
              productName: item.name,
            });
          }
        }
      });
    });

    // Ürün bazlı kampanyaların toplam indirimini güncelle
    applicableCampaigns.forEach((campaign) => {
      if (campaign.scope === 'product' && productCampaignMap.has(campaign.id)) {
        campaign.calculatedDiscount = productCampaignMap.get(campaign.id);
      }
    });

    // Önceliğe göre sırala
    applicableCampaigns.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      if (priorityB !== priorityA) return priorityB - priorityA;
      return b.calculatedDiscount - a.calculatedDiscount;
    });

    return applicableCampaigns;
  };

  // Kampanya bilgisini çek
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (total > 0) {
        try {
          const response = await campaignService.getActiveCampaigns();
          const activeCampaigns = response.data.campaigns || [];
          // Minimum tutar ve kullanım limiti kontrolü
          const filteredCampaigns = activeCampaigns.filter(c => {
            // Minimum tutar kontrolü
            if (c.minPurchase && parseFloat(c.minPurchase) > total) return false;
            // Kullanım limiti kontrolü
            if (c.usageLimit !== null && c.usageLimit !== undefined) {
              if (c.usageCount >= c.usageLimit) return false;
            }
            return true;
          });
          // Önceliğe göre sırala (yüksek öncelik önce)
          filteredCampaigns.sort((a, b) => {
            const priorityA = a.priority || 0;
            const priorityB = b.priority || 0;
            return priorityB - priorityA; // Yüksek öncelik önce
          });
          setCampaigns(filteredCampaigns);
        } catch (error) {
          console.error('Kampanya yükleme hatası:', error);
        }
      } else {
        setCampaigns([]);
        setSelectedCampaignId(null);
      }
    };
    fetchCampaigns();
  }, [total]);

  // Uygun kampanyaları kontrol et ve modal göster
  useEffect(() => {
    if (campaigns.length === 0 || items.length === 0) {
      setApplicableCampaigns([]);
      setSelectedCampaignId(null);
      return;
    }

    const applicable = getAllApplicableCampaigns();
    setApplicableCampaigns(applicable);

    // Eğer birden fazla kampanya varsa ve henüz seçilmemişse modal göster
    if (applicable.length > 1 && !selectedCampaignId) {
      // LocalStorage'dan kontrol et
      const savedCampaignId = localStorage.getItem('selectedCampaignId');
      if (savedCampaignId && applicable.some(c => c.id === savedCampaignId)) {
        setSelectedCampaignId(savedCampaignId);
      } else {
        setShowCampaignModal(true);
      }
    } else if (applicable.length === 1 && !selectedCampaignId) {
      // Tek kampanya varsa otomatik seç
      setSelectedCampaignId(applicable[0].id);
      localStorage.setItem('selectedCampaignId', applicable[0].id);
    } else if (applicable.length === 0) {
      setSelectedCampaignId(null);
      localStorage.removeItem('selectedCampaignId');
    } else if (selectedCampaignId && !applicable.some(c => c.id === selectedCampaignId)) {
      // Seçilen kampanya artık uygun değilse temizle
      setSelectedCampaignId(null);
      localStorage.removeItem('selectedCampaignId');
      if (applicable.length > 1) {
        setShowCampaignModal(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, items, total]);

  // Tek kampanya için indirim hesapla
  const calculateSingleCampaignDiscount = (price, quantity, campaign) => {
    const { type, discountPercent, discountAmount, buyQuantity, getQuantity, maxDiscount } = campaign;
    let discount = 0;
    const totalPrice = price * quantity; // Toplam fiyat (birim fiyat * miktar)

    switch (type) {
      case 'PERCENTAGE':
        // İndirimi toplam fiyat üzerinden hesapla
        discount = totalPrice * (parseFloat(discountPercent) / 100);
        break;

      case 'FIXED_AMOUNT':
        // Sabit tutar için: min(amount, totalPrice) - ama genelde toplam fiyat üzerinden
        discount = Math.min(parseFloat(discountAmount), totalPrice);
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

  // Kampanya indirimi hesapla (sadece seçilen kampanyayı kullan)
  const calculateDiscount = () => {
    if (!selectedCampaignId || applicableCampaigns.length === 0) {
      return { discount: 0, details: [] };
    }

    const selectedCampaign = applicableCampaigns.find(c => c.id === selectedCampaignId);
    if (!selectedCampaign) {
      return { discount: 0, details: [] };
    }

    let discount = selectedCampaign.calculatedDiscount || 0;
    const details = [];

    if (selectedCampaign.scope === 'global') {
      details.push({
        productName: 'Gesamter Warenkorb',
        campaignName: selectedCampaign.name,
        discount: discount,
      });
    } else {
      // Ürün bazlı kampanya için hangi ürünlere uygulandığını bul
      items.forEach((item) => {
        const itemPrice = parseFloat(item.price);
        const quantity = parseInt(item.quantity);
        
        // Bu kampanya bu ürüne uygulanıyor mu?
        let appliesToItem = false;
        
        if (item.categoryId && selectedCampaign.categoryIds) {
          const categoryIds = Array.isArray(selectedCampaign.categoryIds) ? selectedCampaign.categoryIds : [];
          const normalizedItemCategoryId = String(item.categoryId).toLowerCase().trim();
          if (categoryIds.some(catId => String(catId).toLowerCase().trim() === normalizedItemCategoryId)) {
            appliesToItem = true;
          }
        }
        
        if (selectedCampaign.productIds) {
          const productIds = Array.isArray(selectedCampaign.productIds) ? selectedCampaign.productIds : [];
          const normalizedItemProductId = String(item.productId).toLowerCase().trim();
          if (productIds.some(prodId => String(prodId).toLowerCase().trim() === normalizedItemProductId)) {
            appliesToItem = true;
          }
        }

        if (appliesToItem) {
          const itemDiscount = calculateSingleCampaignDiscount(itemPrice, quantity, selectedCampaign);
          if (itemDiscount > 0) {
            details.push({
              productName: item.name,
              campaignName: selectedCampaign.name,
              discount: itemDiscount,
            });
          }
        }
      });
      
      // Toplam indirimi hesapla
      discount = details.reduce((sum, detail) => sum + detail.discount, 0);
    }

    return { discount, details };
  };

  // Kampanya seçimini yap
  const handleSelectCampaign = (campaignId) => {
    setSelectedCampaignId(campaignId);
    localStorage.setItem('selectedCampaignId', campaignId);
    setShowCampaignModal(false);
    toast.success('Kampanya ausgewählt', {
      position: 'bottom-center',
      autoClose: 2000,
    });
  };

  // Kampanya seçimini iptal et
  const handleCancelCampaignSelection = () => {
    // En yüksek öncelikli kampanyayı otomatik seç
    if (applicableCampaigns.length > 0) {
      handleSelectCampaign(applicableCampaigns[0].id);
    } else {
      setShowCampaignModal(false);
    }
  };

  const discountResult = calculateDiscount();
  const discount = discountResult.discount;
  const discountDetails = discountResult.details;
  const finalTotal = total - discount;

  // Teslimat ücreti uyarısını hesapla
  const getDeliveryFeeWarning = () => {
    if (!settings) return null;

    const minOrderAmount = settings.minOrderAmount ? parseFloat(settings.minOrderAmount) : null;
    const freeShippingThreshold = settings.freeShippingThreshold ? parseFloat(settings.freeShippingThreshold) : null;
    const shippingRules = Array.isArray(settings.shippingRules) ? settings.shippingRules : [];

    // Önce minimum sipariş tutarını kontrol et
    if (minOrderAmount && finalTotal < minOrderAmount) {
      const remaining = minOrderAmount - finalTotal;
      const progress = (finalTotal / minOrderAmount) * 100;
      return {
        type: 'minimum',
        message: `Noch ${remaining.toFixed(2)} € bis zum Mindestbestellwert!`,
        progress: progress,
        target: minOrderAmount,
      };
    }

    // Minimum sipariş tutarına ulaşıldıysa veya yoksa, shipping rules kontrolü yap
    if ((!minOrderAmount || finalTotal >= minOrderAmount) && shippingRules.length > 0) {
      // Kuralın ücretini hesapla (fee veya percent)
      const calculateRuleFee = (rule, amount) => {
        if (rule.type === 'percent') {
          return (amount * parseFloat(rule.percent ?? rule.value ?? 0)) / 100;
        } else {
          return parseFloat(rule.fee ?? rule.value ?? 0);
        }
      };

      // Mevcut kurala göre teslimat ücretini bul
      const currentRule = shippingRules.find((r) => {
        const minOk = r.min == null || finalTotal >= parseFloat(r.min ?? 0);
        const maxOk = r.max == null || finalTotal <= parseFloat(r.max ?? Infinity);
        return minOk && maxOk;
      });

      const currentFee = currentRule ? calculateRuleFee(currentRule, finalTotal) : null;

      // Daha düşük ücretli bir sonraki kuralı bul
      const nextRules = shippingRules
        .map((r) => ({
          ...r,
          ruleMin: r.min ? parseFloat(r.min) : 0,
          ruleFee: calculateRuleFee(r, r.min ? parseFloat(r.min) : finalTotal),
        }))
        .filter((r) => {
          // Sonraki kural: min > finalTotal
          if (r.ruleMin <= finalTotal) return false;
          
          // Eğer mevcut kural varsa: sadece mevcut ücretten düşük ücretli kuralları göster
          if (currentFee !== null) {
            return r.ruleFee < currentFee;
          }
          
          // Eğer mevcut kural yoksa: tüm sonraki kuralları göster
          return true;
        })
        .sort((a, b) => {
          // Önce ücrete göre sırala (düşükten yükseğe), sonra min'e göre (yakından uzağa)
          if (a.ruleFee !== b.ruleFee) {
            return a.ruleFee - b.ruleFee;
          }
          return a.ruleMin - b.ruleMin;
        });

      if (nextRules.length > 0) {
        const nextRule = nextRules[0]; // En yakın kural
        const remaining = nextRule.ruleMin - finalTotal;
        const nextFee = nextRule.ruleFee;
        const progress = (finalTotal / nextRule.ruleMin) * 100;

        return {
          type: 'reduced',
          message: `Noch ${remaining.toFixed(2)} € hinzufügen und Versandkosten werden ${nextFee.toFixed(2)} € sein!`,
          progress: progress,
          target: nextRule.ruleMin,
        };
      }
    }

    // Ücretsiz kargo eşiğini kontrol et (shipping rules'dan sonra)
    if (freeShippingThreshold && (!minOrderAmount || finalTotal >= minOrderAmount) && finalTotal < freeShippingThreshold) {
      const remaining = freeShippingThreshold - finalTotal;
      const progress = minOrderAmount 
        ? ((finalTotal - minOrderAmount) / (freeShippingThreshold - minOrderAmount)) * 100
        : (finalTotal / freeShippingThreshold) * 100;
      return {
        type: 'free',
        message: `Noch ${remaining.toFixed(2)} € bis zur kostenlosen Lieferung!`,
        progress: progress,
        target: freeShippingThreshold,
      };
    }

    // Ücretsiz kargo eşiğine ulaşıldıysa
    if (freeShippingThreshold && finalTotal >= freeShippingThreshold) {
      return {
        type: 'achieved',
        message: 'Kostenlose Lieferung!',
        progress: 100,
      };
    }

    return null;
  };

  const deliveryWarning = getDeliveryFeeWarning();

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
    const item = items.find(i => i.productId === productId && (variantId ? i.variantId === variantId : !i.variantId));
    const itemName = item?.name || 'Produkt';
    
    const confirmed = await showConfirm(`Möchten Sie "${itemName}" wirklich aus dem Warenkorb entfernen?`);
    if (!confirmed) return;
    
    try {
      await removeItem(productId, variantId);
      toast.success('Produkt entfernt');
      setHasError(false);
    } catch (error) {
      setHasError(true);
      setTimeout(() => setHasError(false), 500);
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
        setHasError(false);
      } catch (error) {
        setHasError(true);
        setTimeout(() => setHasError(false), 500);
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
          <p className="text-gray-600 mb-6">Beginnen Sie, indem Sie Produkte zu Ihrem Warenkorb hinzufügen</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Produkte durchsuchen
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
            <h1 className="text-2xl font-bold text-gray-900">Mein Warenkorb</h1>
            <p className="text-sm text-gray-600 mt-1">
              {itemCount} {itemCount === 1 ? 'Produkt' : 'Produkte'}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleClearCart}
              disabled={isClearing}
              className={`text-red-500 text-sm hover:text-red-700 disabled:opacity-50 btn-press ${
                hasError ? 'animate-shake' : ''
              }`}
            >
              Leeren
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
        {/* Teslimat Ücreti Uyarısı */}
        {deliveryWarning && (
          <div className={`mb-3 p-2.5 rounded-lg ${
            deliveryWarning.type === 'achieved'
              ? 'bg-green-50 border border-green-200'
              : deliveryWarning.type === 'minimum'
              ? 'bg-amber-50 border border-amber-200'
              : deliveryWarning.type === 'reduced'
              ? 'bg-purple-50 border border-purple-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <FiTruck className={`w-4 h-4 ${
                deliveryWarning.type === 'achieved' 
                  ? 'text-green-600' 
                  : deliveryWarning.type === 'minimum'
                  ? 'text-amber-600'
                  : deliveryWarning.type === 'reduced'
                  ? 'text-purple-600'
                  : 'text-blue-600'
              }`} />
              <p className={`text-xs font-semibold ${
                deliveryWarning.type === 'achieved' 
                  ? 'text-green-800' 
                  : deliveryWarning.type === 'minimum'
                  ? 'text-amber-800'
                  : deliveryWarning.type === 'reduced'
                  ? 'text-purple-800'
                  : 'text-blue-800'
              }`}>
                {deliveryWarning.message}
              </p>
            </div>
            {deliveryWarning.progress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${deliveryWarning.progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    deliveryWarning.type === 'free' 
                      ? 'bg-green-500' 
                      : deliveryWarning.type === 'minimum'
                      ? 'bg-amber-500'
                      : deliveryWarning.type === 'reduced'
                      ? 'bg-purple-500'
                      : 'bg-blue-500'
                  }`}
                />
              </div>
            )}
          </div>
        )}

        {/* Toplam */}
        <div className="space-y-1.5 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Zwischensumme</span>
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
                    {applicableCampaigns.length > 1 && (
                      <button
                        onClick={() => setShowCampaignModal(true)}
                        className="ml-2 text-xs text-primary-600 hover:text-primary-700 underline"
                      >
                        Ändern
                      </button>
                    )}
                  </div>
                  <span className="text-xs font-semibold">-{detail.discount.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}

          {/* Final toplam */}
          <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
            <span className="text-sm text-gray-900 font-bold">Gesamt</span>
            <div className="text-right">
              <span className="text-lg font-bold text-primary-600 block">{finalTotal.toFixed(2)} €</span>
              <span className="text-[10px] text-gray-500">Versandkosten werden an der Kasse berechnet</span>
            </div>
          </div>
        </div>

        {/* Checkout butonu */}
        <button
          onClick={handleCheckout}
          className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 text-xs"
        >
          <span>Zur Kasse</span>
          <FiArrowRight className="w-3 h-3" />
        </button>

        {/* Siparişlerim butonu */}
        <button
          onClick={() => navigate('/siparislerim')}
          className="w-full mt-1.5 border border-gray-300 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-xs"
        >
          <FiPackage className="w-3 h-3" />
          Meine Bestellungen
        </button>
      </motion.div>
      </div>

      {/* Kampanya Seçim Modalı */}
      <AnimatePresence>
        {showCampaignModal && applicableCampaigns.length > 1 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelCampaignSelection}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Modal Header */}
                <div className="bg-primary-600 text-white px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Kampanya auswählen</h2>
                    <p className="text-sm text-primary-100 mt-1">
                      Mehrere Kampagnen verfügbar
                    </p>
                  </div>
                  <button
                    onClick={handleCancelCampaignSelection}
                    className="p-2 hover:bg-primary-700 rounded-lg transition-colors"
                  >
                    <FiX className="text-white" size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  <p className="text-sm text-gray-600 mb-4">
                    Bitte wählen Sie eine Kampagne aus, die auf Ihren Warenkorb angewendet werden soll:
                  </p>
                  <div className="space-y-3">
                    {applicableCampaigns.map((campaign) => {
                      const totalDiscount = campaign.calculatedDiscount || 0;
                      // İndirim metnini oluştur - her zaman Euro cinsinden göster
                      const discountText = `${totalDiscount.toFixed(2)} €`;
                      
                      return (
                        <button
                          key={campaign.id}
                          onClick={() => handleSelectCampaign(campaign.id)}
                          className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FiTag className="text-primary-600" />
                                <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                              </div>
                              {campaign.description && (
                                <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                {campaign.scope === 'global' ? (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    Gesamter Warenkorb
                                  </span>
                                ) : (
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                    {campaign.productName || 'Produkt'}
                                  </span>
                                )}
                                {campaign.priority > 0 && (
                                  <span className="text-gray-400">Priorität: {campaign.priority}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-2xl font-bold text-primary-600">
                                -{discountText}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Rabatt
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Sepet;
