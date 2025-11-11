import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPackage, FiEdit2, FiRotateCcw, FiClock, FiX, FiChevronLeft, FiChevronRight, FiCheck, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { de } from 'date-fns/locale';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import adminService from '../../services/adminService';
import { normalizeImageUrl } from '../../utils/imageUtils';

function StockManagement() {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const savedDate = localStorage.getItem('stockManagement_selectedDate');
    return savedDate ? new Date(savedDate) : new Date();
  });
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('stockManagement_activeTab');
    return savedTab ? parseInt(savedTab, 10) : 0;
  });

  // Dialog states
  const [orderDialog, setOrderDialog] = useState({ open: false, product: null, order: null });
  const [orderDetailDialog, setOrderDetailDialog] = useState({ open: false, order: null });
  const [supplierDialog, setSupplierDialog] = useState({ open: false, product: null });
  const [undoDialog, setUndoDialog] = useState({ open: false, orderId: null, productName: '' });

  // Form states
  const [orderQuantity, setOrderQuantity] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(null);
  const [actualDeliveryDate, setActualDeliveryDate] = useState(null);
  const [note, setNote] = useState('');
  const [supplier, setSupplier] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderCreationStatus, setOrderCreationStatus] = useState('pending'); // 'pending' veya 'ordered'

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedDate, statusFilter]);

  useEffect(() => {
    localStorage.setItem('stockManagement_activeTab', activeTab.toString());
  }, [activeTab]);

  useEffect(() => {
    if (selectedDate) {
      localStorage.setItem('stockManagement_selectedDate', selectedDate.toISOString());
    }
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 0) {
        const productsResponse = await adminService.getLowStockProducts();
        setLowStockProducts(productsResponse || []);
      } else if (activeTab === 1) {
        // Aktif siparişler: pending ve ordered durumundaki, geri alınmamış siparişler
        const activeOrdersResponse = await adminService.getStockOrderHistory({
          status: undefined, // Tüm durumları getir, sonra filtrele
          limit: 1000,
        });
        const filtered = (activeOrdersResponse?.orders || []).filter(
          order => !order.isUndone && (order.status === 'pending' || order.status === 'ordered')
        );
        setActiveOrders(filtered);
      } else if (activeTab === 2) {
        const dateParam = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
        const historyResponse = await adminService.getStockOrderHistory({
          date: dateParam,
          status: statusFilter || undefined,
          limit: 1000,
        });
        setHistory(historyResponse?.orders || []);
      }
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Laden der Daten';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderDialog.product) return;

    if (!orderQuantity || parseInt(orderQuantity) <= 0) {
      toast.error('Bitte geben Sie eine gültige Menge ein');
      return;
    }

    try {
      await adminService.createStockOrder(orderDialog.product.id, {
        orderQuantity: parseInt(orderQuantity),
        expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.toISOString().split('T')[0] : null,
        note: note || null,
        status: orderCreationStatus, // Seçilen status'u gönder
      });

      toast.success('Bestellung erfolgreich erstellt');
      setOrderDialog({ open: false, product: null, order: null });
      setOrderQuantity('');
      setExpectedDeliveryDate(null);
      setNote('');
      setOrderCreationStatus('pending'); // Reset
      fetchData();
      // Aktif siparişler tab'ına geç
      if (activeTab !== 1) {
        setActiveTab(1);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Erstellen der Bestellung';
      toast.error(errorMessage);
    }
  };

  const handleUpdateOrderStatus = async (status) => {
    if (!orderDialog.order) return;

    if (!orderQuantity || parseInt(orderQuantity) <= 0) {
      toast.error('Bitte geben Sie eine gültige Menge ein');
      return;
    }

    try {
      await adminService.updateStockOrderStatus(orderDialog.order.id, {
        status,
        orderQuantity: parseInt(orderQuantity), // Miktarı da gönder
        expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.toISOString().split('T')[0] : undefined,
        actualDeliveryDate: actualDeliveryDate ? actualDeliveryDate.toISOString().split('T')[0] : undefined,
        note: note || undefined,
      });

      toast.success('Bestellstatus erfolgreich aktualisiert');
      setOrderDialog({ open: false, product: null, order: null });
      setOrderQuantity('');
      setExpectedDeliveryDate(null);
      setActualDeliveryDate(null);
      setNote('');
      fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Aktualisieren des Status';
      toast.error(errorMessage);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await adminService.updateStockOrderStatus(orderId, {
        status: 'cancelled',
      });
      toast.success('Bestellung erfolgreich storniert');
      fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Stornieren';
      toast.error(errorMessage);
    }
  };

  const handleUndoOrder = async () => {
    if (!undoDialog.orderId) return;

    try {
      await adminService.undoStockOrder(undoDialog.orderId);
      toast.success('Bestellung erfolgreich rückgängig gemacht');
      setUndoDialog({ open: false, orderId: null, productName: '' });
      fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Rückgängigmachen';
      toast.error(errorMessage);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!supplierDialog.product) return;

    try {
      await adminService.updateProductSupplier(supplierDialog.product.id, supplier);
      toast.success('Lieferant erfolgreich aktualisiert');
      setSupplierDialog({ open: false, product: null });
      setSupplier('');
      fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Aktualisieren des Lieferanten';
      toast.error(errorMessage);
    }
  };

  const openOrderDialog = (product, order = null) => {
    setOrderDialog({ open: true, product, order });
    if (order) {
      setOrderQuantity(order.orderQuantity.toString());
      setExpectedDeliveryDate(order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null);
      setActualDeliveryDate(order.actualDeliveryDate ? new Date(order.actualDeliveryDate) : null);
      setNote(order.note || '');
      setOrderCreationStatus(order.status); // Mevcut sipariş durumunu set et
    } else {
      setOrderQuantity('');
      setExpectedDeliveryDate(null);
      setActualDeliveryDate(null);
      setNote('');
      setOrderCreationStatus('pending'); // Yeni sipariş için varsayılan 'pending'
    }
  };

  const openSupplierDialog = (product) => {
    setSupplierDialog({ open: true, product });
    setSupplier(product.supplier || '');
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Ausstehend' },
      ordered: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Bestellt' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Geliefert' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Storniert' },
    };
    const badge = badges[status] || badges.pending;
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

  const getCurrentOrderStatus = (product) => {
    if (!product.lastOrder || product.lastOrder.isUndone) return null;
    // İptal edilen siparişler için null döndür ki tekrar sipariş açılabilsin
    if (product.lastOrder.status === 'cancelled') return null;
    return product.lastOrder.status;
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  if (loading && lowStockProducts.length === 0 && history.length === 0) {
    return <Loading />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Bestandsverwaltung
            </h1>
          </div>
        </div>
        <p className="text-sm md:text-base text-gray-600">
          Verwalten Sie Produkte, die unter dem kritischen Bestandsniveau liegen, und verfolgen Sie Lieferantenbestellungen
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <FiX size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 md:mb-6 border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto pb-0 -mb-px">
          <button
            onClick={() => setActiveTab(0)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
              activeTab === 0
                ? 'border-red-500 text-red-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <FiAlertCircle className="w-4 h-4" />
            <span>Kritischer Bestand</span>
            {lowStockProducts.length > 0 && (
              <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {lowStockProducts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
              activeTab === 1
                ? 'border-green-500 text-green-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <FiPackage className="w-4 h-4" />
            <span>Aktive Bestellungen</span>
            {activeOrders.length > 0 && (
              <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
              activeTab === 2
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <FiClock className="w-4 h-4" />
            <span>Verlauf</span>
          </button>
        </div>
      </div>

      {/* KRİTİK STOK TAB'ı */}
      {activeTab === 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200">
            <h2 className="text-base md:text-lg font-semibold text-red-900 flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Produkte unter dem kritischen Bestandsniveau</span>
            </h2>
          </div>

          {lowStockProducts.length === 0 ? (
            <EmptyState
              icon={FiPackage}
              title="Keine Produkte mit niedrigem Bestand"
              message="Es gibt keine Produkte, die unter dem kritischen Bestandsniveau liegen."
            />
          ) : (
            <>
              {/* Desktop Tablo Görünümü */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Produkt
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Bestand / Kritisches Niveau
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Lieferant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lowStockProducts.map((product) => {
                      const currentStatus = getCurrentOrderStatus(product);
                      const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                        ? normalizeImageUrl(product.imageUrls[0])
                        : null;

                      return (
                        <tr key={product.id} className="hover:bg-red-50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <FiPackage className="text-gray-400" size={20} />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                <div className="mt-1 space-y-0.5">
                                  {product.category?.name && (
                                    <div className="text-xs text-gray-500">{product.category.name}</div>
                                  )}
                                  {product.barcode && (
                                    <div className="text-xs text-gray-400 font-mono">{String(product.barcode)}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              <span className={`font-medium ${product.stock <= (product.lowStockLevel || 0) ? 'text-red-600' : 'text-gray-900'}`}>
                                {product.stock}
                              </span>
                              {product.unit && <span className="text-gray-500 ml-1">/{String(product.unit)}</span>}
                              {product.lowStockLevel && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Kritisches Niveau: {product.lowStockLevel}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">
                              {product.supplier ? String(product.supplier) : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {currentStatus ? getStatusBadge(currentStatus) : '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openSupplierDialog(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Lieferant bearbeiten"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              {(!currentStatus || currentStatus === 'pending') && (
                                <button
                                  onClick={() => openOrderDialog(product)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                  Bestellung erstellen
                                </button>
                              )}
                              {currentStatus === 'ordered' && (
                                <>
                                  <button
                                    onClick={() => openOrderDialog(product, product.lastOrder)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                  >
                                    Erhalten
                                  </button>
                                  <button
                                    onClick={() => {
                                      setUndoDialog({ open: true, orderId: product.lastOrder.id, productName: product.name });
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Stornieren"
                                  >
                                    <FiXCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {currentStatus === 'delivered' && product.lastOrder && (
                                <button
                                  onClick={() => {
                                    setUndoDialog({ open: true, orderId: product.lastOrder.id, productName: product.name });
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Rückgängig machen"
                                >
                                  <FiRotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobil Kart Görünümü */}
              <div className="md:hidden divide-y divide-gray-200">
                {lowStockProducts.map((product) => {
                  const currentStatus = getCurrentOrderStatus(product);
                  const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                    ? normalizeImageUrl(product.imageUrls[0])
                    : null;

                  return (
                    <div key={product.id} className="p-4 hover:bg-red-50 transition-colors">
                      <div className="flex items-start gap-3 mb-3">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiPackage className="text-gray-400" size={24} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm mb-1">{product.name}</h3>
                          {product.category?.name && (
                            <p className="text-xs text-gray-500 mb-0.5">{product.category.name}</p>
                          )}
                          {product.barcode && (
                            <p className="text-xs text-gray-400 font-mono">{String(product.barcode)}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Bestand:</span>
                          <span className={`text-sm font-medium ${product.stock <= (product.lowStockLevel || 0) ? 'text-red-600' : 'text-gray-900'}`}>
                            {product.stock} {product.unit ? String(product.unit) : ''}
                          </span>
                        </div>
                        {product.lowStockLevel && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Kritisches Niveau:</span>
                            <span className="text-sm text-gray-900">{product.lowStockLevel}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Lieferant:</span>
                          <span className="text-sm text-gray-900">{product.supplier ? String(product.supplier) : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Status:</span>
                          {currentStatus ? getStatusBadge(currentStatus) : '-'}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openSupplierDialog(product)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                        >
                          <FiEdit2 className="w-3 h-3" />
                          Lieferant
                        </button>
                        {(!currentStatus || currentStatus === 'pending') && (
                          <button
                            onClick={() => openOrderDialog(product)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                          >
                            Bestellung erstellen
                          </button>
                        )}
                        {currentStatus === 'ordered' && (
                          <>
                            <button
                              onClick={() => openOrderDialog(product, product.lastOrder)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                            >
                              Erhalten
                            </button>
                            <button
                              onClick={() => {
                                setUndoDialog({ open: true, orderId: product.lastOrder.id, productName: product.name });
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
                            >
                              <FiXCircle className="w-3 h-3" />
                              Stornieren
                            </button>
                          </>
                        )}
                        {currentStatus === 'delivered' && product.lastOrder && (
                          <button
                            onClick={() => {
                              setUndoDialog({ open: true, orderId: product.lastOrder.id, productName: product.name });
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                          >
                            <FiRotateCcw className="w-3 h-3" />
                            Rückgängig
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* AKTİF SİPARİŞLER TAB'ı */}
      {activeTab === 1 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-green-200">
            <h2 className="text-base md:text-lg font-semibold text-green-900 flex items-center gap-2">
              <FiPackage className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Aktive Bestellungen</span>
            </h2>
          </div>

          {activeOrders.length === 0 ? (
            <EmptyState
              icon={FiPackage}
              title="Keine aktiven Bestellungen"
              message="Es gibt keine aktiven Bestellungen (pending oder ordered)."
            />
          ) : (
            <>
              {/* Desktop Tablo Görünümü */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Produkt
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Menge
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Erwartetes Datum
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Lieferant
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-green-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">{order.product?.name || '-'}</div>
                          {order.product?.category?.name && (
                            <div className="text-xs text-gray-500 mt-1">{order.product.category.name}</div>
                          )}
                          {order.product?.barcode && (
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{String(order.product.barcode)}</div>
                          )}
                          {order.note && (
                            <div className="text-xs text-gray-400 mt-1 italic">Notiz: {order.note}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(order.status)}
                          {order.createdAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(order.createdAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {order.orderQuantity}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            {formatDate(order.expectedDeliveryDate)}
                            {order.expectedDeliveryDate && (
                              <button
                                onClick={() => openOrderDialog(null, order)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Datum aktualisieren"
                              >
                                <FiEdit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {order.product?.supplier ? String(order.product.supplier) : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setOrderDetailDialog({ open: true, order })}
                              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                              title="Details anzeigen"
                            >
                              <FiPackage className="w-4 h-4" />
                            </button>
                            {order.status === 'pending' && (
                              <button
                                onClick={() => openOrderDialog(null, order)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                Bestellen
                              </button>
                            )}
                            {order.status === 'ordered' && (
                              <>
                                <button
                                  onClick={() => openOrderDialog(null, order)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                  Erhalten
                                </button>
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Stornieren"
                                >
                                  <FiXCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobil Kart Görünümü */}
              <div className="md:hidden divide-y divide-gray-200">
                {activeOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-green-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm mb-1">{order.product?.name || '-'}</h3>
                        {order.product?.category?.name && (
                          <p className="text-xs text-gray-500 mb-0.5">{order.product.category.name}</p>
                        )}
                        {order.product?.barcode && (
                          <p className="text-xs text-gray-400 font-mono mb-0.5">{String(order.product.barcode)}</p>
                        )}
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="space-y-2 text-xs mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Menge:</span>
                        <span className="text-gray-900">{order.orderQuantity}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Erwartetes Datum:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-900">{formatDate(order.expectedDeliveryDate)}</span>
                          <button
                            onClick={() => openOrderDialog(null, order)}
                            className="p-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Datum aktualisieren"
                          >
                            <FiEdit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Lieferant:</span>
                        <span className="text-gray-900">{order.product?.supplier ? String(order.product.supplier) : '-'}</span>
                      </div>
                      {order.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Erstellt am:</span>
                          <span className="text-gray-900">{formatDate(order.createdAt)}</span>
                        </div>
                      )}
                      {order.admin?.firstName && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Erstellt von:</span>
                          <span className="text-gray-900">{order.admin.firstName}</span>
                        </div>
                      )}
                      {order.note && (
                        <div className="pt-1">
                          <span className="text-gray-500">Notiz:</span>
                          <p className="text-gray-900 mt-0.5">{order.note}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setOrderDetailDialog({ open: true, order })}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-xs font-medium border border-blue-200"
                      >
                        <FiPackage className="w-3 h-3" />
                        Details
                      </button>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => openOrderDialog(null, order)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          Bestellen
                        </button>
                      )}
                      {order.status === 'ordered' && (
                        <>
                          <button
                            onClick={() => openOrderDialog(null, order)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                          >
                            Erhalten
                          </button>
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
                          >
                            <FiXCircle className="w-3 h-3" />
                            Stornieren
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* GEÇMİŞ TAB'ı */}
      {activeTab === 2 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-base md:text-lg font-semibold text-blue-900 flex items-center gap-2">
              <FiClock className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Bestellverlauf</span>
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Alle Status</option>
                <option value="pending">Ausstehend</option>
                <option value="ordered">Bestellt</option>
                <option value="delivered">Geliefert</option>
                <option value="cancelled">Storniert</option>
              </select>
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
                <button
                  onClick={() => changeDate(-1)}
                  className="p-1.5 hover:bg-gray-100 transition-colors"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToToday}
                  className={`px-3 py-1.5 text-xs md:text-sm ${isToday() ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'} transition-colors`}
                >
                  {formatDate(selectedDate)}
                </button>
                <button
                  onClick={() => changeDate(1)}
                  className="p-1.5 hover:bg-gray-100 transition-colors"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {history.length === 0 ? (
            <EmptyState
              icon={FiClock}
              title="Keine Bestellungen gefunden"
              message="Für den ausgewählten Zeitraum wurden keine Bestellungen gefunden."
            />
          ) : (
            <>
              {/* Desktop Tablo Görünümü */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Produkt
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Menge
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Erwartetes Datum
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Tatsächliches Datum
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((order) => (
                      <tr key={order.id} className={order.isUndone ? 'opacity-50' : ''}>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">{order.product?.name || '-'}</div>
                          {order.product?.category?.name && (
                            <div className="text-xs text-gray-500 mt-1">{order.product.category.name}</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(order.status)}
                          {order.isUndone && (
                            <div className="text-xs text-gray-500 mt-1">Rückgängig gemacht</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {order.orderQuantity}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {formatDate(order.expectedDeliveryDate)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {formatDate(order.actualDeliveryDate)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {order.admin?.firstName || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!order.isUndone && order.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setUndoDialog({ open: true, orderId: order.id, productName: order.product?.name || '' });
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Rückgängig machen"
                            >
                              <FiRotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobil Kart Görünümü */}
              <div className="md:hidden divide-y divide-gray-200">
                {history.map((order) => (
                  <div key={order.id} className={`p-4 ${order.isUndone ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm mb-1">{order.product?.name || '-'}</h3>
                        {order.product?.category?.name && (
                          <p className="text-xs text-gray-500 mb-0.5">{order.product.category.name}</p>
                        )}
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="space-y-2 text-xs mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Menge:</span>
                        <span className="text-gray-900">{order.orderQuantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Erwartetes Datum:</span>
                        <span className="text-gray-900">{formatDate(order.expectedDeliveryDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tatsächliches Datum:</span>
                        <span className="text-gray-900">{formatDate(order.actualDeliveryDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Admin:</span>
                        <span className="text-gray-900">{order.admin?.firstName || '-'}</span>
                      </div>
                      {order.note && (
                        <div className="pt-1">
                          <span className="text-gray-500">Notiz:</span>
                          <p className="text-gray-900 mt-0.5">{order.note}</p>
                        </div>
                      )}
                      {order.isUndone && (
                        <div className="pt-1 text-gray-500">
                          Rückgängig gemacht
                        </div>
                      )}
                    </div>

                    {!order.isUndone && order.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          setUndoDialog({ open: true, orderId: order.id, productName: order.product?.name || '' });
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        <FiRotateCcw className="w-4 h-4" />
                        Rückgängig machen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* SİPARİŞ DİALOGU */}
      <AnimatePresence>
        {orderDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setOrderDialog({ open: false, product: null, order: null });
                setOrderQuantity('');
                setExpectedDeliveryDate(null);
                setActualDeliveryDate(null);
                setNote('');
                setOrderCreationStatus('pending');
              }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">
                    {orderDialog.order ? 'Bestellung aktualisieren' : 'Bestellung erstellen'}
                  </h3>
                  <button
                    onClick={() => {
                      setOrderDialog({ open: false, product: null, order: null });
                      setOrderQuantity('');
                      setExpectedDeliveryDate(null);
                      setActualDeliveryDate(null);
                      setNote('');
                      setOrderCreationStatus('pending');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-gray-700">
                    <strong>{orderDialog.product?.name || orderDialog.order?.product?.name || '-'}</strong>
                  </p>
                  {!orderDialog.order && (
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Bestellstatus *
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="orderStatus"
                            value="pending"
                            checked={orderCreationStatus === 'pending'}
                            onChange={(e) => setOrderCreationStatus(e.target.value)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Bestellung wird erstellt (Ausstehend)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="orderStatus"
                            value="ordered"
                            checked={orderCreationStatus === 'ordered'}
                            onChange={(e) => setOrderCreationStatus(e.target.value)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Bestellung erstellt (Bestellt)</span>
                        </label>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      Menge *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Menge eingeben"
                    />
                  </div>
                  {(!orderDialog.order || (orderDialog.order && orderDialog.order.status === 'pending')) && (
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Erwartetes Lieferdatum
                      </label>
                      <DatePicker
                        selected={expectedDeliveryDate}
                        onChange={(date) => setExpectedDeliveryDate(date)}
                        dateFormat="dd.MM.yyyy"
                        minDate={new Date()}
                        locale={de}
                        placeholderText="dd.MM.yyyy"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        wrapperClassName="w-full"
                      />
                    </div>
                  )}
                  {orderDialog.order && orderDialog.order.status === 'ordered' && (
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Tatsächliches Lieferdatum
                      </label>
                      <DatePicker
                        selected={actualDeliveryDate}
                        onChange={(date) => setActualDeliveryDate(date)}
                        dateFormat="dd.MM.yyyy"
                        locale={de}
                        placeholderText="dd.MM.yyyy"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        wrapperClassName="w-full"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      Notiz
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Notiz eingeben (optional)"
                    />
                  </div>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sticky bottom-0 bg-white">
                  <button
                    onClick={() => {
                      setOrderDialog({ open: false, product: null, order: null });
                      setOrderQuantity('');
                      setExpectedDeliveryDate(null);
                      setActualDeliveryDate(null);
                      setNote('');
                      setOrderCreationStatus('pending');
                    }}
                    className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  {orderDialog.order ? (
                    <>
                      {orderDialog.order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateOrderStatus('ordered')}
                          className="px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          Als bestellt markieren
                        </button>
                      )}
                      {orderDialog.order.status === 'ordered' && (
                        <button
                          onClick={() => handleUpdateOrderStatus('delivered')}
                          className="px-3 py-2 text-xs md:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                          Als erhalten markieren
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleCreateOrder}
                      disabled={!orderQuantity || parseInt(orderQuantity) <= 0}
                      className={`px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg transition-colors whitespace-nowrap ${
                        !orderQuantity || parseInt(orderQuantity) <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                      }`}
                    >
                      Bestellung erstellen
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SİPARİŞ DETAY DİALOGU */}
      <AnimatePresence>
        {orderDetailDialog.open && orderDetailDialog.order && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderDetailDialog({ open: false, order: null })}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Bestelldetails</h3>
                  <button
                    onClick={() => setOrderDetailDialog({ open: false, order: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Produktinformationen</h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Produkt:</span>
                        <span className="text-sm font-medium text-gray-900">{orderDetailDialog.order.product?.name || '-'}</span>
                      </div>
                      {orderDetailDialog.order.product?.category?.name && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Kategorie:</span>
                          <span className="text-sm text-gray-900">{orderDetailDialog.order.product.category.name}</span>
                        </div>
                      )}
                      {orderDetailDialog.order.product?.barcode && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Barcode:</span>
                          <span className="text-sm font-mono text-gray-900">{String(orderDetailDialog.order.product.barcode)}</span>
                        </div>
                      )}
                      {orderDetailDialog.order.product?.supplier && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Lieferant:</span>
                          <span className="text-sm text-gray-900">{String(orderDetailDialog.order.product.supplier)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Bestellinformationen</h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Status:</span>
                        {getStatusBadge(orderDetailDialog.order.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Menge:</span>
                        <span className="text-sm font-medium text-gray-900">{orderDetailDialog.order.orderQuantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Erwartete Lieferung:</span>
                        <span className="text-sm text-gray-900">{formatDate(orderDetailDialog.order.expectedDeliveryDate)}</span>
                      </div>
                      {orderDetailDialog.order.actualDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Tatsächliche Lieferung:</span>
                          <span className="text-sm text-gray-900">{formatDate(orderDetailDialog.order.actualDeliveryDate)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Erstellt am:</span>
                        <span className="text-sm text-gray-900">{formatDate(orderDetailDialog.order.createdAt)}</span>
                      </div>
                      {orderDetailDialog.order.admin?.firstName && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Erstellt von:</span>
                          <span className="text-sm text-gray-900">{orderDetailDialog.order.admin.firstName}</span>
                        </div>
                      )}
                      {orderDetailDialog.order.note && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-sm text-gray-600 block mb-1">Notiz:</span>
                          <p className="text-sm text-gray-900">{orderDetailDialog.order.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sticky bottom-0 bg-white">
                  <button
                    onClick={() => setOrderDetailDialog({ open: false, order: null })}
                    className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Schließen
                  </button>
                  {orderDetailDialog.order.status === 'pending' && (
                    <button
                      onClick={() => {
                        setOrderDetailDialog({ open: false, order: null });
                        openOrderDialog(null, orderDetailDialog.order);
                      }}
                      className="px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      Bestellen
                    </button>
                  )}
                  {orderDetailDialog.order.status === 'ordered' && (
                    <>
                      <button
                        onClick={() => {
                          setOrderDetailDialog({ open: false, order: null });
                          openOrderDialog(null, orderDetailDialog.order);
                        }}
                        className="px-3 py-2 text-xs md:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                      >
                        Erhalten
                      </button>
                      <button
                        onClick={() => {
                          setOrderDetailDialog({ open: false, order: null });
                          handleCancelOrder(orderDetailDialog.order.id);
                        }}
                        className="px-3 py-2 text-xs md:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                      >
                        Stornieren
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setOrderDetailDialog({ open: false, order: null });
                      openOrderDialog(null, orderDetailDialog.order);
                    }}
                    className="px-3 py-2 text-xs md:text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
                  >
                    Bearbeiten
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TEDARİKÇİ DİALOGU */}
      <AnimatePresence>
        {supplierDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSupplierDialog({ open: false, product: null });
                setSupplier('');
              }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Lieferant bearbeiten</h3>
                  <button
                    onClick={() => {
                      setSupplierDialog({ open: false, product: null });
                      setSupplier('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-gray-700">
                    Lieferant für <strong>{supplierDialog.product?.name}</strong>:
                  </p>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Lieferant eingeben"
                  />
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setSupplierDialog({ open: false, product: null });
                      setSupplier('');
                    }}
                    className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdateSupplier}
                    className="px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GERİ ALMA DİALOGU */}
      <AnimatePresence>
        {undoDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUndoDialog({ open: false, orderId: null, productName: '' })}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm md:text-base font-semibold text-gray-900">Bestellung rückgängig machen</h3>
                  <button
                    onClick={() => setUndoDialog({ open: false, orderId: null, productName: '' })}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs md:text-sm text-gray-700">
                    Möchten Sie die Bestellung für <strong>{undoDialog.productName}</strong> wirklich rückgängig machen?
                    {history.find(o => o.id === undoDialog.orderId)?.status === 'delivered' && (
                      <span className="block mt-2 text-red-600 font-medium">
                        Achtung: Der Bestand wird reduziert!
                      </span>
                    )}
                  </p>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                  <button
                    onClick={() => setUndoDialog({ open: false, orderId: null, productName: '' })}
                    className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUndoOrder}
                    className="px-3 py-2 text-xs md:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    Rückgängig machen
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StockManagement;

