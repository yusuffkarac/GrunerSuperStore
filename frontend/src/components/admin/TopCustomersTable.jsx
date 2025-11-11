import { FiUser, FiMail } from 'react-icons/fi';
import Loading from '../common/Loading';
import EmptyState from '../common/EmptyState';

function TopCustomersTable({ data, loading }) {
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
          <FiUser className="text-blue-600" />
          Top Kunden
        </h3>
        <EmptyState message="Keine Kundendaten verfügbar" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiUser className="text-blue-600" />
        Top Kunden
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                #
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                Kunde
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                E-Mail
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                Bestellungen
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                Gesamtausgaben
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((customer, index) => (
              <tr
                key={customer.userId || index}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  {customer.customerName || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {customer.email || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                  {customer.orderCount}
                </td>
                <td className="py-3 px-4 text-sm text-right font-medium text-green-600">
                  {Number(customer.totalSpent || 0).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TopCustomersTable;

