import { motion } from 'framer-motion';
import { FiClock } from 'react-icons/fi';
import Loading from '../common/Loading';

function OrderCompletionTimeCard({ data, loading }) {
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FiClock className="text-teal-600" />
          Bestellabschlusszeit
        </h3>
        <div className="text-center text-gray-500 py-8">
          Keine Daten verfügbar
        </div>
      </div>
    );
  }

  const averageHours = data.averageHours || 0;
  const totalDelivered = data.totalDelivered || 0;
  const averageDays = (averageHours / 24).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm p-4 md:p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiClock className="text-teal-600" />
        Bestellabschlusszeit
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-teal-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Durchschnittliche Zeit</p>
            <p className="text-2xl font-bold text-gray-900">
              {averageDays} Tage
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ({averageHours.toFixed(1)} Stunden)
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Gelieferte Bestellungen</p>
            <p className="text-xl font-bold text-teal-600">
              {totalDelivered}
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          * Berechnet aus dem Zeitraum zwischen Bestellaufgabe und Lieferung
        </div>
      </div>
    </motion.div>
  );
}

export default OrderCompletionTimeCard;

