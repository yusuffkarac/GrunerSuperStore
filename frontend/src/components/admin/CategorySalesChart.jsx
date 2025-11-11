import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiBarChart2 } from 'react-icons/fi';
import Loading from '../common/Loading';

function CategorySalesChart({ data, loading }) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data
      .slice(0, 10) // Top 10 kategoriler
      .map((item) => ({
        name: item.categoryName.length > 15
          ? `${item.categoryName.substring(0, 15)}...`
          : item.categoryName,
        fullName: item.categoryName,
        revenue: Number(item.totalRevenue || 0).toFixed(2),
        orders: item.orderCount,
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
          <FiBarChart2 className="text-blue-600" />
          Kategorie-Umsatz
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
        <FiBarChart2 className="text-blue-600" />
        Kategorie-Umsatz
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            stroke="#6b7280"
            fontSize={12}
            tick={{ fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tick={{ fill: '#6b7280' }}
            tickFormatter={(value) => `€${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            formatter={(value, name) => {
              if (name === 'revenue') {
                return [`€${Number(value).toFixed(2)}`, 'Umsatz'];
              }
              return [value, name === 'orders' ? 'Bestellungen' : name];
            }}
            labelFormatter={(label) => {
              const item = chartData.find((d) => d.name === label);
              return item ? item.fullName : label;
            }}
          />
          <Legend />
          <Bar dataKey="revenue" fill="#3b82f6" name="Umsatz (€)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CategorySalesChart;

