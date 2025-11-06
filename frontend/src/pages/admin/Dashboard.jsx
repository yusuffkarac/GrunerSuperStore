import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { OrderStatusBadge } from '../Siparislerim';
import {
  FiPackage,
  FiShoppingBag,
  FiUsers,
  FiDollarSign,
  FiTrendingUp,
  FiAlertTriangle,
} from 'react-icons/fi';
import adminService from '../../services/adminService';

function StatCard({ icon: Icon, title, value, change, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <FiTrendingUp className="text-green-600 text-sm" />
              <span className="text-sm text-green-600">{change}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="text-white text-2xl" />
        </div>
      </div>
    </motion.div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    recentOrders: [],
    lowStockProducts: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {

      const [statsResponse, lowStockResponse] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getLowStockProducts(5),
      ]);

      console.log('✅ Dashboard stats response:', statsResponse);
      setStats(statsResponse.data.stats);
      
      if (lowStockResponse?.data?.products) {
        setLowStockProducts(lowStockResponse.data.products);
      }
    } catch (error) {
      console.error('❌ Dashboard stats error:', error);
      console.error('❌ Error details:', error.response || error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">Übersicht Ihrer Geschäftsstatistiken</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          icon={FiPackage}
          title="Gesamtprodukte"
          value={stats.totalProducts}
          color="bg-blue-600"
        />
        <StatCard
          icon={FiShoppingBag}
          title="Bestellungen"
          value={stats.totalOrders}
          change="+12% diese Woche"
          color="bg-green-600"
        />
        <StatCard
          icon={FiUsers}
          title="Benutzer"
          value={stats.totalUsers}
          change="+5% diesen Monat"
          color="bg-purple-600"
        />
        <StatCard
          icon={FiDollarSign}
          title="Umsatz"
          value={`${(Number(stats.totalRevenue) || 0).toFixed(2)} €`}
          change="+18% diesen Monat"
          color="bg-amber-600"
        />
      </div>

      {/* Düşük Stoklu Ürünler */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiAlertTriangle className="text-amber-600" />
              Niedrige Lagerbestände
            </h2>
            <Link
              to="/admin/produkte"
              className="text-sm text-primary-700 hover:text-primary-800 font-medium"
            >
              Alle anzeigen
            </Link>
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Produkt
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Kategorie
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Lager
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Schwellenwert
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {product.category?.name || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-red-600 font-medium">{product.stock}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {product.lowStockLevel || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{product.name}</span>
                  <span className="text-lg font-bold text-red-600">{product.stock}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {product.category?.name || '-'}
                </div>
                {product.lowStockLevel && (
                  <div className="text-xs text-gray-500">
                    Schwellenwert: {product.lowStockLevel}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Letzte Bestellungen</h2>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Bestellung
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Kunde
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                  Betrag
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders?.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">#{order.orderNo}</td>
                    <td className="py-3 px-4 text-sm">{order.user?.email}</td>
                    <td className="py-3 px-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      {parseFloat(order.total).toFixed(2)} €
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-500">
                    Keine Bestellungen gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {stats.recentOrders?.length > 0 ? (
            stats.recentOrders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">#{order.orderNo}</span>
                  <span className="text-lg font-bold text-gray-900">
                    {parseFloat(order.total).toFixed(2)} €
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">{order.user?.email}</div>
                <OrderStatusBadge status={order.status} />
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              Keine Bestellungen gefunden
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
