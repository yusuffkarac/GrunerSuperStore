import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { FiRefreshCw, FiEye, FiX, FiCheck, FiEdit2 } from 'react-icons/fi';

const BulkPriceUpdates = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'reverted'
  const [expandedId, setExpandedId] = useState(null);
  const [revertingId, setRevertingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editEndDate, setEditEndDate] = useState('');

  useEffect(() => {
    fetchUpdates();
  }, [page, filter]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        isReverted: filter === 'reverted' ? true : filter === 'active' ? false : null,
      };
      const response = await adminService.getBulkPriceUpdates(params);
      if (response.success) {
        setUpdates(response.data.updates || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Güncellemeler yüklenirken hata:', error);
      toast.error('Fehler beim Laden der Aktualisierungen');
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (id) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese Aktualisierung rückgängig machen möchten?')) {
      return;
    }

    try {
      setRevertingId(id);
      const response = await adminService.revertBulkPriceUpdate(id);
      if (response.success) {
        toast.success(response.message || 'Aktualisierung erfolgreich rückgängig gemacht');
        fetchUpdates();
      }
    } catch (error) {
      console.error('Geri alma hatası:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Rückgängigmachen');
    } finally {
      setRevertingId(null);
    }
  };

  const handleEdit = (update) => {
    if (update.updateType !== 'TEMPORARY') {
      toast.error('Nur temporäre Preisaktualisierungen können bearbeitet werden');
      return;
    }
    if (update.isReverted) {
      toast.error('Rückgängig gemachte Aktualisierungen können nicht bearbeitet werden');
      return;
    }
    setEditingId(update.id);
    // Mevcut bitiş tarihini formatla (datetime-local için)
    const endDate = update.temporaryPriceEndDate 
      ? new Date(update.temporaryPriceEndDate).toISOString().slice(0, 16)
      : '';
    setEditEndDate(endDate);
  };

  const handleSaveEdit = async (id) => {
    if (!editEndDate) {
      toast.error('Enddatum ist erforderlich');
      return;
    }

    const endDate = new Date(editEndDate);
    if (endDate <= new Date()) {
      toast.error('Enddatum muss in der Zukunft liegen');
      return;
    }

    try {
      // Geçici fiyat güncellemesinin bitiş tarihini güncelle
      const update = updates.find(u => u.id === id);
      if (!update) return;

      const affectedProducts = Array.isArray(update.affectedProducts) 
        ? update.affectedProducts 
        : [];

      // Etkilenen ürünlerin geçici fiyat bitiş tarihlerini güncelle
      const updatePromises = affectedProducts.map(async (product) => {
        try {
          await adminService.updateProduct(product.productId, {
            temporaryPriceEndDate: endDate.toISOString(),
          });
        } catch (error) {
          console.error(`Ürün güncelleme hatası (${product.productId}):`, error);
        }
      });

      await Promise.all(updatePromises);

      // BulkPriceUpdate kaydını güncelle
      // Not: Backend'de bu kaydı güncellemek için bir endpoint yok, 
      // ama en azından ürünlerin bitiş tarihleri güncellendi
      
      toast.success('Enddatum für temporäre Preise erfolgreich aktualisiert');
      setEditingId(null);
      setEditEndDate('');
      fetchUpdates();
    } catch (error) {
      console.error('Düzenleme hatası:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Bearbeiten');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditEndDate('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('de-DE', {
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
    return updateType === 'TEMPORARY' ? 'Temporär' : 'Permanent';
  };

  const getUpdateTypeBadgeColor = (updateType) => {
    return updateType === 'TEMPORARY' 
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (loading && updates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Massenpreisaktualisierungen
        </h1>
        <p className="text-gray-600">
          Zeigen Sie durchgeführte Massenpreisaktualisierungen an und machen Sie sie bei Bedarf rückgängig
        </p>
      </div>

      {/* Filtreler */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setFilter('all');
            setPage(1);
          }}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => {
            setFilter('active');
            setPage(1);
          }}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            filter === 'active'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Aktiv
        </button>
        <button
          onClick={() => {
            setFilter('reverted');
            setPage(1);
          }}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            filter === 'reverted'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Rückgängig gemacht
        </button>
        <button
          onClick={fetchUpdates}
          className="ml-auto px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <FiRefreshCw className="w-4 h-4" />
          Aktualisieren
        </button>
      </div>

      {/* Güncellemeler Listesi */}
      {updates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Noch keine Massenpreisaktualisierung durchgeführt</p>
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
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Betroffene Produkte ({affectedProducts.length})
                      </h3>
                      <div className="max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          {affectedProducts.length === 0 ? (
                            <p className="text-gray-500 text-sm">Keine Produktinformationen gefunden</p>
                          ) : (
                            affectedProducts.map((product, index) => (
                              <div
                                key={index}
                                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <p className="font-medium text-gray-900 mb-1">
                                  {product.productName || `Produkt ${index + 1}`}
                                </p>
                                <div className="text-sm text-gray-600 space-y-1">
                                  {update.updateType === 'TEMPORARY' ? (
                                    <>
                                      <p>
                                        Alter temporärer Preis:{' '}
                                        {product.oldTemporaryPrice !== null && product.oldTemporaryPrice !== undefined
                                          ? `€${parseFloat(product.oldTemporaryPrice).toFixed(2)}`
                                          : 'Keiner'}
                                      </p>
                                      <p>
                                        Neuer temporärer Preis:{' '}
                                        <span className="font-semibold text-primary-600">
                                          €{parseFloat(product.newTemporaryPrice || 0).toFixed(2)}
                                        </span>
                                      </p>
                                      <p>
                                        Normalpreis:{' '}
                                        <span className="line-through">
                                          €{parseFloat(product.oldPrice || 0).toFixed(2)}
                                        </span>
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p>
                                        Alter Preis:{' '}
                                        <span className="line-through">
                                          €{parseFloat(product.oldPrice || 0).toFixed(2)}
                                        </span>
                                      </p>
                                      <p>
                                        Neuer Preis:{' '}
                                        <span className="font-semibold text-primary-600">
                                          €{parseFloat(product.newPrice || 0).toFixed(2)}
                                        </span>
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Zurück
          </button>
          <span className="px-4 py-2 text-gray-700">
            Seite {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkPriceUpdates;

