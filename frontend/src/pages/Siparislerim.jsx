import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'react-toastify';
import {
  FiPackage,
  FiTruck,
  FiCheck,
  FiX,
  FiClock,
  FiShoppingBag,
  FiChevronRight,
  FiRefreshCw,
  FiCheckCircle,
} from 'react-icons/fi';
import orderService from '../services/orderService';
import useCartStore from '../store/cartStore';

// Sipariş durumu badge component
export function OrderStatusBadge({ status, orderType }) {
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
      label: orderType === 'pickup' ? 'Bereit' : 'Unterwegs',
      icon: orderType === 'pickup' ? FiCheckCircle : FiTruck,
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bgColor} ${config.textColor}`}
    >
      <Icon className={`text-xs ${config.iconColor}`} />
      {config.label}
    </span>
  );
}

// Sipariş kartı component
function OrderCard({ order, onReorder }) {
  const navigate = useNavigate();
  const [reordering, setReordering] = useState(false);

  const handleReorder = async (e) => {
    e.stopPropagation(); // Kartın onClick'ini tetiklememek için
    setReordering(true);
    try {
      await onReorder(order.orderItems);
    } finally {
      setReordering(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="bg-white rounded-lg shadow-sm p-2.5 mb-2 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/bestellung/${order.id}`)}
        >
          <p className="font-semibold text-sm text-gray-900 truncate">Bestellung #{order.orderNo}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {format(new Date(order.createdAt), 'dd. MMMM yyyy, HH:mm', { locale: de })}
          </p>
          {order.isPreorder && order.scheduledFor && (
            <p className="text-[10px] text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
              <FiClock className="w-3 h-3" />
              Vorbest. {format(new Date(order.scheduledFor), 'dd.MM.yyyy HH:mm', { locale: de })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReorder}
            disabled={reordering}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
            title="Erneut bestellen"
          >
            <FiRefreshCw className={`w-4 h-4 ${reordering ? 'animate-spin' : ''}`} />
          </button>
          <OrderStatusBadge status={order.status} orderType={order.type} />
        </div>
      </div>

      {/* Ürün sayısı ve tutar */}
      <div
        className="flex items-center justify-between py-1.5 border-t border-gray-100 cursor-pointer"
        onClick={() => navigate(`/bestellung/${order.id}`)}
      >
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <FiShoppingBag className="text-gray-400 w-3 h-3" />
          <span>
            {order.orderItems?.length || 0}{' '}
            {order.orderItems?.length === 1 ? 'Artikel' : 'Artikel'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-gray-900">
            {parseFloat(order.total).toFixed(2)} €
          </span>
          <FiChevronRight className="text-gray-400 w-4 h-4" />
        </div>
      </div>

      {/* Teslimat türü */}
      <div
        className="flex items-center gap-1.5 text-xs text-gray-600 mt-1.5 cursor-pointer"
        onClick={() => navigate(`/bestellung/${order.id}`)}
      >
        {order.type === 'delivery' ? (
          <>
            <FiTruck className="text-gray-400 w-3 h-3" />
            <span>Lieferung</span>
          </>
        ) : (
          <>
            <FiPackage className="text-gray-400 w-3 h-3" />
            <span>Abholung</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Ana Siparişlerim Sayfası
function Siparislerim() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | active | completed
  const { reorderFromOrder } = useCartStore();

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

  // Siparişi tekrar et
  const handleReorder = async (orderItems) => {
    try {
      await reorderFromOrder(orderItems);
      toast.success('Produkte wurden zum Warenkorb hinzugefügt!');
      // Kısa bir gecikme sonra sepete yönlendir
      setTimeout(() => {
        navigate('/warenkorb');
      }, 500);
    } catch (error) {
      console.error('Reorder hatası:', error);
      toast.error('Fehler beim Hinzufügen der Produkte');
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
      <div className="container-mobile py-3">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded mb-3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24 mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile py-3 pb-20">
      <h1 className="text-lg font-bold text-gray-900 mb-3">Meine Bestellungen</h1>

      {/* Filtre butonları */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alle ({orders.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
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
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
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
          className="text-center py-8"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FiPackage className="text-gray-400 text-2xl" />
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1.5">Keine Bestellungen</h2>
          <p className="text-xs text-gray-600 mb-4">
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
            <OrderCard key={order.id} order={order} onReorder={handleReorder} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Siparislerim;
