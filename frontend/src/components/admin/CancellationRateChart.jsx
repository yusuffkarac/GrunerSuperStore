import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiAlertCircle } from 'react-icons/fi';
import Loading from '../common/Loading';

function CancellationRateChart({ data, loading }) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((item) => ({
      date: new Date(item.date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
      }),
      cancellationRate: Number(item.cancellationRate || 0),
      totalOrders: item.totalOrders,
      cancelledOrders: item.cancelledOrders,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <Loading />
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FiAlertCircle className="text-red-600" />
          Stornierungsrate
        </h3>
        <div className="text-center text-gray-500 py-8">
          Keine Daten verfügbar
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiAlertCircle className="text-red-600" />
        Stornierungsrate Trend
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={12}
            tick={{ fill: '#6b7280' }}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tick={{ fill: '#6b7280' }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            formatter={(value, name) => {
              if (name === 'cancellationRate') {
                return [`${value}%`, 'Stornierungsrate'];
              }
              return [value, name === 'totalOrders' ? 'Gesamtbestellungen' : 'Stornierte Bestellungen'];
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="cancellationRate"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
            name="Stornierungsrate (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CancellationRateChart;

