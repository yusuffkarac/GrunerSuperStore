import { FiBarChart2 } from 'react-icons/fi';
import Loading from '../common/Loading';
import EmptyState from '../common/EmptyState';

function CategoryPerformanceTable({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <Loading />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FiBarChart2 className="text-indigo-600" />
          Kategorie-Performance
        </h3>
        <EmptyState message="Keine Kategoriedaten verfügbar" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiBarChart2 className="text-indigo-600" />
        Kategorie-Performance
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Kategorie
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                Bestellungen
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                Gesamtumsatz
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                Ø Bestellwert
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((category) => (
              <tr
                key={category.categoryId}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  {category.categoryName}
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-900">
                  {category.orderCount}
                </td>
                <td className="py-3 px-4 text-sm text-right font-medium text-green-600">
                  {Number(category.totalRevenue || 0).toFixed(2)} €
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-600">
                  {Number(category.averageOrderValue || 0).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CategoryPerformanceTable;

