import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiFilter, FiShoppingBag, FiEye, FiCheck, FiX, FiClock, FiTruck, FiPackage, FiXCircle, FiChevronDown, FiStar, FiMail, FiDownload, FiPrinter, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import HelpTooltip from '../../components/common/HelpTooltip';
import Switch from '../../components/common/Switch';
import { normalizeImageUrl } from '../../utils/imageUtils';
import { useModalScroll } from '../../hooks/useModalScroll';

// Order Item Component with image placeholder
const OrderItemRow = ({ item }) => {
  const normalizedImageUrl = item.imageUrl ? normalizeImageUrl(item.imageUrl) : null;
  const [imageError, setImageError] = useState(false);
  
  const hasDiscount = item.originalPrice && parseFloat(item.originalPrice) > parseFloat(item.price);
  const unitPrice = parseFloat(item.price);
  const originalUnitPrice = item.originalPrice ? parseFloat(item.originalPrice) : null;
  const totalPrice = unitPrice * item.quantity;
  const originalTotalPrice = originalUnitPrice ? originalUnitPrice * item.quantity : null;
  const discountAmount = originalTotalPrice ? originalTotalPrice - totalPrice : 0;
  const discountPercent = originalUnitPrice ? ((discountAmount / originalTotalPrice) * 100).toFixed(0) : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
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
        {hasDiscount && item.campaignName && (
          <div className="mt-1.5 p-1.5 bg-green-50 border border-green-200 rounded text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-green-700 font-semibold">🎁 {item.campaignName}</span>
            </div>
            <div className="mt-1 text-green-600">
              <span className="font-medium">-{discountPercent}% Rabatt</span>
              <span className="ml-2">({discountAmount.toFixed(2)} € gespart)</span>
            </div>
          </div>
        )}
        {!hasDiscount && item.campaignName && (
          <p className="text-xs text-gray-500 mt-0.5 italic">
            Kampagne: {item.campaignName}
          </p>
        )}
        <div className="text-sm text-gray-600 mt-1.5">
          {hasDiscount ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="line-through text-gray-400 text-xs">
                  Original: {item.quantity}x {originalUnitPrice.toFixed(2)} €
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-semibold">
                  Reduziert: {item.quantity}x {unitPrice.toFixed(2)} €
                </span>
              </div>
            </div>
          ) : (
            <span>{item.quantity}x {unitPrice.toFixed(2)} €</span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {hasDiscount ? (
          <div className="space-y-1">
            <div className="line-through text-gray-400 text-sm">
              {originalTotalPrice.toFixed(2)} €
            </div>
            <p className="font-bold text-green-600 text-lg">
              {totalPrice.toFixed(2)} €
            </p>
            <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
              -{discountAmount.toFixed(2)} €
            </div>
          </div>
        ) : (
          <p className="font-medium text-gray-900">
            {totalPrice.toFixed(2)} €
          </p>
        )}
      </div>
    </div>
  );
};

function Orders() {
  const { showConfirm } = useAlert();
  const { themeColors } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelFormData, setCancelFormData] = useState({
    cancellationReason: '',
    cancellationInternalNote: '',
    cancellationCustomerMessage: '',
    showCancellationReasonToCustomer: false,
  });
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const highlightedOrderRef = useRef(null);

  // Modal scroll yönetimi - her modal için
  useModalScroll(showModal);
  useModalScroll(showCancelModal);

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

  // İptal sebepleri
  const cancellationReasons = [
    { value: 'out_of_stock', label: 'Nicht auf Lager' },
    { value: 'customer_request', label: 'Kundenwunsch' },
    { value: 'payment_failed', label: 'Zahlungsfehler' },
    { value: 'invalid_address', label: 'Ungültige Adresse' },
    { value: 'delivery_area', label: 'Nicht im Liefergebiet' },
    { value: 'fraud_suspected', label: 'Betrugsverdacht' },
    { value: 'other', label: 'Sonstiges' },
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

  // Highlight parametresini kontrol et
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && orders.length > 0) {
      const order = orders.find(o => o.id === highlightId);
      if (order) {
        setHighlightedOrderId(highlightId);
        setIsHighlighting(true);
        
        // Scroll to sipariş
        setTimeout(() => {
          if (highlightedOrderRef.current) {
            highlightedOrderRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 100);

        // 3 saniye sonra highlight'ı kaldır
        const timer = setTimeout(() => {
          setIsHighlighting(false);
          setTimeout(() => {
            setHighlightedOrderId(null);
            // URL'den highlight parametresini kaldır
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('highlight');
            setSearchParams(newSearchParams, { replace: true });
          }, 500); // Animasyon bitene kadar bekle
        }, 3000);

        return () => clearTimeout(timer);
      } else if (highlightId && !loading) {
        // Sipariş bulunamadı, URL'den parametreyi temizle
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('highlight');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [searchParams, orders, loading, setSearchParams]);

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
    // Eğer durum "cancelled" ise, önce iptal modal'ını aç
    if (newStatus === 'cancelled') {
      setOpenStatusDropdown(null); // Dropdown'u kapat
      // Siparişi bul veya API'den yükle
      let orderToCancel = orders.find(o => o.id === orderId) || selectedOrder;
      
      // Eğer sipariş bulunamadıysa veya tam detayları yoksa API'den yükle
      if (!orderToCancel || !orderToCancel.orderItems) {
        try {
          const orderDetailResponse = await adminService.getOrderById(orderId);
          orderToCancel = orderDetailResponse.data.order;
        } catch (error) {
          console.error('Sipariş detayı yüklenemedi:', error);
          toast.error('Sipariş detayları yüklenemedi');
          return;
        }
      }
      
      if (orderToCancel) {
        setSelectedOrder(orderToCancel);
        openCancelModal();
      }
      return;
    }

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
            // Invoice PDF URL'ini oluştur (admin endpoint kullan)
            const token = localStorage.getItem('adminToken');
            const apiUrl = import.meta.env.VITE_API_URL 
              ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`)
              : (import.meta.env.DEV ? 'http://localhost:5001/api' : '/api');
            const pdfUrl = `${apiUrl}/admin/orders/${orderId}/invoice`;
            
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
    setShowModal(true);
    setOrderReview(null);
    
    // Sipariş detayını API'den çek (tam bilgiler için)
    try {
      const response = await adminService.getOrderById(order.id);
      setSelectedOrder(response.data.order);
    } catch (error) {
      console.error('Sipariş detayı yüklenemedi:', error);
      // Hata durumunda listeden gelen siparişi kullan
      setSelectedOrder(order);
    }

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

  // İptal modalını aç
  const openCancelModal = () => {
    setCancelFormData({
      cancellationReason: '',
      cancellationInternalNote: '',
      cancellationCustomerMessage: '',
      showCancellationReasonToCustomer: false,
    });
    setShowCancelModal(true);
  };

  // İptal modalını kapat
  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelFormData({
      cancellationReason: '',
      cancellationInternalNote: '',
      cancellationCustomerMessage: '',
      showCancellationReasonToCustomer: false,
    });
  };

  // Sipariş iptal et
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    try {
      await adminService.cancelOrder(selectedOrder.id, cancelFormData);
      toast.success('Bestellung erfolgreich storniert');
      closeCancelModal();
      // Eğer detay modal'ı açıksa onu da kapat
      if (showModal) {
      closeModal();
      }
      loadOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Stornieren');
    }
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

  // Fatura PDF indir
  const handleDownloadInvoice = async (orderId, orderNo) => {
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = import.meta.env.VITE_API_URL 
        ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`)
        : (import.meta.env.DEV ? 'http://localhost:5001/api' : '/api');
      const pdfUrl = `${apiUrl}/admin/orders/${orderId}/invoice`;
      
      // Token'ı header'da gönder
      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Cleanup after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        toast.error('Fehler beim Öffnen der Rechnung');
        console.error('PDF yüklenemedi:', response.status);
      }
    } catch (error) {
      toast.error('Fehler beim Öffnen der Rechnung');
      console.error('Fatura indirme hatası:', error);
    }
  };

  // Kurye için teslimat slip PDF'i yazdır
  const handlePrintDeliverySlip = async (orderId) => {
    try {
      await adminService.getDeliverySlipPDF(orderId);
    } catch (error) {
      toast.error('Fehler beim Öffnen des Lieferscheins');
      console.error('Lieferschein yazdırma hatası:', error);
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
  const getStatusIcon = (status, orderType) => {
    const icons = {
      pending: FiClock,
      accepted: FiCheck,
      preparing: FiPackage,
      shipped: orderType === 'pickup' ? FiCheckCircle : FiTruck,
      delivered: FiCheck,
      cancelled: FiXCircle,
    };
    return icons[status] || FiClock;
  };

  // Status label
  const getStatusLabel = (status, orderType) => {
    const labels = {
      pending: 'Ausstehend',
      accepted: 'Akzeptiert',
      preparing: 'Vorbereitung',
      shipped: orderType === 'pickup' ? 'Bereit' : 'Versendet',
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
          <h1 className="text-2xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
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
              <span 
                className="text-white text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: themeColors?.primary?.[600] || '#16a34a'
                }}
              >
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
                    const StatusIcon = getStatusIcon(order.status, order.type);
                    const isHighlighted = highlightedOrderId === order.id;
                    return (
                      <tr 
                        key={order.id} 
                        ref={isHighlighted ? highlightedOrderRef : null}
                        className={`hover:bg-gray-50 transition-all duration-300 ${
                          isHighlighted 
                            ? isHighlighting 
                              ? 'bg-blue-100 animate-pulse' 
                              : 'bg-blue-50' 
                            : ''
                        }`}
                      >
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
                          {order.isPreorder && order.scheduledFor && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-purple-600 font-semibold">
                              <FiClock className="w-3 h-3" />
                              <span>
                                {new Date(order.scheduledFor).toLocaleString('de-DE', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
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
                              {getStatusLabel(order.status, order.type)}
                              <FiChevronDown size={10} className="ml-0.5" />
                            </button>
                            {openStatusDropdown === order.id && (
                              <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                                {statusOptions.filter(opt => opt.value).map((option, index) => {
                                  const OptionIcon = getStatusIcon(option.value, order.type);
                                  const isSelected = option.value === order.status;
                                  const isFirst = index === 0;
                                  const isLast = index === statusOptions.filter(opt => opt.value).length - 1;
                                  const optionLabel = getStatusLabel(option.value, order.type);
                                  
                                  if (isSelected) {
                                    return (
                                      <div
                                        key={option.value}
                                        className={`px-3 py-2 text-sm flex items-center gap-2 ${isFirst ? 'rounded-t-lg' : ''} ${isLast ? 'rounded-b-lg' : ''} ${getStatusColor(order.status)}`}
                                      >
                                        <OptionIcon size={14} />
                                        {optionLabel}
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
                                      {optionLabel}
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
                const StatusIcon = getStatusIcon(order.status, order.type);
                const isHighlighted = highlightedOrderId === order.id;
                return (
                  <div 
                    key={order.id} 
                    ref={isHighlighted ? highlightedOrderRef : null}
                    className={`p-4 transition-all duration-300 ${
                      isHighlighted 
                        ? isHighlighting 
                          ? 'bg-blue-100 animate-pulse' 
                          : 'bg-blue-50' 
                        : ''
                    }`}
                  >
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
                        {order.isPreorder && order.scheduledFor && (
                          <div className="flex items-center gap-1 text-[11px] text-purple-600 font-semibold">
                            <FiClock className="w-3 h-3" />
                            <span>
                              {new Date(order.scheduledFor).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
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
                          {getStatusLabel(order.status, order.type)}
                          <FiChevronDown size={10} className="ml-0.5" />
                        </button>
                        {openStatusDropdown === order.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                            {statusOptions.filter(opt => opt.value).map((option, index) => {
                              const OptionIcon = getStatusIcon(option.value, order.type);
                              const isSelected = option.value === order.status;
                              const isFirst = index === 0;
                              const isLast = index === statusOptions.filter(opt => opt.value).length - 1;
                              const optionLabel = getStatusLabel(option.value, order.type);
                              
                              if (isSelected) {
                                return (
                                  <div
                                    key={option.value}
                                    className={`px-3 py-2 text-sm flex items-center gap-2 ${isFirst ? 'rounded-t-lg' : ''} ${isLast ? 'rounded-b-lg' : ''} ${getStatusColor(order.status)}`}
                                  >
                                    <OptionIcon size={14} />
                                    {optionLabel}
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
                                  {optionLabel}
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
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
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
                  {selectedOrder.isPreorder && selectedOrder.scheduledFor && (
                    <div className="flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
                      <FiClock className="mt-0.5" />
                      <div>
                        <p className="text-xs uppercase tracking-wide font-semibold">Vorbestellung</p>
                        <p className="font-semibold">
                          {new Date(selectedOrder.scheduledFor).toLocaleString('de-DE', {
                            weekday: 'long',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )}

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
                          {getStatusLabel(selectedOrder.status, selectedOrder.type)}
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
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedOrder.address.title && (
                          <p className="font-medium mb-1">{selectedOrder.address.title}</p>
                        )}
                        <p className="leading-relaxed">
                          {selectedOrder.address.street} {selectedOrder.address.houseNumber}
                          {selectedOrder.address.addressLine2 && <><br />{selectedOrder.address.addressLine2}</>}
                          <br />
                          {selectedOrder.address.postalCode} {selectedOrder.address.city}
                          {selectedOrder.address.state && <><br />{selectedOrder.address.state}</>}
                        </p>
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

                  {/* İptal Bilgileri - Sadece iptal edilmiş siparişler için */}
                  {selectedOrder.status === 'cancelled' && (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Stornierungsinformationen</h3>
                      <div className="space-y-2">
                        {/* İptal Sebebi - Müşteriye gösterilecekse */}
                        {selectedOrder.showCancellationReasonToCustomer && selectedOrder.cancellationReason && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Stornierungsgrund (für Kunde sichtbar):</p>
                            <div className="text-sm text-gray-900 bg-blue-50 border border-blue-200 p-2 rounded">
                              <p>{selectedOrder.cancellationReason}</p>
                            </div>
                          </div>
                        )}

                        {/* İptal Sebebi - Sadece admin için */}
                        {selectedOrder.cancellationReason && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Stornierungsgrund:</p>
                            <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                              <p>{selectedOrder.cancellationReason}</p>
                              <p className={`text-xs mt-1 ${selectedOrder.showCancellationReasonToCustomer ? 'text-green-600' : 'text-gray-500'}`}>
                                {selectedOrder.showCancellationReasonToCustomer ? '✓ Wird dem Kunden angezeigt' : 'Nur für Admin sichtbar'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Müşteri Mesajı */}
                        {selectedOrder.cancellationCustomerMessage && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Nachricht für den Kunden:</p>
                            <div className="text-sm text-gray-900 bg-blue-50 border border-blue-200 p-2 rounded">
                              <p className="whitespace-pre-wrap">{selectedOrder.cancellationCustomerMessage}</p>
                            </div>
                          </div>
                        )}

                        {/* Internal Note - Sadece admin için */}
                        {selectedOrder.cancellationInternalNote && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Interne Notiz <span className="text-red-600">(Nur für Admin)</span>:
                            </p>
                            <div className="text-sm text-gray-900 bg-red-50 border border-red-200 p-2 rounded">
                              <p className="whitespace-pre-wrap">{selectedOrder.cancellationInternalNote}</p>
                            </div>
                          </div>
                        )}
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
                    {(() => {
                      // Toplam kampanya indirimini hesapla
                      const campaignDiscount = selectedOrder.orderItems?.reduce((total, item) => {
                        if (item.originalPrice && parseFloat(item.originalPrice) > parseFloat(item.price)) {
                          const itemDiscount = (parseFloat(item.originalPrice) - parseFloat(item.price)) * item.quantity;
                          return total + itemDiscount;
                        }
                        return total;
                      }, 0) || 0;

                      // Kupon indirimi
                      const couponDiscount = parseFloat(selectedOrder.discount || 0);

                      // Toplam indirim
                      const totalDiscount = campaignDiscount + couponDiscount;

                      // Orijinal subtotal (kampanya indirimsiz)
                      const originalSubtotal = selectedOrder.orderItems?.reduce((total, item) => {
                        const itemPrice = item.originalPrice ? parseFloat(item.originalPrice) : parseFloat(item.price);
                        return total + (itemPrice * item.quantity);
                      }, 0) || parseFloat(selectedOrder.subtotal);

                      return (
                        <div className="space-y-2">
                          {totalDiscount > 0 && (
                            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-green-700">Gesamtrabatt</span>
                                <span className="text-lg font-bold text-green-600">-{totalDiscount.toFixed(2)} €</span>
                              </div>
                              {campaignDiscount > 0 && (
                                <div className="flex justify-between text-xs text-green-600 mt-1">
                                  <span>Kampagnenrabatt:</span>
                                  <span>-{campaignDiscount.toFixed(2)} €</span>
                                </div>
                              )}
                              {couponDiscount > 0 && (
                                <div className="flex justify-between text-xs text-green-600 mt-0.5">
                                  <span>Gutscheinrabatt:</span>
                                  <span>-{couponDiscount.toFixed(2)} €</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Zwischensumme</span>
                            <div className="text-right">
                              {totalDiscount > 0 && originalSubtotal > parseFloat(selectedOrder.subtotal) ? (
                                <div>
                                  <span className="line-through text-gray-400 text-xs mr-2">
                                    {originalSubtotal.toFixed(2)} €
                                  </span>
                                  <span className="text-gray-900">{parseFloat(selectedOrder.subtotal).toFixed(2)} €</span>
                                </div>
                              ) : (
                                <span className="text-gray-900">{parseFloat(selectedOrder.subtotal).toFixed(2)} €</span>
                              )}
                            </div>
                          </div>
                          {selectedOrder.couponCode && (
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Gutschein: {selectedOrder.couponCode}</span>
                            </div>
                          )}
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
                      );
                    })()}
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

                  {/* İptal İşlemi */}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Bestellung stornieren</h3>
                      <button
                        onClick={openCancelModal}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <FiXCircle size={16} />
                        Bestellung stornieren
                      </button>
                    </div>
                  )}

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
                        className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                        style={!sendingInvoice ? {
                          backgroundColor: themeColors?.primary?.[600] || '#16a34a'
                        } : {}}
                        onMouseEnter={(e) => {
                          if (!sendingInvoice) {
                            e.currentTarget.style.backgroundColor = themeColors?.primary?.[700] || '#15803d';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sendingInvoice) {
                            e.currentTarget.style.backgroundColor = themeColors?.primary?.[600] || '#16a34a';
                          }
                        }}
                      >
                        <FiMail size={16} />
                        {sendingInvoice ? 'Wird gesendet...' : 'Per E-Mail senden'}
                      </button>
                    </div>
                  </div>

                  {/* Kurye İşlemleri */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Kurieraktionen</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handlePrintDeliverySlip(selectedOrder.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        <FiPrinter size={16} />
                        Lieferschein drucken
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
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex items-center justify-center p-4"
            onClick={(e) => {
              // Sadece overlay'e direkt tıklanınca kapat (input selection sırasında kapanmayı önle)
              if (e.target === e.currentTarget) {
                closeInvoicePopup();
              }
            }}
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
                          {invoicePdfBlob && (
                            <a
                              href={invoicePdfBlob}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline mt-2 inline-block"
                            >
                              PDF in neuem Tab öffnen
                            </a>
                          )}
                        </div>
                      </div>
                    </object>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <p>PDF konnte nicht geladen werden</p>
                        {invoicePdfBlob && (
                          <a
                            href={invoicePdfBlob}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline mt-2 inline-block"
                          >
                            PDF in neuem Tab öffnen
                          </a>
                        )}
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
                  className="px-6 py-2 text-white rounded-lg transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  style={!sendingInvoice ? {
                    backgroundColor: themeColors?.primary?.[600] || '#16a34a'
                  } : {}}
                  onMouseEnter={(e) => {
                    if (!sendingInvoice) {
                      e.currentTarget.style.backgroundColor = themeColors?.primary?.[700] || '#15803d';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!sendingInvoice) {
                      e.currentTarget.style.backgroundColor = themeColors?.primary?.[600] || '#16a34a';
                    }
                  }}
                >
                  <FiMail size={18} />
                  {sendingInvoice ? 'Wird gesendet...' : 'Rechnung senden'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {showCancelModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex items-center justify-center p-4"
            onClick={(e) => {
              // Sadece overlay'e direkt tıklanınca kapat (input selection sırasında kapanmayı önle)
              if (e.target === e.currentTarget) {
                closeCancelModal();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Bestellung #{selectedOrder.orderNo} stornieren
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Bitte geben Sie die Stornierungsdetails ein
                  </p>
                </div>
                <button
                  onClick={closeCancelModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* İptal Sebebi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stornierungsgrund <span className="text-gray-500">(optional)</span>
                  </label>
                  <select
                    value={cancelFormData.cancellationReason}
                    onChange={(e) => setCancelFormData({ ...cancelFormData, cancellationReason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Bitte wählen...</option>
                    {cancellationReasons.map((reason) => (
                      <option key={reason.value} value={reason.label}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* İptal sebebini müşteriye göster */}
                {cancelFormData.cancellationReason && (
                  <div className="flex items-center">
                    <Switch
                      id="showReason"
                      checked={cancelFormData.showCancellationReasonToCustomer}
                      onChange={(e) => setCancelFormData({ ...cancelFormData, showCancellationReasonToCustomer: e.target.checked })}
                      color="green"
                    />
                    <label htmlFor="showReason" className="ml-2 text-sm text-gray-700">
                      Stornierungsgrund dem Kunden anzeigen
                    </label>
                  </div>
                )}

                {/* Müşteriye Özel Mesaj */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nachricht für den Kunden <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    value={cancelFormData.cancellationCustomerMessage}
                    onChange={(e) => setCancelFormData({ ...cancelFormData, cancellationCustomerMessage: e.target.value })}
                    rows={4}
                    placeholder="Optionale Nachricht, die dem Kunden angezeigt wird..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {cancelFormData.cancellationCustomerMessage.length}/1000 Zeichen
                  </p>
                </div>

                {/* Internal Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interne Notiz <span className="text-gray-500">(wird dem Kunden nicht angezeigt)</span>
                  </label>
                  <textarea
                    value={cancelFormData.cancellationInternalNote}
                    onChange={(e) => setCancelFormData({ ...cancelFormData, cancellationInternalNote: e.target.value })}
                    rows={4}
                    placeholder="Interne Notiz für Ihre Aufzeichnungen..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {cancelFormData.cancellationInternalNote.length}/1000 Zeichen
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  onClick={closeCancelModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCancelOrder}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                >
                  <FiXCircle size={18} />
                  Bestellung stornieren
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

