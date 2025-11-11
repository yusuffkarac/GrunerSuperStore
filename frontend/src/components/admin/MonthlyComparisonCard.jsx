import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingBag } from 'react-icons/fi';
import Loading from '../common/Loading';

function MonthlyComparisonCard({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-32">
          <Loading />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monatsvergleich</h3>
        <div className="text-center text-gray-500 py-8">
          Keine Daten verfügbar
        </div>
      </div>
    );
  }

  const revenueChange = data.revenueChange || 0;
  const ordersChange = data.ordersChange || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm p-4 md:p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monatsvergleich</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gelir Karşılaştırması */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Umsatz</span>
            {revenueChange !== 0 && (
              <div className={`flex items-center gap-1 ${revenueChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueChange > 0 ? (
                  <FiTrendingUp className="text-sm" />
                ) : (
                  <FiTrendingDown className="text-sm" />
                )}
                <span className="text-sm font-medium">
                  {revenueChange > 0 ? '+' : ''}{revenueChange.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Dieser Monat</p>
              <p className="text-lg font-bold text-gray-900">
                {Number(data.currentMonth?.revenue || 0).toFixed(2)} €
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Letzter Monat</p>
              <p className="text-sm text-gray-600">
                {Number(data.lastMonth?.revenue || 0).toFixed(2)} €
              </p>
            </div>
          </div>
        </div>

        {/* Sipariş Karşılaştırması */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Bestellungen</span>
            {ordersChange !== 0 && (
              <div className={`flex items-center gap-1 ${ordersChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {ordersChange > 0 ? (
                  <FiTrendingUp className="text-sm" />
                ) : (
                  <FiTrendingDown className="text-sm" />
                )}
                <span className="text-sm font-medium">
                  {ordersChange > 0 ? '+' : ''}{ordersChange.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Dieser Monat</p>
              <p className="text-lg font-bold text-gray-900">
                {data.currentMonth?.orders || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Letzter Monat</p>
              <p className="text-sm text-gray-600">
                {data.lastMonth?.orders || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default MonthlyComparisonCard;

