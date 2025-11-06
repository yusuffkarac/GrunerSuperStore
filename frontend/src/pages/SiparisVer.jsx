import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FiMapPin,
  FiTruck,
  FiShoppingBag,
  FiCreditCard,
  FiPlus,
  FiCheck,
} from 'react-icons/fi';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import userService from '../services/userService';
import orderService from '../services/orderService';

function SiparisVer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [orderType, setOrderType] = useState('delivery'); // delivery | pickup
  const [paymentType, setPaymentType] = useState('cash'); // cash | card_on_delivery
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const subtotal = getTotal();
  const deliveryFee = orderType === 'delivery' ? 3.99 : 0;
  const total = subtotal + deliveryFee;

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
      } else if (loadedAddresses.length > 0) {
        setSelectedAddressId(loadedAddresses[0].id);
      }
    } catch (error) {
      console.error('Adres yükleme hatası:', error);
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Sipariş ver
  const handlePlaceOrder = async () => {
    // Validasyon
    if (orderType === 'delivery' && !selectedAddressId) {
      toast.error('Bitte wählen Sie eine Lieferadresse');
      return;
    }

    if (items.length === 0) {
      toast.error('Ihr Warenkorb ist leer');
      return;
    }

    setLoading(true);

    try {
      // Sepetteki ürünleri items formatına çevir
      const orderItems = items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      }));

      const orderData = {
        type: orderType,
        paymentType,
        note: note || undefined,
        items: orderItems,
        ...(orderType === 'delivery' && { addressId: selectedAddressId }),
      };

      console.log('Sipariş data:', orderData);

      const response = await orderService.createOrder(orderData);

      // Sepeti temizle
      await clearCart();

      toast.success('Bestellung erfolgreich aufgegeben!');

      // Sipariş detay sayfasına yönlendir
      navigate(`/siparis/${response.data.order.id}`);
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
    <div className="container-mobile py-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Bestellung aufgeben</h1>

      {/* Teslimat Türü */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
        <h2 className="font-semibold text-gray-900 text-base mb-2 flex items-center gap-2">
          <FiTruck />
          <span>Lieferart</span>
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setOrderType('delivery')}
            className={`p-3 rounded-lg border-2 transition-all ${
              orderType === 'delivery'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <FiTruck
              className={`mx-auto mb-2 text-xl ${
                orderType === 'delivery' ? 'text-green-600' : 'text-gray-400'
              }`}
            />
            <p className="font-medium text-sm">Lieferung</p>
            <p className="text-xs text-gray-500 mt-1">{deliveryFee.toFixed(2)} €</p>
          </button>

          <button
            onClick={() => setOrderType('pickup')}
            className={`p-3 rounded-lg border-2 transition-all ${
              orderType === 'pickup'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <FiShoppingBag
              className={`mx-auto mb-2 text-xl ${
                orderType === 'pickup' ? 'text-green-600' : 'text-gray-400'
              }`}
            />
            <p className="font-medium text-sm">Abholung</p>
            <p className="text-xs text-gray-500 mt-1">Kostenlos</p>
          </button>
        </div>
      </div>

      {/* Teslimat Adresi (sadece delivery için) */}
      {orderType === 'delivery' && (
        <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
              <FiMapPin />
              <span>Lieferadresse</span>
            </h2>
            <button
              onClick={() => navigate('/profil?tab=addresses', { state: { returnTo: '/siparis-ver' } })}
              className="text-green-600 text-sm flex items-center gap-1"
            >
              <FiPlus />
              <span>Neu</span>
            </button>
          </div>

          {loadingAddresses ? (
            <div className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded-lg"></div>
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600 text-sm mb-3">Keine Adresse gefunden</p>
              <button
                onClick={() => navigate('/profil?tab=addresses', { state: { returnTo: '/siparis-ver' } })}
                className="text-green-600 text-sm"
              >
                Neue Adresse hinzufügen
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((address) => (
                <button
                  key={address.id}
                  onClick={() => setSelectedAddressId(address.id)}
                  className={`w-full text-left p-2.5 rounded-lg border-2 transition-all ${
                    selectedAddressId === address.id
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{address.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {address.street} {address.houseNumber}
                        {address.addressLine2 && `, ${address.addressLine2}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {address.postalCode} {address.city}, {address.state}
                      </p>
                    </div>
                    {selectedAddressId === address.id && (
                      <FiCheck className="text-green-600 text-xl flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ödeme Yöntemi */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
        <h2 className="font-semibold text-gray-900 text-base mb-2 flex items-center gap-2">
          <FiCreditCard />
          <span>Zahlungsart</span>
        </h2>

        <div className="space-y-2">
          <button
            onClick={() => setPaymentType('cash')}
            className={`w-full text-left p-2.5 rounded-lg border-2 transition-all flex items-center justify-between ${
              paymentType === 'cash'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="font-medium">Barzahlung</span>
            {paymentType === 'cash' && <FiCheck className="text-green-600 text-xl" />}
          </button>

          <button
            onClick={() => setPaymentType('card_on_delivery')}
            className={`w-full text-left p-2.5 rounded-lg border-2 transition-all flex items-center justify-between ${
              paymentType === 'card_on_delivery'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="font-medium">Kartenzahlung bei Lieferung</span>
            {paymentType === 'card_on_delivery' && (
              <FiCheck className="text-green-600 text-xl" />
            )}
          </button>
        </div>
      </div>

      {/* Sipariş Notu */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
        <h2 className="font-semibold text-gray-900 text-base mb-2">Bestellnotiz (optional)</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z.B. Klingel defekt, bitte anrufen"
          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
          rows="2"
        />
      </div>

      {/* Sipariş Özeti */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
        <h2 className="font-semibold text-gray-900 text-base mb-2">Bestellübersicht</h2>

        <div className="space-y-2 mb-3">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId || 'no-variant'}`} className="flex justify-between text-sm">
              <div className="flex-1">
                <span className="text-gray-600">
                  {item.quantity}x {item.name}
                </span>
                {item.variantName && (
                  <div className="text-xs text-purple-600 font-medium mt-0.5">
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

        <div className="border-t border-gray-200 pt-2 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Zwischensumme</span>
            <span className="text-gray-900">{subtotal.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Liefergebühr</span>
            <span className="text-gray-900">{deliveryFee.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
            <span>Gesamt</span>
            <span className="text-green-600">{total.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Sipariş Butonu - Fixed Bottom */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg max-w-[600px] mx-auto"
      >
        <button
          onClick={handlePlaceOrder}
          disabled={loading || (orderType === 'delivery' && !selectedAddressId)}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Wird verarbeitet...' : `Jetzt bestellen • ${total.toFixed(2)} €`}
        </button>
      </motion.div>
    </div>
  );
}

export default SiparisVer;
