import { useState, useEffect } from 'react';
import { FiRefreshCw, FiEye, FiX, FiEdit2, FiArchive } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import AlertDialog from '../../components/common/AlertDialog';

function BulkPriceUpdates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'reverted'
  const [expandedId, setExpandedId] = useState(null);
  const [revertingId, setRevertingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editEndDate, setEditEndDate] = useState('');
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [revertTargetId, setRevertTargetId] = useState(null);

  useEffect(() => {
    fetchUpdates();
  }, [page, filter]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        filter,
      };
      const response = await adminService.getBulkPriceUpdates(params);
      setUpdates(response.data.updates || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Toplu fiyat güncellemeleri yüklenemedi:', error);
      toast.error('Fehler beim Laden der Massenpreisaktualisierungen');
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (id) => {
    setRevertTargetId(id);
    setShowRevertDialog(true);
  };

  const confirmRevert = async () => {
    if (!revertTargetId) return;

    try {
      setRevertingId(revertTargetId);
      await adminService.revertBulkPriceUpdate(revertTargetId);
      toast.success('Massenpreisaktualisierung erfolgreich rückgängig gemacht');
      fetchUpdates();
    } catch (error) {
      console.error('Geri alma hatası:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Rückgängigmachen');
    } finally {
      setRevertingId(null);
      setRevertTargetId(null);
      setShowRevertDialog(false);
    }
  };

  const handleEdit = (update) => {
    if (update.updateType !== 'TEMPORARY') return;
    setEditingId(update.id);
    // Datetime-local formatına çevir (YYYY-MM-DDTHH:mm)
    if (update.temporaryPriceEndDate) {
      const date = new Date(update.temporaryPriceEndDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setEditEndDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setEditEndDate('');
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editEndDate) {
      toast.error('Bitte geben Sie ein Enddatum ein');
      return;
    }

    const endDate = new Date(editEndDate);
    const now = new Date();
    if (endDate <= now) {
      toast.error('Das Enddatum muss in der Zukunft liegen');
      return;
    }

    try {
      await adminService.updateBulkPriceUpdateEndDate(id, editEndDate);
      toast.success('Enddatum erfolgreich aktualisiert');
      setEditingId(null);
      setEditEndDate('');
      fetchUpdates();
    } catch (error) {
      console.error('Düzenleme hatası:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren des Enddatums');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditEndDate('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type) => {
    const labels = {
      all: 'Alle Produkte',
      category: 'Kategorie',
      products: 'Ausgewählte Produkte',
    };
    return labels[type] || type;
  };

  const getUpdateTypeLabel = (updateType) => {
    const labels = {
      PERMANENT: 'Permanent',
      TEMPORARY: 'Temporär',
    };
    return labels[updateType] || updateType;
  };

  const getUpdateTypeBadgeColor = (updateType) => {
    if (updateType === 'TEMPORARY') {
      return 'bg-yellow-50 text-yellow-800 border-yellow-300';
    }
    return 'bg-blue-50 text-blue-800 border-blue-300';
  };

  if (loading && updates.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Massenpreisaktualisierungen</h1>
        <p className="text-gray-600">
          Zeigen Sie durchgeführte Massenpreisaktualisierungen an und machen Sie sie bei Bedarf rückgängig
        </p>
      </div>

      {/* Filter ve Yenile Butonu */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setFilter('all');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => {
              setFilter('active');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Aktiv
          </button>
          <button
            onClick={() => {
              setFilter('reverted');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'reverted'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Rückgängig gemacht
          </button>
        </div>
        <button
          onClick={fetchUpdates}
          disabled={loading}
          className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {/* Liste */}
      {updates.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
          <FiArchive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Keine Massenpreisaktualisierungen gefunden</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => {
            const affectedProducts = Array.isArray(update.affectedProducts)
              ? update.affectedProducts
              : [];

            return (
              <div
                key={update.id}
                className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
              >
                <div className="p-4 lg:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getUpdateTypeBadgeColor(update.updateType)}`}>
                          {getUpdateTypeLabel(update.updateType)}
                        </span>
                        {update.isReverted && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                            Rückgängig gemacht
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-semibold">Umfang:</span> {getTypeLabel(update.type)}
                        </p>
                        <p>
                          <span className="font-semibold">Anpassung:</span>{' '}
                          {update.adjustmentType === 'percentage' ? '%' : '€'}{' '}
                          {Math.abs(parseFloat(update.adjustmentValue)).toFixed(2)}
                          {update.adjustmentType === 'percentage' && ' (Prozent)'}
                        </p>
                        <p>
                          <span className="font-semibold">Aktualisiert:</span>{' '}
                          {update.productsUpdated} {update.productsUpdated === 1 ? 'Produkt' : 'Produkte'}
                          {update.variantsUpdated > 0 && `, ${update.variantsUpdated} ${update.variantsUpdated === 1 ? 'Variante' : 'Varianten'}`}
                        </p>
                        <p>
                          <span className="font-semibold">Datum:</span> {formatDate(update.createdAt)}
                        </p>
                        {update.updateType === 'TEMPORARY' && (
                          <div>
                            {editingId === update.id ? (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                                <input
                                  type="datetime-local"
                                  value={editEndDate}
                                  onChange={(e) => setEditEndDate(e.target.value)}
                                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <button
                                  onClick={() => handleSaveEdit(update.id)}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                  Speichern
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            ) : (
                              <p>
                                <span className="font-semibold">Gültigkeit:</span>{' '}
                                {update.temporaryPriceEndDate ? formatDate(update.temporaryPriceEndDate) : '-'}
                              </p>
                            )}
                          </div>
                        )}
                        {update.isReverted && update.revertedAt && (
                          <p className="text-red-600">
                            <span className="font-semibold">Rückgängig gemacht am:</span>{' '}
                            {formatDate(update.revertedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => setExpandedId(expandedId === update.id ? null : update.id)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <FiEye className="w-4 h-4" />
                        {expandedId === update.id ? 'Ausblenden' : 'Details'}
                      </button>
                      {!update.isReverted && update.updateType === 'TEMPORARY' && (
                        <button
                          onClick={() => handleEdit(update)}
                          disabled={editingId === update.id}
                          className="flex-1 px-4 py-2 rounded-lg border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiEdit2 className="w-4 h-4" />
                          Bearbeiten
                        </button>
                      )}
                      {!update.isReverted && (
                        <button
                          onClick={() => handleRevert(update.id)}
                          disabled={revertingId === update.id}
                          className="flex-1 px-4 py-2 rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {revertingId === update.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                              Wird rückgängig gemacht...
                            </>
                          ) : (
                            <>
                              <FiX className="w-4 h-4" />
                              Rückgängig machen
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detaylar */}
                  {expandedId === update.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">Betroffene Produkte</h3>
                      {affectedProducts.length === 0 ? (
                        <p className="text-gray-600 text-sm">Keine Details verfügbar</p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {affectedProducts.map((item, index) => (
                            <div
                              key={index}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                            >
                              <div className="flex flex-col gap-1">
                                {item.productName ? (
                                  <>
                                    <div className="font-semibold text-gray-900">
                                      {item.productName}
                                    </div>
                                    {item.barcode && (
                                      <div className="text-xs text-gray-500">
                                        Barcode: {item.barcode}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-gray-500 italic">
                                    Produktinformationen werden geladen...
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 text-gray-600">
                                <span>Alt: </span>
                                <span className="line-through">€{parseFloat(item.oldPrice || item.oldVariantPrice || 0).toFixed(2)}</span>
                                <span className="ml-2">→ Neu: </span>
                                <span className="font-semibold text-green-600">
                                  €{parseFloat(item.newPrice || item.newVariantPrice || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zurück
          </button>
          <span className="px-4 py-2 text-gray-700">
            Seite {page} von {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Weiter
          </button>
        </div>
      )}

      {/* Revert Confirmation Dialog */}
      <AlertDialog
        isOpen={showRevertDialog}
        onClose={() => {
          setShowRevertDialog(false);
          setRevertTargetId(null);
        }}
        title="Massenpreisaktualisierung rückgängig machen"
        message="Möchten Sie diese Massenpreisaktualisierung wirklich rückgängig machen? Diese Aktion kann nicht rückgängig gemacht werden."
        type="confirm"
        onConfirm={confirmRevert}
        confirmText="Rückgängig machen"
        cancelText="Abbrechen"
      />
    </div>
  );
}

export default BulkPriceUpdates;

