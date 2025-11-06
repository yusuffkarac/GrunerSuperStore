import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  FiPackage,
  FiTruck,
  FiCheck,
  FiX,
  FiClock,
  FiShoppingBag,
  FiChevronRight,
} from 'react-icons/fi';
import orderService from '../services/orderService';

// Sipariş durumu badge component
export function OrderStatusBadge({ status }) {
  const statusConfig = {
    pending: {
      label: 'Ausstehend',
      icon: FiClock,
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      iconColor: 'text-amber-600',
    },
    accepted: {
      label: 'Akzeptiert',
      icon: FiCheck,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
    preparing: {
      label: 'In Vorbereitung',
      icon: FiPackage,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      iconColor: 'text-purple-600',
    },
    shipped: {
      label: 'Unterwegs',
      icon: FiTruck,
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-800',
      iconColor: 'text-indigo-600',
    },
    delivered: {
      label: 'Geliefert',
      icon: FiCheck,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
    },
    cancelled: {
      label: 'Storniert',
      icon: FiX,
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      <Icon className={`text-sm ${config.iconColor}`} />
      {config.label}
    </span>
  );
}

// Sipariş kartı component
function OrderCard({ order }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={() => navigate(`/siparis/${order.id}`)}
      className="bg-white rounded-lg shadow-sm p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-900">Bestellung #{order.orderNo}</p>
          <p className="text-xs text-gray-500 mt-1">
            {format(new Date(order.createdAt), 'dd. MMMM yyyy, HH:mm', { locale: de })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Ürün sayısı ve tutar */}
      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FiShoppingBag className="text-gray-400" />
          <span>
            {order.orderItems?.length || 0}{' '}
            {order.orderItems?.length === 1 ? 'Artikel' : 'Artikel'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            {parseFloat(order.total).toFixed(2)} €
          </span>
          <FiChevronRight className="text-gray-400" />
        </div>
      </div>

      {/* Teslimat türü */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
        {order.type === 'delivery' ? (
          <>
            <FiTruck className="text-gray-400" />
            <span>Lieferung</span>
          </>
        ) : (
          <>
            <FiPackage className="text-gray-400" />
            <span>Abholung</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Ana Siparişlerim Sayfası
function Siparislerim() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | active | completed

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await orderService.getOrders();
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Sipariş yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrelenmiş siparişler
  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    if (filter === 'active') {
      return ['pending', 'accepted', 'preparing', 'shipped'].includes(order.status);
    }
    if (filter === 'completed') {
      return ['delivered', 'cancelled'].includes(order.status);
    }
    return true;
  });

  // Loading state
  if (loading) {
    return (
      <div className="container-mobile py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-40 mb-6"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32 mb-3"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile py-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meine Bestellungen</h1>

      {/* Filtre butonları */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alle ({orders.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Aktiv (
          {orders.filter((o) =>
            ['pending', 'accepted', 'preparing', 'shipped'].includes(o.status)
          ).length}
          )
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'completed'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Abgeschlossen (
          {orders.filter((o) => ['delivered', 'cancelled'].includes(o.status)).length})
        </button>
      </div>

      {/* Siparişler listesi */}
      {filteredOrders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <FiPackage className="text-gray-400 text-4xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Keine Bestellungen</h2>
          <p className="text-gray-600 mb-6">
            {filter === 'all'
              ? 'Sie haben noch keine Bestellungen aufgegeben'
              : `Keine ${
                  filter === 'active' ? 'aktiven' : 'abgeschlossenen'
                } Bestellungen`}
          </p>
        </motion.div>
      ) : (
        <div>
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Siparislerim;
