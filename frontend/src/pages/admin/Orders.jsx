import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFilter, FiShoppingBag, FiEye, FiCheck, FiX, FiClock, FiTruck, FiPackage, FiXCircle, FiChevronDown, FiStar, FiMail, FiDownload } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { useAlert } from '../../contexts/AlertContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import HelpTooltip from '../../components/common/HelpTooltip';
import { normalizeImageUrl } from '../../utils/imageUtils';

// Order Item Component with image placeholder
const OrderItemRow = ({ item }) => {
  const normalizedImageUrl = item.imageUrl ? normalizeImageUrl(item.imageUrl) : null;
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
        {normalizedImageUrl && !imageError ? (
          <img 
            src={normalizedImageUrl} 
            alt={item.productName} 
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <FiPackage className="text-gray-400" size={24} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{item.productName}</p>
        {item.variantName && (
          <p className="text-xs text-purple-600 font-medium mt-0.5">
            {item.variantName}
          </p>
        )}
        <p className="text-sm text-gray-600">
          {item.quantity}x {parseFloat(item.price).toFixed(2)} €
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-medium text-gray-900">
          {(parseFloat(item.price) * item.quantity).toFixed(2)} €
        </p>
      </div>
    </div>
  );
};

function Orders() {
  const { showConfirm } = useAlert();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null); // orderId
  const [orderReview, setOrderReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [showInvoicePopup, setShowInvoicePopup] = useState(false);
  const [invoicePopupOrder, setInvoicePopupOrder] = useState(null);
  const [invoicePdfUrl, setInvoicePdfUrl] = useState(null);
  const [invoicePdfBlob, setInvoicePdfBlob] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 20;

  // Status options
  const statusOptions = [
    { value: '', label: 'Alle' },
    { value: 'pending', label: 'Ausstehend' },
    { value: 'accepted', label: 'Akzeptiert' },
    { value: 'preparing', label: 'Vorbereitung' },
    { value: 'shipped', label: 'Versendet' },
    { value: 'delivered', label: 'Geliefert' },
    { value: 'cancelled', label: 'Storniert' },
  ];

  const typeOptions = [
    { value: '', label: 'Alle' },
    { value: 'pickup', label: 'Abholung' },
    { value: 'delivery', label: 'Lieferung' },
  ];

  // Verileri yükle
  useEffect(() => {
    loadOrders();
  }, [currentPage, searchQuery, statusFilter, typeFilter, sortBy, sortOrder]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response = await adminService.getOrders(params);
      setOrders(response.data.orders || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Bestellungen konnten nicht geladen werden');
      console.error('Sipariş yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sipariş durumu güncelle
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await adminService.updateOrderStatus(orderId, newStatus);
      toast.success('Bestellstatus erfolgreich aktualisiert');
      setOpenStatusDropdown(null); // Dropdown'u kapat
      loadOrders();
      // Eğer açık olan sipariş güncellendiyse, onu da güncelle
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      // Eğer durum "delivered" ise ve invoice henüz gönderilmemişse popup aç
      if (newStatus === 'delivered') {
        try {
          // Sipariş detayını yükle ve invoice durumunu kontrol et
          const orderDetailResponse = await adminService.getOrderById(orderId);
          const orderDetail = orderDetailResponse.data.order;
          
          // Admin için invoiceSent her zaman true olabilir, ama email log kontrolü yapalım
          // Daha güvenli bir yol: sipariş detayını yükledikten sonra kontrol et
          if (!orderDetail.invoiceSent) {
            // Invoice PDF URL'ini oluştur
            const token = localStorage.getItem('adminToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const pdfUrl = `${apiUrl}/orders/${orderId}/invoice?token=${token}`;
            
            setInvoicePopupOrder(orderDetail);
            setInvoicePdfUrl(pdfUrl);
            setShowInvoicePopup(true);
            
            // PDF'i blob olarak yükle
            setLoadingPdf(true);
            try {
              const token = localStorage.getItem('adminToken');
              const response = await fetch(pdfUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              if (response.ok) {
                const blob = await response.blob();
                setInvoicePdfBlob(URL.createObjectURL(blob));
              } else {
                console.error('PDF yüklenemedi:', response.status);
              }
            } catch (error) {
              console.error('PDF yükleme hatası:', error);
            } finally {
              setLoadingPdf(false);
            }
          }
        } catch (error) {
          console.error('Invoice kontrolü hatası:', error);
          // Hata olsa bile devam et
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren');
    }
  };

  // Status dropdown aç/kapa
  const toggleStatusDropdown = (orderId, e) => {
    e.stopPropagation();
    setOpenStatusDropdown(openStatusDropdown === orderId ? null : orderId);
  };

  // Sipariş detayını aç
  const openOrderDetail = async (order) => {
    setSelectedOrder(order);
    setShowModal(true);
    setOrderReview(null);

    // Eğer sipariş delivered ise review'ı yükle
    if (order.status === 'delivered') {
      loadOrderReview(order.id);
    }
  };

  const loadOrderReview = async (orderId) => {
    try {
      setReviewLoading(true);
      const response = await adminService.getOrderReview(orderId);
      if (response.data.review) {
        setOrderReview(response.data.review);
      }
    } catch (error) {
      console.log('Review yok veya yüklenemedi');
    } finally {
      setReviewLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
    setOrderReview(null);
  };

  // Fatura gönder
  const handleSendInvoice = async (orderId) => {
    const confirmed = await showConfirm(
      'Rechnung senden',
      'Möchten Sie die Rechnung wirklich per E-Mail an den Kunden senden?'
    );

    if (!confirmed) return;

    try {
      setSendingInvoice(true);
      await adminService.sendInvoice(orderId);
      toast.success('Rechnung wurde erfolgreich per E-Mail versendet');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Senden der Rechnung');
      console.error('Fatura gönderim hatası:', error);
    } finally {
      setSendingInvoice(false);
    }
  };

  // Invoice popup'tan gönder
  const handleSendInvoiceFromPopup = async () => {
    if (!invoicePopupOrder) return;

    try {
      setSendingInvoice(true);
      await adminService.sendInvoice(invoicePopupOrder.id);
      toast.success('Rechnung wurde erfolgreich per E-Mail versendet');
      setShowInvoicePopup(false);
      setInvoicePopupOrder(null);
      setInvoicePdfUrl(null);
      loadOrders(); // Siparişleri yenile
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Senden der Rechnung');
      console.error('Fatura gönderim hatası:', error);
    } finally {
      setSendingInvoice(false);
    }
  };

  // Invoice popup'ı kapat
  const closeInvoicePopup = () => {
    // Blob URL'ini temizle
    if (invoicePdfBlob) {
      URL.revokeObjectURL(invoicePdfBlob);
    }
    setShowInvoicePopup(false);
    setInvoicePopupOrder(null);
    setInvoicePdfUrl(null);
    setInvoicePdfBlob(null);
  };

  // Status badge rengi
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Status ikonu
  const getStatusIcon = (status) => {
    const icons = {
      pending: FiClock,
      accepted: FiCheck,
      preparing: FiPackage,
      shipped: FiTruck,
      delivered: FiCheck,
      cancelled: FiXCircle,
    };
    return icons[status] || FiClock;
  };

  // Status label
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Ausstehend',
      accepted: 'Akzeptiert',
      preparing: 'Vorbereitung',
      shipped: 'Versendet',
      delivered: 'Geliefert',
      cancelled: 'Storniert',
    };
    return labels[status] || status;
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
    setCurrentPage(1);
  };

  // Aktif filtre sayısı
  const activeFilterCount = [
    searchQuery,
    statusFilter,
    typeFilter,
  ].filter(Boolean).length;

  if (loading && orders.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            Bestellungen
            <HelpTooltip content="Verwalten Sie alle Bestellungen, aktualisieren Sie den Status und senden Sie Benachrichtigungen an Kunden." />
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {total} {total === 1 ? 'Bestellung' : 'Bestellungen'} insgesamt
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Bestellnummer, Kunde suchen..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <FiFilter size={18} />
            Filter {activeFilterCount > 0 && (
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200"
            >
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Status
                  <HelpTooltip content="Filtern Sie Bestellungen nach ihrem Status: Ausstehend, Akzeptiert, Vorbereitung, Versendet, Geliefert oder Storniert." />
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Typ
                  <HelpTooltip content="Filtern Sie Bestellungen nach Liefertyp: Abholung (Selbstabholung) oder Lieferung (Versand an Adresse)." />
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sortierung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Sortierung
                  <HelpTooltip content="Sortieren Sie Bestellungen nach Datum oder Betrag. Neueste zuerst zeigt die zuletzt aufgegebenen Bestellungen oben." />
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="createdAt-desc">Neueste zuerst</option>
                  <option value="createdAt-asc">Älteste zuerst</option>
                  <option value="total-desc">Betrag: Hoch-Niedrig</option>
                  <option value="total-asc">Betrag: Niedrig-Hoch</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Orders Table/Cards */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse">Lädt...</div>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={FiShoppingBag}
            title="Keine Bestellungen gefunden"
            message="Es gibt noch keine Bestellungen oder passen Sie die Filter an."
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Bestellnummer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kunde
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Betrag
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const StatusIcon = getStatusIcon(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">
                            #{order.orderNo}
                          </div>
                          {order.review && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FiStar
                                  key={star}
                                  className={`w-2.5 h-2.5 ${
                                    star <= order.review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="text-[9px] text-gray-500 ml-0.5">
                                {order.review.rating}/5
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {order.user?.firstName} {order.user?.lastName}
                            </div>
                            <div className="text-gray-500">{order.user?.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            order.type === 'delivery' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.type === 'delivery' ? 'Lieferung' : 'Abholung'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {parseFloat(order.total).toFixed(2)} €
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative status-dropdown-container">
                            <button
                              onClick={(e) => toggleStatusDropdown(order.id, e)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(order.status)}`}
                            >
                              <StatusIcon size={12} />
                              {getStatusLabel(order.status)}
                              <FiChevronDown size={10} className="ml-0.5" />
                            </button>
                            {openStatusDropdown === order.id && (
                              <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                                {statusOptions.filter(opt => opt.value).map((option, index) => {
                                  const OptionIcon = getStatusIcon(option.value);
                                  const isSelected = option.value === order.status;
                                  const isFirst = index === 0;
                                  const isLast = index === statusOptions.filter(opt => opt.value).length - 1;
                                  
                                  if (isSelected) {
                                    return (
                                      <div
                                        key={option.value}
                                        className={`px-3 py-2 text-sm flex items-center gap-2 ${isFirst ? 'rounded-t-lg' : ''} ${isLast ? 'rounded-b-lg' : ''} ${getStatusColor(order.status)}`}
                                      >
                                        <OptionIcon size={14} />
                                        {option.label}
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <button
                                      key={option.value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(order.id, option.value);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${isFirst ? 'rounded-t-lg' : ''} ${isLast ? 'rounded-b-lg' : ''} transition-colors`}
                                    >
                                      <OptionIcon size={14} />
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openOrderDetail(order)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Details anzeigen"
                            >
                              <FiEye size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {orders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                return (
                  <div key={order.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                          #{order.orderNo}
                        </div>
                        {order.review && (
                          <div className="flex items-center gap-0.5 mb-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FiStar
                                key={star}
                                className={`w-2.5 h-2.5 ${
                                  star <= order.review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-[9px] text-gray-500 ml-0.5">
                              {order.review.rating}/5
                            </span>
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          {order.user?.firstName} {order.user?.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{order.user?.email}</div>
                      </div>
                      <div className="relative status-dropdown-container">
                        <button
                          onClick={(e) => toggleStatusDropdown(order.id, e)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(order.status)} flex-shrink-0`}
                        >
                          <StatusIcon size={12} />
                          {getStatusLabel(order.status)}
                          <FiChevronDown size={10} className="ml-0.5" />
                        </button>
                        {openStatusDropdown === order.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                            {statusOptions.filter(opt => opt.value).map((option, index) => {
                              const OptionIcon = getStatusIcon(option.value);
                              const isSelected = option.value === order.status;
                              const isFirst = index === 0;
                              const isLast = index === statusOptions.filter(opt => opt.value).length - 1;
                              
                              if (isSelected) {
                                return (
                                  <div
                                    key={option.value}
                                    className={`px-3 py-2 text-sm flex items-center gap-2 ${isFirst ? 'rounded-t-lg' : ''} ${isLast ? 'rounded-b-lg' : ''} ${getStatusColor(order.status)}`}
                                  >
                                    <OptionIcon size={14} />
                                    {option.label}
                                  </div>
                                );
                              }
                              
                              return (
                                <button
                                  key={option.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusUpdate(order.id, option.value);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${isFirst ? 'rounded-t-lg' : ''} ${isLast ? 'rounded-b-lg' : ''} transition-colors`}
                                >
                                  <OptionIcon size={14} />
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-xs text-gray-500">Betrag</span>
                        <div className="text-lg font-bold text-gray-900">
                          {parseFloat(order.total).toFixed(2)} €
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        order.type === 'delivery' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.type === 'delivery' ? 'Lieferung' : 'Abholung'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mb-3">
                      {new Date(order.createdAt).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>

                    <button
                      onClick={() => openOrderDetail(order)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm border border-blue-200"
                    >
                      <FiEye size={16} />
                      Details anzeigen
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Seite {currentPage} von {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zurück
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {showModal && selectedOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                closeModal();
                setOpenStatusDropdown(null);
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
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Bestellung #{selectedOrder.orderNo}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* Customer Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Kunde</h3>
                      <div className="text-sm text-gray-900">
                        <p className="font-medium">
                          {selectedOrder.user?.firstName} {selectedOrder.user?.lastName}
                        </p>
                        <p className="text-gray-600">{selectedOrder.user?.email}</p>
                        {selectedOrder.user?.phone && (
                          <p className="text-gray-600">{selectedOrder.user.phone}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Status & Typ</h3>
                      <div className="space-y-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                          {getStatusLabel(selectedOrder.status)}
                        </span>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                            selectedOrder.type === 'delivery' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedOrder.type === 'delivery' ? 'Lieferung' : 'Abholung'}
                          </span>
                        </div>
                        {selectedOrder.paymentType && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                              selectedOrder.paymentType === 'cash'
                                ? 'bg-green-100 text-green-800'
                                : selectedOrder.paymentType === 'card_on_delivery'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedOrder.paymentType === 'cash' 
                                ? 'Barzahlung' 
                                : selectedOrder.paymentType === 'card_on_delivery'
                                ? 'Kartenzahlung bei Lieferung'
                                : 'Keine Zahlung'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  {selectedOrder.address && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Lieferadresse</h3>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium">{selectedOrder.address.title}</p>
                        <p>{selectedOrder.address.street} {selectedOrder.address.houseNumber}</p>
                        {selectedOrder.address.addressLine2 && (
                          <p>{selectedOrder.address.addressLine2}</p>
                        )}
                        <p>
                          {selectedOrder.address.postalCode} {selectedOrder.address.city}
                        </p>
                        <p>{selectedOrder.address.state}</p>
                      </div>
                    </div>
                  )}

                  {/* Order Note */}
                  {selectedOrder.note && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Bestellnotiz</h3>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                        <p className="whitespace-pre-wrap">{selectedOrder.note}</p>
                      </div>
                    </div>
                  )}

                  {/* Customer Review - Only for Delivered Orders */}
                  {selectedOrder.status === 'delivered' && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Kundenbewertung</h3>
                      {reviewLoading ? (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500">Wird geladen...</p>
                        </div>
                      ) : orderReview ? (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FiStar
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= orderReview.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {orderReview.rating}/5 Sterne
                            </span>
                          </div>
                          {orderReview.comment && (
                            <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                              "{orderReview.comment}"
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Bewertet von {orderReview.user?.firstName} {orderReview.user?.lastName}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500">Noch keine Bewertung</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Items */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Bestellte Artikel</h3>
                    <div className="space-y-2">
                      {selectedOrder.orderItems?.map((item) => (
                        <OrderItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Zwischensumme</span>
                        <span className="text-gray-900">{parseFloat(selectedOrder.subtotal).toFixed(2)} €</span>
                      </div>
                      {parseFloat(selectedOrder.deliveryFee) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Liefergebühr</span>
                          <span className="text-gray-900">{parseFloat(selectedOrder.deliveryFee).toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                        <span>Gesamt</span>
                        <span>{parseFloat(selectedOrder.total).toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Status aktualisieren</h3>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.filter(opt => opt.value && opt.value !== selectedOrder.status).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusUpdate(selectedOrder.id, option.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fatura İşlemleri */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Rechnungsaktionen</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDownloadInvoice(selectedOrder.id, selectedOrder.orderNo)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <FiDownload size={16} />
                        PDF herunterladen
                      </button>
                      <button
                        onClick={() => handleSendInvoice(selectedOrder.id)}
                        disabled={sendingInvoice}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        <FiMail size={16} />
                        {sendingInvoice ? 'Wird gesendet...' : 'Per E-Mail senden'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Invoice Popup - Delivered durumuna geçildiğinde */}
      <AnimatePresence>
        {showInvoicePopup && invoicePopupOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={closeInvoicePopup}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Rechnung für Bestellung #{invoicePopupOrder.orderNo}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Möchten Sie die Rechnung per E-Mail an den Kunden senden?
                  </p>
                </div>
                <button
                  onClick={closeInvoicePopup}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* PDF Preview */}
              <div className="flex-1 overflow-hidden p-6">
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50" style={{ height: '60vh' }}>
                  {loadingPdf ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-gray-500">PDF wird geladen...</div>
                    </div>
                  ) : invoicePdfBlob ? (
                    <object
                      data={invoicePdfBlob}
                      type="application/pdf"
                      className="w-full h-full"
                      aria-label="Invoice Preview"
                    >
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <p>PDF konnte nicht geladen werden</p>
                          <a
                            href={invoicePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline mt-2 inline-block"
                          >
                            PDF in neuem Tab öffnen
                          </a>
                        </div>
                      </div>
                    </object>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <p>PDF konnte nicht geladen werden</p>
                        <a
                          href={invoicePdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline mt-2 inline-block"
                        >
                          PDF in neuem Tab öffnen
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  onClick={closeInvoicePopup}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Nicht senden
                </button>
                <button
                  onClick={handleSendInvoiceFromPopup}
                  disabled={sendingInvoice}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiMail size={18} />
                  {sendingInvoice ? 'Wird gesendet...' : 'Rechnung senden'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Orders;

