import React from 'react';
import { FiPackage, FiDownload, FiPrinter, FiChevronRight, FiMail, FiX, FiCheck } from 'react-icons/fi';
import adminService from '../../services/adminService';
import { toast } from 'react-toastify';
import { useTheme } from '../../contexts/ThemeContext';

function StockOrderListCard({ list, onStatusUpdate, onViewDetails, onDelete }) {
  const { themeColors } = useTheme();
  const getStatusBadge = (status) => {
    // Status bir obje ise, string'e çevir
    const statusString = typeof status === 'string' ? status : (status?.status || String(status || 'pending'));
    
    const badges = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Ausstehend' },
      ordered: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Bestellt' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Erhalten' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Storniert' },
    };
    const badge = badges[statusString] || badges.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDownloadPDF = async () => {
    try {
      await adminService.downloadStockOrderListPDF(list.id);
      toast.success('PDF erfolgreich heruntergeladen');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Fehler beim Herunterladen der PDF';
      toast.error(errorMessage);
    }
  };

  const handlePrintPDF = async () => {
    try {
      await adminService.printStockOrderListPDF(list.id);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Fehler beim Drucken der PDF';
      toast.error(errorMessage);
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await adminService.updateStockOrderListStatus(list.id, status);
      toast.success('Bestellstatus erfolgreich aktualisiert');
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Fehler beim Aktualisieren des Status';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Möchten Sie diese Bestellliste wirklich löschen?')) {
      return;
    }

    try {
      await adminService.deleteStockOrderList(list.id);
      toast.success('Bestellliste erfolgreich gelöscht');
      if (onDelete) {
        onDelete();
      } else if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Fehler beim Löschen der Liste';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-4 md:p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
              {list.name ? String(list.name) : '-'}
            </h3>
            <p className="text-xs md:text-sm text-gray-500">
              Erstellt am: {formatDate(list.createdAt)}
            </p>
          </div>
          {getStatusBadge(list.status)}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiPackage className="w-4 h-4" />
            <span>{list.orders?.length || 0} Produkt(e)</span>
          </div>
          {list.admin && list.admin.firstName && (
            <div className="text-xs text-gray-500">
              Erstellt von: {String(list.admin.firstName)}
            </div>
          )}
          {list.supplierEmail && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <FiMail className="w-3 h-3" />
              <span>{String(list.supplierEmail)}</span>
            </div>
          )}
          {list.note && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Notiz:</strong> {String(list.note)}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(list.status === 'pending' || list.status === 'ordered') && (
            <button
              onClick={() => handleUpdateStatus('delivered')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg transition-colors"
              style={{
                backgroundColor: themeColors?.primary?.[600] || '#16a34a'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = themeColors?.primary?.[700] || '#15803d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = themeColors?.primary?.[600] || '#16a34a';
              }}
            >
              <FiCheck className="w-4 h-4" />
              Erhalten
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
          >
            <FiDownload className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <FiPrinter className="w-4 h-4" />
            Drucken
          </button>
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(list)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Details
              <FiChevronRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
          >
            <FiX className="w-4 h-4" />
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

export default StockOrderListCard;

