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

  const handleDeleteRequest = () => {
    // Parent component'e delete request gönder - dialog'u parent açacak
    if (onDelete) {
      onDelete(list.id, list.name);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-1">
            {list.name ? String(list.name) : '-'}
          </h3>
          {getStatusBadge(list.status)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500 block mb-0.5">Erstellt am</span>
            <span className="text-gray-900 font-medium">{formatDate(list.createdAt)}</span>
          </div>
          <div>
            <span className="text-gray-500 block mb-0.5">Aktualisiert am</span>
            <span className="text-gray-900 font-medium">{formatDate(list.updatedAt)}</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <FiPackage className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{list.orders?.length || 0} Produkt(e)</span>
          </div>
          {list.admin && list.admin.firstName && (
            <div className="text-xs text-gray-600">
              <span className="text-gray-500">Erstellt von:</span> <span className="font-medium">{String(list.admin.firstName)}</span>
            </div>
          )}
          {list.supplierEmail && (
            <div className="flex items-center gap-1.5 text-xs">
              <FiMail className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">{String(list.supplierEmail)}</span>
            </div>
          )}
        </div>

        {/* Notiz */}
        {list.note && (
          <div className="text-xs bg-blue-50 border border-blue-100 p-2.5 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-900 whitespace-nowrap">Notiz:</span>
              <span className="text-blue-800">{String(list.note)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {(list.status === 'pending' || list.status === 'ordered') && (
            <button
              onClick={() => handleUpdateStatus('delivered')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg transition-colors flex-1 min-w-[100px]"
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
              <FiCheck className="w-3.5 h-3.5" />
              Erhalten
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 hidden"
          >
            <FiDownload className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
          >
            <FiPrinter className="w-3.5 h-3.5" />
            Drucken
          </button>
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(list)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            >
              Details
              <FiChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDeleteRequest}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
          >
            <FiX className="w-3.5 h-3.5" />
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

export default StockOrderListCard;

