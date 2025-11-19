import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FiMapPin,
  FiTruck,
  FiShoppingBag,
  FiCreditCard,
  FiFileText,
  FiPlus,
  FiCheck,
  FiTag,
  FiX,
  FiClock,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import userService from '../services/userService';
import orderService from '../services/orderService';
import couponService from '../services/couponService';
import campaignService from '../services/campaignService';
import settingsService from '../services/settingsService';

function SiparisVer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { orderHoursInfo } = useOutletContext() || {};

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState(null);
  const [useDifferentBillingAddress, setUseDifferentBillingAddress] = useState(false);
  const [orderType, setOrderType] = useState('delivery'); // delivery | pickup
  const [paymentType, setPaymentType] = useState('cash'); // cash | card_on_delivery
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [deliveryTimingMode, setDeliveryTimingMode] = useState('ASAP'); // ASAP | SCHEDULED
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const MIN_SCHEDULE_OFFSET_MINUTES = 15;

  const parseTimeToMinutes = (value) => {
    if (!value) return null;
    const [hour, minute] = value.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  };

  const minutesToTimeString = (minutes) => {
    const normalized = Math.max(0, Math.min(minutes, 23 * 60 + 59));
    const hour = Math.floor(normalized / 60)
      .toString()
      .padStart(2, '0');
    const minute = (normalized % 60).toString().padStart(2, '0');
    return `${hour}:${minute}`;
  };

  const formatDateInputValue = (date) => {
    const iso = date.toISOString();
    return iso.split('T')[0];
  };

  const isMinutesWithinWindow = (value, startMinutes, endMinutes) => {
    if (startMinutes <= endMinutes) {
      return value >= startMinutes && value <= endMinutes;
    }
    return value >= startMinutes || value <= endMinutes;
  };

  const isSundayDateString = (value) => {
    if (!value) return false;
    const date = new Date(`${value}T00:00:00`);
    return date.getDay() === 0;
  };

  const getDefaultScheduleValues = () => {
    const now = new Date();
    const settingsStart = settings?.deliverySettings?.siparisBaslangicSaati;
    const settingsEnd = settings?.deliverySettings?.siparisKapanisSaati;
    const startMinutes = parseTimeToMinutes(orderHoursInfo?.startTime || settingsStart) ?? 9 * 60;
    const endMinutes = parseTimeToMinutes(orderHoursInfo?.endTime || settingsEnd) ?? 20 * 60;
    const bufferMinutes = 30;

    const pickValidDate = (baseDate) => {
      const candidate = new Date(baseDate);
      while (candidate.getDay() === 0) {
        candidate.setDate(candidate.getDate() + 1);
      }
      return candidate;
    };

    let candidateDate = pickValidDate(now);
    let candidateMinutes = Math.max(
      (now.getHours() * 60 + now.getMinutes()) + bufferMinutes,
      startMinutes
    );

    if (candidateMinutes > endMinutes) {
      candidateDate = pickValidDate(new Date(candidateDate.getTime() + 24 * 60 * 60 * 1000));
      candidateMinutes = startMinutes;
    }

    return {
      date: formatDateInputValue(candidateDate),
      time: minutesToTimeString(candidateMinutes),
    };
  };

  const formatScheduledLabel = (dateValue, timeValue) => {
    const composed = new Date(`${dateValue}T${timeValue}`);
    return format(composed, 'EEEE, dd.MM.yyyy HH:mm', { locale: de });
  };

  const subtotal = getTotal();
  const scheduleStartTime =
    orderHoursInfo?.startTime ||
    settings?.deliverySettings?.siparisBaslangicSaati ||
    '00:00';
  const scheduleEndTime =
    orderHoursInfo?.endTime ||
    settings?.deliverySettings?.siparisKapanisSaati ||
    '23:59';
  const isOutsideOrderHours = orderHoursInfo ? !orderHoursInfo.isWithinOrderHours : false;
  const isSundayToday = useMemo(() => new Date().getDay() === 0, []);
  const asapDisabled = isOutsideOrderHours || isSundayToday;
  const todayDateStr = useMemo(() => formatDateInputValue(new Date()), []);
  const maxDateStr = useMemo(() => {
    const future = new Date();
    future.setDate(future.getDate() + 14);
    return formatDateInputValue(future);
  }, []);
  const scheduledDisplayLabel = useMemo(() => {
    if (deliveryTimingMode !== 'SCHEDULED' || !scheduledDate || !scheduledTime) {
      return '';
    }
    try {
      return formatScheduledLabel(scheduledDate, scheduledTime);
    } catch (error) {
      return `${scheduledDate} ${scheduledTime}`;
    }
  }, [deliveryTimingMode, scheduledDate, scheduledTime]);
  
  // Ücretsiz kargo kampanyası kontrolü
  const isFreeShipping = useMemo(() => {
    if (orderType !== 'delivery' || campaigns.length === 0) return false;
    
    // FREE_SHIPPING tipindeki kampanyaları bul
    const freeShippingCampaigns = campaigns.filter(campaign => {
      if (campaign.type !== 'FREE_SHIPPING') return false;
      
      // Minimum tutar kontrolü
      if (campaign.minPurchase && parseFloat(campaign.minPurchase) > subtotal) return false;
      
      // Tüm mağazaya uygulanan kampanyalar
      if (campaign.applyToAll) return true;
      
      // Ürüne özgü kampanyalar - sepetteki ürünlerden biri kampanyada varsa geçerli
      if (campaign.productIds) {
        const productIds = Array.isArray(campaign.productIds) ? campaign.productIds : [];
        const hasMatchingProduct = items.some(item => productIds.includes(item.productId));
        if (hasMatchingProduct) return true;
      }
      
      return false;
    });
    
    return freeShippingCampaigns.length > 0;
  }, [orderType, campaigns, subtotal, items]);
  
  // Kampanya indirimlerini hesapla
  const calculateCampaignDiscount = () => {
    if (campaigns.length === 0 || items.length === 0) return 0;

    let totalDiscount = 0;

    // Her ürün için ayrı ayrı indirim hesapla
    items.forEach((item) => {
      const itemPrice = parseFloat(item.price);
      const quantity = parseInt(item.quantity);

      // Bu ürün için geçerli kampanyaları bul
      const applicableCampaigns = campaigns.filter((campaign) => {
        // FREE_SHIPPING kampanyaları ürün bazında değil
        if (campaign.type === 'FREE_SHIPPING') return false;

        // Tüm mağazaya uygulanan kampanyalar
        if (campaign.applyToAll) return true;

        // Ürüne özgü kampanyalar
        if (campaign.productIds) {
          const productIds = Array.isArray(campaign.productIds) ? campaign.productIds : [];
          if (productIds.includes(item.productId)) return true;
        }

        return false;
      });

      if (applicableCampaigns.length === 0) return;

      // En yüksek indirimi veren kampanyayı bul
      let bestDiscount = 0;

      applicableCampaigns.forEach((campaign) => {
        const { type, discountPercent, discountAmount, buyQuantity, getQuantity, maxDiscount } = campaign;
        let discount = 0;

        switch (type) {
          case 'PERCENTAGE':
            // Yüzde indirim: fiyat * miktar * yüzde
            discount = itemPrice * quantity * (parseFloat(discountPercent) / 100);
            break;

          case 'FIXED_AMOUNT':
            // Sabit tutar indirim: miktar ile çarp
            discount = parseFloat(discountAmount) * quantity;
            // İndirim toplam fiyattan fazla olamaz
            discount = Math.min(discount, itemPrice * quantity);
            break;

          case 'BUY_X_GET_Y':
            // X Al Y Öde kampanyası
            if (quantity >= buyQuantity) {
              const sets = Math.floor(quantity / buyQuantity);
              const freeItems = buyQuantity - getQuantity;
              const totalFreeItems = sets * freeItems;
              discount = totalFreeItems * itemPrice;
            }
            break;

          default:
            discount = 0;
        }

        // Max indirim kontrolü (toplam indirim limiti)
        if (maxDiscount && discount > parseFloat(maxDiscount)) {
          discount = parseFloat(maxDiscount);
        }

        if (discount > bestDiscount) {
          bestDiscount = discount;
        }
      });

      if (bestDiscount > 0) {
        totalDiscount += bestDiscount;
      }
    });

    return totalDiscount;
  };

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

  useEffect(() => {
    if (asapDisabled) {
      setDeliveryTimingMode('SCHEDULED');
    }
  }, [asapDisabled]);

  useEffect(() => {
    if (deliveryTimingMode === 'SCHEDULED') {
      if (!scheduledDate || !scheduledTime) {
        const defaults = getDefaultScheduleValues();
        setScheduledDate(defaults.date);
        setScheduledTime(defaults.time);
      }
    }
  }, [deliveryTimingMode, settings, orderHoursInfo]);

  // Kampanyaları yükle
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (subtotal > 0) {
        try {
          const response = await campaignService.getActiveCampaigns();
          const activeCampaigns = response.data.campaigns || [];
          // Minimum tutar kontrolü
          const applicableCampaigns = activeCampaigns.filter(c => {
            if (c.minPurchase && parseFloat(c.minPurchase) > subtotal) return false;
            return true;
          });
          setCampaigns(applicableCampaigns);
        } catch (error) {
          console.error('Kampanya yükleme hatası:', error);
        }
      }
    };
    fetchCampaigns();
  }, [subtotal, items]);

  const campaignDiscount = calculateCampaignDiscount();
  const discount = couponDiscount + campaignDiscount;
  const finalSubtotal = subtotal - discount;
  
  // Ücretsiz kargo kontrolü (hem kampanya hem settings)
  const isFreeShippingFinal = useMemo(() => {
    if (orderType !== 'delivery') return false;
    
    // Ücretsiz kargo kampanyası varsa
    if (isFreeShipping) return true;
    
    // Settings'ten ücretsiz kargo eşiği kontrolü
    if (settings) {
      const freeShippingThreshold = settings.freeShippingThreshold ? parseFloat(settings.freeShippingThreshold) : null;
      if (freeShippingThreshold && finalSubtotal >= freeShippingThreshold) {
        return true;
      }
    }
    
    return false;
  }, [orderType, isFreeShipping, settings, finalSubtotal]);
  
  // Teslimat ücreti hesaplama (settings kurallarına göre)
  const calculatedDeliveryFee = useMemo(() => {
    if (orderType !== 'delivery') return 0;
    
    // Ücretsiz kargo varsa
    if (isFreeShippingFinal) return 0;
    
    if (!settings) return 3.99; // Varsayılan
    
    // Shipping rules'a göre hesapla
    const shippingRules = Array.isArray(settings.shippingRules) ? settings.shippingRules : [];
    if (shippingRules.length > 0) {
      const rule = shippingRules.find((r) => {
        const minOk = r.min == null || finalSubtotal >= parseFloat(r.min);
        const maxOk = r.max == null || finalSubtotal <= parseFloat(r.max);
        return minOk && maxOk;
      });
      
      if (rule) {
        if (rule.type === 'percent') {
          return (finalSubtotal * parseFloat(rule.percent ?? rule.value ?? 0)) / 100;
        } else {
          return parseFloat(rule.fee ?? rule.value ?? 0);
        }
      }
    }
    
    // Varsayılan teslimat ücreti
    return 3.99;
  }, [orderType, isFreeShippingFinal, settings, finalSubtotal]);
  
  const deliveryFee = calculatedDeliveryFee;
  const total = Math.max(0, finalSubtotal + deliveryFee);

  // Adresleri yükle
  useEffect(() => {
    loadAddresses();
  }, []);

  // Profilden geri dönüldüğünde adresleri yeniden yükle
  useEffect(() => {
    if (location.state?.refreshAddresses) {
      loadAddresses();
      // State'i temizle
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const loadAddresses = async () => {
    try {
      const response = await userService.getAddresses();
      console.log('SiparisVer - Adres response:', response);
      // API interceptor response.data döndüğü için direkt response'u kontrol et
      const loadedAddresses = response?.data?.addresses || response?.addresses || [];
      console.log('SiparisVer - Adres listesi:', loadedAddresses);
      setAddresses(loadedAddresses);

      // Varsayılan adresi seç
      const defaultAddress = loadedAddresses.find((addr) => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setSelectedBillingAddressId(defaultAddress.id); // Fatura adresi için de varsayılan adresi seç
      } else if (loadedAddresses.length > 0) {
        setSelectedAddressId(loadedAddresses[0].id);
        setSelectedBillingAddressId(loadedAddresses[0].id); // Fatura adresi için de ilk adresi seç
      }
      // Switch'i kapalı başlat (varsayılan olarak aynı adres)
      setUseDifferentBillingAddress(false);
    } catch (error) {
      console.error('Adres yükleme hatası:', error);
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Kupon doğrula
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Bitte geben Sie einen Gutscheincode ein');
      return;
    }

    setValidatingCoupon(true);
    try {
      const cartItems = items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      }));

      const response = await couponService.validateCoupon(couponCode, cartItems, subtotal);
      
      // Response format: { success: true, data: { coupon: {...}, discount: 4.11 } }
      if (response && response.success && response.data) {
        setAppliedCoupon(response.data.coupon);
        setCouponDiscount(response.data.discount);
        toast.success('Gutscheincode erfolgreich angewendet!');
      } else {
        throw new Error('Ungültige Antwort vom Server');
      }
    } catch (error) {
      toast.error(error.message || error.data?.message || 'Gutscheincode ungültig');
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Kupon kaldır
  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  // Onay modalını göster
  const handleOrderButtonClick = () => {
    // Validasyon
    if (orderType === 'delivery' && !selectedAddressId) {
      toast.error('Bitte wählen Sie eine Lieferadresse');
      return;
    }

    if (items.length === 0) {
      toast.error('Ihr Warenkorb ist leer');
      return;
    }

    if (deliveryTimingMode === 'SCHEDULED') {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Bitte wählen Sie Datum und Uhrzeit für die Vorbestellung');
        return;
      }
      if (isSundayDateString(scheduledDate)) {
        toast.error('Vorbestellungen auf Sonntage sind nicht möglich');
        return;
      }
    } else {
      if (isOutsideOrderHours) {
        toast.error('Bitte wählen Sie einen Lieferzeitpunkt, da wir uns außerhalb der Bestellzeiten befinden');
        return;
      }
      if (new Date().getDay() === 0) {
        toast.error('Am Sonntag sind nur Vorbestellungen möglich');
        return;
      }
    }

    setShowConfirmModal(true);
  };

  // Sipariş ver
  const handlePlaceOrder = async () => {
    setShowConfirmModal(false);
    setLoading(true);

    try {
      if (deliveryTimingMode === 'SCHEDULED') {
        if (!scheduledDate || !scheduledTime) {
          toast.error('Bitte wählen Sie Datum und Uhrzeit für die Vorbestellung');
          setLoading(false);
          return;
        }
        if (isSundayDateString(scheduledDate)) {
          toast.error('Vorbestellungen auf Sonntage sind nicht möglich');
          setLoading(false);
          return;
        }
        const selectedMinutes = parseTimeToMinutes(scheduledTime);
        const startMinutesSetting = parseTimeToMinutes(scheduleStartTime) ?? 0;
        const endMinutesSetting = parseTimeToMinutes(scheduleEndTime) ?? 23 * 60 + 59;
        if (
          selectedMinutes === null ||
          !isMinutesWithinWindow(selectedMinutes, startMinutesSetting, endMinutesSetting)
        ) {
          toast.error(`Uhrzeit muss zwischen ${scheduleStartTime} und ${scheduleEndTime} liegen`);
          setLoading(false);
          return;
        }
        const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const diffMinutes = (selectedDateTime.getTime() - Date.now()) / 60000;
        if (diffMinutes < MIN_SCHEDULE_OFFSET_MINUTES) {
          toast.error(
            `Vorbestellungen müssen mindestens ${MIN_SCHEDULE_OFFSET_MINUTES} Minuten in der Zukunft liegen`
          );
          setLoading(false);
          return;
        }
      } else if (isOutsideOrderHours || new Date().getDay() === 0) {
        toast.error('Bitte wählen Sie einen Lieferzeitpunkt');
        setLoading(false);
        return;
      }

      // Her ürün için kampanya bilgilerini hesapla
      const orderItems = items.map((item) => {
        const itemPrice = parseFloat(item.price);
        const quantity = parseInt(item.quantity);

        // Bu ürün için geçerli kampanyaları bul
        const applicableCampaigns = campaigns.filter((campaign) => {
          // FREE_SHIPPING kampanyaları ürün bazında değil
          if (campaign.type === 'FREE_SHIPPING') return false;

          // Tüm mağazaya uygulanan kampanyalar
          if (campaign.applyToAll) return true;

          // Ürüne özgü kampanyalar
          if (campaign.productIds) {
            const productIds = Array.isArray(campaign.productIds) ? campaign.productIds : [];
            if (productIds.includes(item.productId)) return true;
          }

          return false;
        });

        // En yüksek indirimi veren kampanyayı bul
        let bestDiscount = 0;
        let bestCampaign = null;

        applicableCampaigns.forEach((campaign) => {
          const { type, discountPercent, discountAmount, buyQuantity, getQuantity, maxDiscount } = campaign;
          let discount = 0;

          switch (type) {
            case 'PERCENTAGE':
              discount = itemPrice * quantity * (parseFloat(discountPercent) / 100);
              break;

            case 'FIXED_AMOUNT':
              discount = parseFloat(discountAmount) * quantity;
              discount = Math.min(discount, itemPrice * quantity);
              break;

            case 'BUY_X_GET_Y':
              if (quantity >= buyQuantity) {
                const sets = Math.floor(quantity / buyQuantity);
                const freeItems = buyQuantity - getQuantity;
                const totalFreeItems = sets * freeItems;
                discount = totalFreeItems * itemPrice;
              }
              break;

            default:
              discount = 0;
          }

          // Max indirim kontrolü
          if (maxDiscount && discount > parseFloat(maxDiscount)) {
            discount = parseFloat(maxDiscount);
          }

          if (discount > bestDiscount) {
            bestDiscount = discount;
            bestCampaign = campaign;
          }
        });

        // İndirimli fiyatı hesapla
        const unitDiscount = bestDiscount > 0 ? bestDiscount / quantity : 0;
        const campaignPrice = bestDiscount > 0 ? itemPrice - unitDiscount : null;

        return {
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          // Kampanya bilgilerini ekle
          ...(bestCampaign && {
            campaignPrice: campaignPrice,
            campaignId: bestCampaign.id,
            campaignName: bestCampaign.name,
          }),
        };
      });

      const orderData = {
        type: orderType,
        paymentType,
        items: orderItems,
        ...(orderType === 'delivery' && { addressId: selectedAddressId }),
        // Switch açıksa ve farklı bir fatura adresi seçildiyse gönder
        // Delivery için: switch açıksa ve farklı adres seçildiyse gönder
        // Pickup için: switch açıksa fatura adresi gönder (pickup'ta teslimat adresi yok)
        ...(useDifferentBillingAddress && selectedBillingAddressId && 
            ((orderType === 'delivery' && selectedBillingAddressId !== selectedAddressId) || 
             (orderType === 'pickup')) && 
            { billingAddressId: selectedBillingAddressId }),
        ...(appliedCoupon && { couponCode: appliedCoupon.code }),
        ...(note && note.trim() && { note: note.trim() }),
        ...(deliveryTimingMode === 'SCHEDULED' &&
          scheduledDate &&
          scheduledTime && {
            scheduledDate,
            scheduledTime,
          }),
      };

      console.log('Sipariş data:', orderData);

      const response = await orderService.createOrder(orderData);

      // Sepeti temizle
      await clearCart();

      // Success animasyonu
      setOrderSuccess(true);
      toast.success('Bestellung erfolgreich aufgegeben!');

      // Kısa bir süre sonra yönlendir (animasyon için)
      setTimeout(() => {
        navigate(`/bestellung/${response.data.order.id}`);
      }, 500);
    } catch (error) {
      console.error('Sipariş hatası:', error);
      // Axios interceptor hata objesini { message, status, data } olarak döndürüyor
      toast.error(error.message || error?.data?.message || 'Fehler beim Aufgeben der Bestellung');
    } finally {
      setLoading(false);
    }
  };

  // Sepet boşsa ana sayfaya yönlendir
  if (items.length === 0) {
    return (
      <div className="container-mobile py-6 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center">
          <FiShoppingBag className="text-gray-400 text-5xl mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ihr Warenkorb ist leer</h2>
          <p className="text-gray-600 mb-6">Fügen Sie Produkte hinzu, um eine Bestellung aufzugeben</p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
          >
            Produkte durchsuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile py-3 pb-20">
      <h1 className="text-lg font-bold text-gray-900 mb-3">Bestellung aufgeben</h1>

      {/* Teslimat Türü */}
      <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
        <h2 className="font-semibold text-gray-900 text-sm mb-1.5 flex items-center gap-1.5">
          <FiTruck className="w-4 h-4" />
          <span>Lieferart</span>
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOrderType('delivery')}
            className={`p-2 rounded-lg border transition-all ${
              orderType === 'delivery'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <FiTruck
              className={`mx-auto mb-1 text-lg ${
                orderType === 'delivery' ? 'text-green-600' : 'text-gray-400'
              }`}
            />
            <p className="font-medium text-xs">Lieferung</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {isFreeShippingFinal ? 'Kostenlos' : `${deliveryFee.toFixed(2)} €`}
            </p>
          </button>

          <button
            onClick={() => setOrderType('pickup')}
            className={`p-2 rounded-lg border transition-all ${
              orderType === 'pickup'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <FiShoppingBag
              className={`mx-auto mb-1 text-lg ${
                orderType === 'pickup' ? 'text-green-600' : 'text-gray-400'
              }`}
            />
            <p className="font-medium text-xs">Abholung</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Kostenlos</p>
          </button>
        </div>
      </div>

      {/* Teslimat Adresi (sadece delivery için) */}
      {orderType === 'delivery' && (
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              <FiMapPin className="w-4 h-4" />
              <span>Lieferadresse</span>
            </h2>
            <button
              onClick={() => navigate('/profil?tab=addresses', { state: { returnTo: '/bestellen' } })}
              className="text-green-600 text-xs flex items-center gap-1"
            >
              <FiPlus className="w-3 h-3" />
              <span>Neu</span>
            </button>
          </div>

          {loadingAddresses ? (
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded-lg"></div>
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-600 text-xs mb-2">Keine Adresse gefunden</p>
              <button
                onClick={() => navigate('/profil?tab=addresses', { state: { returnTo: '/bestellen' } })}
                className="text-green-600 text-xs"
              >
                Neue Adresse hinzufügen
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {addresses.map((address) => (
                <button
                  key={address.id}
                  onClick={() => {
                    setSelectedAddressId(address.id);
                    // Switch kapalıysa fatura adresini de güncelle
                    if (!useDifferentBillingAddress) {
                      setSelectedBillingAddressId(address.id);
                    }
                  }}
                  className={`w-full text-left p-2 rounded-lg border transition-all ${
                    selectedAddressId === address.id
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{address.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {address.street} {address.houseNumber}
                        {address.addressLine2 && `, ${address.addressLine2}`}
                      </p>
                      <p className="text-xs text-gray-600">
                        {address.postalCode} {address.city}, {address.state}
                      </p>
                    </div>
                    {selectedAddressId === address.id && (
                      <FiCheck className="text-green-600 text-base flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fatura Adresi Switch ve Seçimi */}
      {addresses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                <FiFileText className="w-4 h-4" />
                <span>Rechnungsadresse</span>
              </h2>
            </div>
            {/* Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useDifferentBillingAddress}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseDifferentBillingAddress(checked);
                  // Switch kapatılırsa fatura adresini teslimat adresiyle aynı yap
                  if (!checked && selectedAddressId) {
                    setSelectedBillingAddressId(selectedAddressId);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* Switch açıksa fatura adresi seçimi göster */}
          {useDifferentBillingAddress && (
            <>
              {loadingAddresses ? (
                <div className="animate-pulse">
                  <div className="h-12 bg-gray-200 rounded-lg"></div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {addresses.map((address) => (
                    <button
                      key={address.id}
                      onClick={() => setSelectedBillingAddressId(address.id)}
                      className={`w-full text-left p-2 rounded-lg border transition-all ${
                        selectedBillingAddressId === address.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{address.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {address.street} {address.houseNumber}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                          </p>
                          <p className="text-xs text-gray-600">
                            {address.postalCode} {address.city}, {address.state}
                          </p>
                        </div>
                        {selectedBillingAddressId === address.id && (
                          <FiCheck className="text-green-600 text-base flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Switch kapalıysa bilgi mesajı göster */}
          {!useDifferentBillingAddress && (
            <p className="text-xs text-gray-500 italic">
              {orderType === 'delivery' 
                ? 'Rechnungsadresse ist identisch mit der Lieferadresse'
                : selectedAddressId 
                  ? 'Rechnungsadresse ist identisch mit der ausgewählten Adresse'
                  : 'Rechnungsadresse wird aus Ihren gespeicherten Adressen verwendet'}
            </p>
          )}
        </div>
      )}

      {/* Lieferzeit & Vorbestellung */}
      <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
            <FiClock className="w-4 h-4" />
            <span>Lieferzeit / Vorbestellung</span>
          </h2>
          <span className="text-[10px] text-gray-500">
            {scheduleStartTime} - {scheduleEndTime}
          </span>
        </div>

        {asapDisabled && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 flex items-center gap-1.5">
            <FiClock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {isSundayToday
                ? 'Am Sonntag sind nur Vorbestellungen möglich.'
                : 'Wir befinden uns außerhalb der Bestellzeiten. Bitte wählen Sie einen gewünschten Zeitraum.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDeliveryTimingMode('ASAP')}
            disabled={asapDisabled}
            className={`p-2 rounded-lg border text-left transition-all ${
              deliveryTimingMode === 'ASAP'
                ? 'border-green-600 bg-green-50 text-green-800'
                : 'border-gray-200 bg-white text-gray-700'
            } ${asapDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <p className="font-semibold text-xs">Schnellstmöglich</p>
            <p className="text-[10px] text-gray-500">Innerhalb der aktiven Bestellzeiten</p>
          </button>

          <button
            onClick={() => setDeliveryTimingMode('SCHEDULED')}
            className={`p-2 rounded-lg border text-left transition-all ${
              deliveryTimingMode === 'SCHEDULED'
                ? 'border-purple-600 bg-purple-50 text-purple-800'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <p className="font-semibold text-xs">Vorbestellen</p>
            <p className="text-[10px] text-gray-500">Datum & Uhrzeit wählen</p>
          </button>
        </div>

        {deliveryTimingMode === 'SCHEDULED' && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Wunschdatum
              </label>
              <input
                type="date"
                min={todayDateStr}
                max={maxDateStr}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
              {scheduledDate && isSundayDateString(scheduledDate) && (
                <p className="text-[11px] text-red-600 mt-1">
                  Sonntage sind nicht verfügbar. Bitte anderes Datum wählen.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Uhrzeit
              </label>
              <input
                type="time"
                min={scheduleStartTime}
                max={scheduleEndTime}
                step="900"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Nur innerhalb des angegebenen Zeitfensters möglich.
              </p>
            </div>
            {scheduledDisplayLabel && (
              <div className="flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800">
                <FiClock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Vorbestellung bestätigt</p>
                  <p className="text-[11px]">{scheduledDisplayLabel}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ödeme Yöntemi */}
      <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
        <h2 className="font-semibold text-gray-900 text-sm mb-1.5 flex items-center gap-1.5">
          <FiCreditCard className="w-4 h-4" />
          <span>Zahlungsart</span>
        </h2>

        <div className="space-y-1.5">
          <button
            onClick={() => setPaymentType('cash')}
            className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between ${
              paymentType === 'cash'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="font-medium text-sm">Barzahlung</span>
            {paymentType === 'cash' && <FiCheck className="text-green-600 text-base" />}
          </button>

          <button
            onClick={() => setPaymentType('card_on_delivery')}
            className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between ${
              paymentType === 'card_on_delivery'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="font-medium text-sm">Kartenzahlung bei Lieferung</span>
            {paymentType === 'card_on_delivery' && (
              <FiCheck className="text-green-600 text-base" />
            )}
          </button>
        </div>
      </div>

      {/* Kupon Kodu */}
      <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
        <h2 className="font-semibold text-gray-900 text-sm mb-1.5 flex items-center gap-1.5">
          <FiTag className="w-4 h-4" />
          <span>Gutscheincode</span>
        </h2>
        {appliedCoupon ? (
          <div className="flex items-center justify-between p-1.5 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-1.5">
              <FiCheck className="text-green-600 w-4 h-4" />
              <span className="font-medium text-sm text-green-800">{appliedCoupon.code}</span>
              <span className="text-xs text-green-600">
                -{couponDiscount.toFixed(2)} €
              </span>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-red-600 hover:text-red-700"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Gutscheincode eingeben"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleValidateCoupon();
                }
              }}
            />
            <button
              onClick={handleValidateCoupon}
              disabled={validatingCoupon || !couponCode.trim()}
              className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validatingCoupon ? '...' : 'Anwenden'}
            </button>
          </div>
        )}
      </div>

      {/* Sipariş Notu */}
      <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
        <h2 className="font-semibold text-gray-900 text-sm mb-1.5">Bestellnotiz (optional)</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z.B. Klingel defekt, bitte anrufen"
          className="w-full border border-gray-300 rounded-lg p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
          rows="2"
        />
      </div>

      {/* Sipariş Özeti */}
      <div className="bg-white rounded-lg shadow-sm p-2 mb-2">
        <h2 className="font-semibold text-gray-900 text-sm mb-1.5">Bestellübersicht</h2>

        <div className="space-y-1.5 mb-2">
          {items.map((item) => (
            <div 
              key={`${item.productId}-${item.variantId || 'no-variant'}`} 
              className="flex justify-between text-xs cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors"
              onClick={() => navigate(`/produkt/${item.productId}`)}
            >
              <div className="flex-1">
                <span className="text-gray-600">
                  {item.quantity}x {item.name}
                </span>
                {item.variantName && (
                  <div className="text-[10px] text-purple-600 font-medium mt-0.5">
                    {item.variantName}
                  </div>
                )}
              </div>
              <span className="text-gray-900 font-medium">
                {(parseFloat(item.price) * item.quantity).toFixed(2)} €
              </span>
            </div>
          ))}
        </div>

        {deliveryTimingMode === 'SCHEDULED' && scheduledDisplayLabel && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800">
            <FiClock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Vorbestellung</p>
              <p className="text-[11px]">{scheduledDisplayLabel}</p>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-1.5 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Zwischensumme</span>
            <span className="text-gray-900">{subtotal.toFixed(2)} €</span>
          </div>
          {campaignDiscount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Kampagnenrabatt</span>
              <span>-{campaignDiscount.toFixed(2)} €</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Gutscheinrabatt</span>
              <span>-{couponDiscount.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Liefergebühr</span>
            <span className={isFreeShippingFinal ? "text-green-600 font-medium" : "text-gray-900"}>
              {isFreeShippingFinal ? 'Kostenlos' : `${deliveryFee.toFixed(2)} €`}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5">
            <span>Gesamt</span>
            <span className="text-green-600">{total.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Sipariş Butonu - Fixed Bottom */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 p-2 shadow-lg max-w-[600px] mx-auto"
      >
        <button
          onClick={handleOrderButtonClick}
          disabled={loading || orderSuccess || (orderType === 'delivery' && !selectedAddressId)}
          className={`w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm btn-press ${
            loading ? 'animate-pulse' : ''
          } ${orderSuccess ? 'animate-success-pulse' : ''}`}
        >
          {orderSuccess ? (
            <span className="flex items-center justify-center gap-2">
              <FiCheck className="w-4 h-4 animate-success-check" />
              <span>Erfolgreich!</span>
            </span>
          ) : loading ? (
            'Wird verarbeitet...'
          ) : (
            `Jetzt bestellen • ${total.toFixed(2)} €`
          )}
        </button>
      </motion.div>

      {/* Onay Modalı */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4 mt-0">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-4"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Bestellung bestätigen
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Möchten Sie die Bestellung wirklich aufgeben?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handlePlaceOrder}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Bestätigen
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default SiparisVer;
