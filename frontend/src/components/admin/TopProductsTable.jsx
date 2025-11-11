import { FiPackage, FiTrendingUp } from 'react-icons/fi';
import Loading from '../common/Loading';
import EmptyState from '../common/EmptyState';

function TopProductsTable({ data, loading }) {
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
          <FiTrendingUp className="text-orange-600" />
          Meistverkaufte Produkte
        </h3>
        <EmptyState message="Keine Verkaufsdaten verfügbar" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiTrendingUp className="text-orange-600" />
        Meistverkaufte Produkte
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                #
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Produkt
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Kategorie
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                Verkaufsmenge
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                Umsatz
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((product, index) => (
              <tr
                key={product.productId || index}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  {product.productName}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {product.categoryName || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                  {product.salesCount}
                </td>
                <td className="py-3 px-4 text-sm text-right font-medium text-green-600">
                  {Number(product.revenue || 0).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TopProductsTable;

