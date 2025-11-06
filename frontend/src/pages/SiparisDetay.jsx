import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'react-toastify';
import {
  FiArrowLeft,
  FiPackage,
  FiTruck,
  FiMapPin,
  FiCreditCard,
  FiFileText,
} from 'react-icons/fi';
import orderService from '../services/orderService';

// OrderStatusBadge'i Siparislerim'den kopyalayabilirsiniz veya ortak bir component yapabilirsiniz
import { OrderStatusBadge } from './Siparislerim';

function SiparisDetay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      const response = await orderService.getOrderById(id);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Sipariş detay hatası:', error);
      toast.error('Bestellung konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-mobile py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="bg-gray-200 rounded-lg h-40 mb-4"></div>
          <div className="bg-gray-200 rounded-lg h-60"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-mobile py-6">
        <p className="text-center text-gray-600">Bestellung nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="container-mobile py-4 pb-20">
      {/* Header */}
      <button
        onClick={() => navigate('/siparislerim')}
        className="flex items-center gap-2 text-green-600 mb-4 hover:text-green-700 transition-colors"
      >
        <FiArrowLeft className="text-lg" />
        <span className="text-sm font-medium">Zurück zu Bestellungen</span>
      </button>

      {/* Sipariş Bilgileri */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Bestellung #{order.orderNo}</h1>
            <p className="text-sm text-gray-500">
              {format(new Date(order.createdAt), 'dd. MMMM yyyy, HH:mm', { locale: de })}
            </p>
          </div>
          <div className="ml-4">
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Teslimat/Ödeme Bilgileri */}
        <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-100">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5">
              {order.type === 'delivery' ? (
                <FiTruck className="text-gray-400 text-lg" />
              ) : (
                <FiPackage className="text-gray-400 text-lg" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Lieferart</p>
              <p className="text-sm font-semibold text-gray-900">
                {order.type === 'delivery' ? 'Lieferung' : 'Abholung'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5">
              <FiCreditCard className="text-gray-400 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Zahlung</p>
              <p className="text-sm font-semibold text-gray-900">
                {order.paymentType === 'cash' ? 'Bar' : 'Karte'}
              </p>
            </div>
          </div>
        </div>

        {/* Adres bilgisi */}
        {order.address && (
          <div className="py-4 border-t border-gray-100 flex items-start gap-2.5">
            <div className="mt-0.5">
              <FiMapPin className="text-gray-400 text-lg" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1.5">Lieferadresse</p>
              {order.address.title && (
                <p className="text-sm font-semibold text-gray-900 mb-1">{order.address.title}</p>
              )}
              <p className="text-sm text-gray-700 leading-relaxed">
                {order.address.street} {order.address.houseNumber}
                <br />
                {order.address.postalCode} {order.address.city}
              </p>
            </div>
          </div>
        )}

        {/* Not */}
        {order.note && (
          <div className="pt-4 border-t border-gray-100 flex items-start gap-2.5">
            <div className="mt-0.5">
              <FiFileText className="text-gray-400 text-lg" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Notiz</p>
              <p className="text-sm text-gray-700 leading-relaxed">{order.note}</p>
            </div>
          </div>
        )}
      </div>

      {/* Ürünler */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4 text-base">Bestellte Artikel</h2>
        <div className="space-y-4">
          {order.orderItems?.map((item) => (
            <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiPackage className="text-gray-400 text-xl" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm mb-1">{item.productName}</p>
                {item.variantName && (
                  <p className="text-xs text-purple-600 font-medium mt-0.5 mb-1">
                    {item.variantName}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {parseFloat(item.price).toFixed(2)} € × {item.quantity}
                </p>
              </div>
              <div className="flex-shrink-0">
                <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                  {(parseFloat(item.price) * item.quantity).toFixed(2)} €
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Toplam */}
        <div className="mt-5 pt-4 border-t border-gray-200 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Zwischensumme</span>
            <span className="text-gray-900 font-medium">{parseFloat(order.subtotal).toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Liefergebühr</span>
            <span className="text-gray-900 font-medium">{parseFloat(order.deliveryFee).toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3 mt-3 border-t border-gray-200">
            <span className="text-gray-900">Gesamt</span>
            <span className="text-green-600">{parseFloat(order.total).toFixed(2)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SiparisDetay;
