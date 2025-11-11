import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPackage, FiEdit2, FiRotateCcw, FiClock, FiX, FiChevronLeft, FiChevronRight, FiCheck, FiXCircle, FiAlertCircle, FiCheckSquare, FiSquare, FiDownload, FiPrinter, FiGrid, FiLayers, FiChevronDown, FiChevronUp, FiTruck, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { de } from 'date-fns/locale';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import adminService from '../../services/adminService';
import { normalizeImageUrl } from '../../utils/imageUtils';
import ProductQuantityDialog from '../../components/stock/ProductQuantityDialog';
import CreateStockOrderListDialog from '../../components/stock/CreateStockOrderListDialog';
import StockOrderListCard from '../../components/stock/StockOrderListCard';

function StockManagement() {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [activeLists, setActiveLists] = useState([]); // Liste bazlı aktif siparişler
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
  const [viewMode, setViewMode] = useState(() => {
    // localStorage'dan görünüm modunu oku, yoksa varsayılan olarak 'criticality' (kritiklik)
    const savedMode = localStorage.getItem('stockManagement_viewMode');
    return savedMode || 'criticality'; // 'criticality', 'category' veya 'supplier'
  });
  const [expandedCategories, setExpandedCategories] = useState(() => {
    // localStorage'dan açık kategorileri oku
    const saved = localStorage.getItem('stockManagement_expandedCategories');
    return saved ? JSON.parse(saved) : {}; // { "Kategori Adı": true/false }
  });
  const [expandedSuppliers, setExpandedSuppliers] = useState(() => {
    // localStorage'dan açık tedarikçileri oku
    const saved = localStorage.getItem('stockManagement_expandedSuppliers');
    return saved ? JSON.parse(saved) : {}; // { "Tedarikçi Adı": true/false }
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Checkbox seçimi için state'ler
  const [selectedProducts, setSelectedProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('stockManagement_selectedProducts');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Array kontrolü ve geçerli obje kontrolü
        if (Array.isArray(parsed)) {
          return parsed.filter(p => p && typeof p === 'object' && p.productId && p.orderQuantity);
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading selectedProducts from localStorage:', error);
      return [];
    }
  });
  const [quantityDialog, setQuantityDialog] = useState({ open: false, product: null });
  const [createListDialog, setCreateListDialog] = useState(false);
  const [listDetailDialog, setListDetailDialog] = useState({ open: false, list: null });

  // Dialog states (eski sistem için korunuyor)
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
    localStorage.setItem('stockManagement_selectedProducts', JSON.stringify(selectedProducts));
  }, [selectedProducts]);

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

  // Görünüm modu değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('stockManagement_viewMode', viewMode);
    // Kategori veya tedarikçi moduna geçildiğinde aktif tab'ı 0'a ayarla
    if ((viewMode === 'category' || viewMode === 'supplier') && activeTab !== 2) {
      setActiveTab(0);
    }
  }, [viewMode]);

  // Açık kategorileri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('stockManagement_expandedCategories', JSON.stringify(expandedCategories));
  }, [expandedCategories]);

  // Açık tedarikçileri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('stockManagement_expandedSuppliers', JSON.stringify(expandedSuppliers));
  }, [expandedSuppliers]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 0) {
        const productsResponse = await adminService.getLowStockProducts();
        setLowStockProducts(productsResponse || []);
      } else if (activeTab === 1) {
        // Aktif sipariş listelerini getir
        try {
          const listsResponse = await adminService.getStockOrderLists({
          status: undefined, // Tüm durumları getir, sonra filtrele
          limit: 1000,
        });
          // Response yapısını kontrol et
          const lists = listsResponse?.lists || listsResponse?.data?.lists || (Array.isArray(listsResponse) ? listsResponse : []);
          const filtered = lists.filter(
            list => list && list.status && (list.status === 'pending' || list.status === 'ordered')
          );
          setActiveLists(filtered);
        } catch (err) {
          console.error('Error loading stock order lists:', err);
          setActiveLists([]);
        }
        
        // Eski sistem için aktif siparişleri de getir (liste dışındakiler)
        try {
          const activeOrdersResponse = await adminService.getStockOrderHistory({
            status: undefined,
            limit: 1000,
          });
          const filteredOrders = (activeOrdersResponse?.orders || []).filter(
            order => order && !order.isUndone && !order.orderListId && (order.status === 'pending' || order.status === 'ordered')
        );
          setActiveOrders(filteredOrders);
        } catch (err) {
          console.error('Error loading active orders:', err);
          setActiveOrders([]);
        }
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
    setSupplier(product.supplier ? (typeof product.supplier === 'string' ? product.supplier : String(product.supplier)) : '');
  };

  const getStatusBadge = (status) => {
    // Status bir obje ise, string'e çevir
    const statusString = typeof status === 'string' ? status : (status?.status || String(status || 'pending'));
    
    const badges = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Ausstehend' },
      ordered: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Bestellt' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Geliefert' },
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

  // Checkbox seçimi handler'ları
  const handleProductCheckbox = (product) => {
    const isSelected = selectedProducts.some(p => p.productId === product.id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.productId !== product.id));
    } else {
      // Checkbox'a tıklanınca miktar dialog'unu aç
      setQuantityDialog({ open: true, product });
    }
  };

  const handleQuantitySave = (orderData) => {
    // Geçerli veri kontrolü
    if (!orderData || !orderData.productId || !orderData.orderQuantity) {
      console.error('Invalid orderData:', orderData);
      return;
    }

    const existingIndex = selectedProducts.findIndex(p => p.productId === orderData.productId);
    if (existingIndex >= 0) {
      // Güncelle
      const updated = [...selectedProducts];
      updated[existingIndex] = {
        productId: orderData.productId,
        orderQuantity: Number(orderData.orderQuantity),
        orderUnit: orderData.orderUnit || null,
      };
      setSelectedProducts(updated);
    } else {
      // Yeni ekle
      setSelectedProducts([
        ...selectedProducts,
        {
          productId: orderData.productId,
          orderQuantity: Number(orderData.orderQuantity),
          orderUnit: orderData.orderUnit || null,
        },
      ]);
    }
  };

  const handleRemoveSelectedProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const handleCreateListSuccess = () => {
    setSelectedProducts([]);
    setActiveTab(1); // Aktif siparişler tab'ına geç
    fetchData();
  };

  const getSelectedProductData = (productId) => {
    return selectedProducts.find(p => p.productId === productId);
  };

  const isProductSelected = (productId) => {
    return selectedProducts.some(p => p.productId === productId);
  };

  // Ürünleri arama sorgusuna göre filtrele
  const filterProducts = (products) => {
    if (!searchQuery.trim()) {
      return products;
    }

    const query = searchQuery.toLowerCase().trim();
    return products.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const category = product.category?.name?.toLowerCase() || '';
      const supplier = product.supplier ? String(product.supplier).toLowerCase() : '';
      const barcode = product.barcode ? String(product.barcode).toLowerCase() : '';

      return name.includes(query) ||
             category.includes(query) ||
             supplier.includes(query) ||
             barcode.includes(query);
    });
  };

  // Kategoriye göre ürünleri grupla
  const getProductsGroupedByCategory = () => {
    // Tüm kritik stok ürünlerini al ve filtrele
    const allProducts = filterProducts(lowStockProducts.map(p => ({ ...p })));

    // Kategorilere göre grupla ve sırala
    const grouped = {};
    allProducts.forEach(product => {
      const categoryName = product.category?.name || 'Keine Kategorie';
      if (!grouped[categoryName]) {
        grouped[categoryName] = {
          name: categoryName,
          products: []
        };
      }
      grouped[categoryName].products.push(product);
    });

    // Her kategorideki ürünleri sırala: seçili olanlar en üstte
    Object.values(grouped).forEach(category => {
      category.products.sort((a, b) => {
        const aSelected = isProductSelected(a.id);
        const bSelected = isProductSelected(b.id);
        
        // Seçili olanlar önce
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        
        // Aynı durumdaysa alfabetik sırala
        return a.name.localeCompare(b.name, 'de');
      });
    });

    // Kategorileri alfabetik sırala
    return Object.values(grouped).sort((a, b) => {
      if (a.name === 'Keine Kategorie') return 1;
      if (b.name === 'Keine Kategorie') return -1;
      return a.name.localeCompare(b.name, 'de');
    });
  };

  // Tedarikçiye göre ürünleri grupla
  const getProductsGroupedBySupplier = () => {
    // Tüm kritik stok ürünlerini al ve filtrele
    const allProducts = filterProducts(lowStockProducts.map(p => ({ ...p })));

    // Tedarikçilere göre grupla ve sırala
    const grouped = {};
    allProducts.forEach(product => {
      const supplierName = product.supplier ? String(product.supplier) : 'Kein Lieferant';
      if (!grouped[supplierName]) {
        grouped[supplierName] = {
          name: supplierName,
          products: []
        };
      }
      grouped[supplierName].products.push(product);
    });

    // Her tedarikçideki ürünleri sırala: seçili olanlar en üstte
    Object.values(grouped).forEach(supplier => {
      supplier.products.sort((a, b) => {
        const aSelected = isProductSelected(a.id);
        const bSelected = isProductSelected(b.id);
        
        // Seçili olanlar önce
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        
        // Aynı durumdaysa alfabetik sırala
        return a.name.localeCompare(b.name, 'de');
      });
    });

    // Tedarikçileri alfabetik sırala
    return Object.values(grouped).sort((a, b) => {
      if (a.name === 'Kein Lieferant') return 1;
      if (b.name === 'Kein Lieferant') return -1;
      return a.name.localeCompare(b.name, 'de');
    });
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
          <div className="flex items-center gap-2">
            {/* Görünüm Modu Switch */}
            {activeTab === 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setViewMode('criticality')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs font-medium ${
                    viewMode === 'criticality'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Nach Kritikalität anzeigen"
                >
                  <FiLayers className="w-3 h-3" />
                  <span className="hidden sm:inline">Kritikalität</span>
                </button>
                <div className="w-px h-4 bg-gray-300"></div>
                <button
                  onClick={() => setViewMode('category')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs font-medium ${
                    viewMode === 'category'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Nach Kategorie anzeigen"
                >
                  <FiGrid className="w-3 h-3" />
                  <span className="hidden sm:inline">Kategorie</span>
                </button>
                <div className="w-px h-4 bg-gray-300"></div>
                <button
                  onClick={() => setViewMode('supplier')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs font-medium ${
                    viewMode === 'supplier'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Nach Lieferant anzeigen"
                >
                  <FiTruck className="w-3 h-3" />
                  <span className="hidden sm:inline">Lieferant</span>
                </button>
              </div>
            )}
            {activeTab === 0 && selectedProducts.length > 0 && (
              <button
                onClick={() => setCreateListDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <FiPackage className="w-4 h-4" />
                Bestellliste erstellen ({selectedProducts.length})
              </button>
            )}
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
          {viewMode === 'criticality' ? (
            <>
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
                {(activeLists.length > 0 || activeOrders.length > 0) && (
                  <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {activeLists.length + activeOrders.length}
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
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab(0)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
                  activeTab !== 2
                    ? 'border-green-500 text-green-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {viewMode === 'category' ? (
                  <FiGrid className="w-4 h-4" />
                ) : (
                  <FiTruck className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{viewMode === 'category' ? 'Kategorien' : 'Lieferanten'}</span>
                <span className="sm:hidden">{viewMode === 'category' ? 'Kategorien' : 'Lieferanten'}</span>
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
                <span className="hidden sm:inline">Verlauf</span>
                <span className="sm:hidden">Verlauf</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Arama Çubuğu - Sadece Kritik Stok Tab'ında */}
      {activeTab === 0 && (
        <div className="mb-4 md:mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Produkte suchen (Name, Kategorie, Lieferant, Barcode)..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* KRİTİK STOK TAB'ı */}
      {activeTab === 0 && viewMode === 'criticality' && (() => {
        const filteredProducts = filterProducts(lowStockProducts);
        return (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <h2 className="text-base md:text-lg font-semibold text-red-900 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Produkte unter dem kritischen Bestandsniveau</span>
                {searchQuery && (
                  <span className="text-xs font-normal text-red-700">
                    ({filteredProducts.length} von {lowStockProducts.length})
                  </span>
                )}
              </h2>
            </div>

            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={FiPackage}
                title={searchQuery ? "Keine Produkte gefunden" : "Keine Produkte mit niedrigem Bestand"}
                message={searchQuery ? `Keine Produkte gefunden für "${searchQuery}"` : "Es gibt keine Produkte, die unter dem kritischen Bestandsniveau liegen."}
              />
            ) : (
              <>
                {/* Desktop Tablo Görünümü */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Tümünü seç - her biri için dialog açılacak
                                // Bu durumda sadece checkbox'ları işaretle, kullanıcı manuel olarak miktar girecek
                              } else {
                                setSelectedProducts([]);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                          />
                        </th>
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
                      {filteredProducts.map((product) => {
                      const currentStatus = getCurrentOrderStatus(product);
                      const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                        ? normalizeImageUrl(product.imageUrls[0])
                        : null;
                      const isSelected = isProductSelected(product.id);
                      const selectedData = getSelectedProductData(product.id);

                      return (
                        <tr key={product.id} className={`hover:bg-red-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleProductCheckbox(product)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {isSelected ? (
                                <FiCheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <FiSquare className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </td>
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
                                {selectedData && selectedData.orderQuantity && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    {selectedData.orderQuantity} {selectedData.orderUnit ? (typeof selectedData.orderUnit === 'string' ? selectedData.orderUnit : String(selectedData.orderUnit)) : ''}
                                  </div>
                                )}
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
                              {product.unit && (
                                <span className="text-gray-500 ml-1">
                                  /{typeof product.unit === 'string' ? product.unit : String(product.unit || '')}
                                </span>
                              )}
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
                {filteredProducts.map((product) => {
                  const currentStatus = getCurrentOrderStatus(product);
                  const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                    ? normalizeImageUrl(product.imageUrls[0])
                    : null;
                  const isSelected = isProductSelected(product.id);
                  const selectedData = getSelectedProductData(product.id);

                  return (
                    <div key={product.id} className={`p-4 hover:bg-red-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <button
                          onClick={() => handleProductCheckbox(product)}
                          className="mt-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                          {isSelected ? (
                            <FiCheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <FiSquare className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
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
                          {selectedData && selectedData.orderQuantity && (
                            <div className="text-xs text-blue-600 mb-1">
                              {selectedData.orderQuantity} {selectedData.orderUnit ? (typeof selectedData.orderUnit === 'string' ? selectedData.orderUnit : String(selectedData.orderUnit)) : ''}
                            </div>
                          )}
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
                            {product.stock} {product.unit ? (typeof product.unit === 'string' ? product.unit : String(product.unit)) : ''}
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
        );
      })()}

      {/* KATEGORİ GÖRÜNÜMÜ */}
      {activeTab === 0 && viewMode === 'category' && (
        <div className="space-y-6">
          {getProductsGroupedByCategory().map((categoryGroup) => {
            const hasProducts = categoryGroup.products.length > 0;
            if (!hasProducts) return null;

            const selectedCount = categoryGroup.products.filter(p => isProductSelected(p.id)).length;

            const isExpanded = expandedCategories[categoryGroup.name] !== false; // Varsayılan olarak açık
            const toggleCategory = () => {
              setExpandedCategories(prev => ({
                ...prev,
                [categoryGroup.name]: !isExpanded
              }));
            };

            return (
              <div key={categoryGroup.name} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Kategori Başlığı - Tıklanabilir */}
                <button
                  onClick={toggleCategory}
                  className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiGrid className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-sm md:text-base">{categoryGroup.name}</span>
                    {selectedCount > 0 && (
                      <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ml-2">
                        {selectedCount} ausgewählt
                      </span>
                    )}
                    <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ml-1">
                      {categoryGroup.products.length}
                    </span>
                  </h2>
                  {isExpanded ? (
                    <FiChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <FiChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {/* Kategori İçeriği - Açılır Kapanır */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      {/* Desktop Tablo */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.length === categoryGroup.products.length && categoryGroup.products.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Tümünü seç - her biri için dialog açılacak
                                    } else {
                                      setSelectedProducts(selectedProducts.filter(p => !categoryGroup.products.some(cp => cp.id === p.productId)));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                                />
                              </th>
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
                            {categoryGroup.products.map((product) => {
                              const currentStatus = getCurrentOrderStatus(product);
                              const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                                ? normalizeImageUrl(product.imageUrls[0])
                                : null;
                              const isSelected = isProductSelected(product.id);
                              const selectedData = getSelectedProductData(product.id);

                              return (
                                <tr key={product.id} className={`hover:bg-red-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                                  <td className="px-4 py-4">
                                    <button
                                      onClick={() => handleProductCheckbox(product)}
                                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                                    >
                                      {isSelected ? (
                                        <FiCheckSquare className="w-5 h-5 text-blue-600" />
                                      ) : (
                                        <FiSquare className="w-5 h-5 text-gray-400" />
                                      )}
                                    </button>
                                  </td>
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
                                        {selectedData && selectedData.orderQuantity && (
                                          <div className="text-xs text-blue-600 mt-1">
                                            {selectedData.orderQuantity} {selectedData.orderUnit ? (typeof selectedData.orderUnit === 'string' ? selectedData.orderUnit : String(selectedData.orderUnit)) : ''}
                                          </div>
                                        )}
                                        {product.barcode && (
                                          <div className="text-xs text-gray-400 font-mono mt-1">{String(product.barcode)}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-sm">
                                      <span className={`font-medium ${product.stock <= (product.lowStockLevel || 0) ? 'text-red-600' : 'text-gray-900'}`}>
                                        {product.stock}
                                      </span>
                                      {product.unit && (
                                        <span className="text-gray-500 ml-1">
                                          /{typeof product.unit === 'string' ? product.unit : String(product.unit || '')}
                                        </span>
                                      )}
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
                      {/* Mobil Kart */}
                      <div className="md:hidden divide-y divide-gray-200">
                        {categoryGroup.products.map((product) => {
                          const currentStatus = getCurrentOrderStatus(product);
                          const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                            ? normalizeImageUrl(product.imageUrls[0])
                            : null;
                          const isSelected = isProductSelected(product.id);
                          const selectedData = getSelectedProductData(product.id);

                          return (
                            <div key={product.id} className={`p-4 hover:bg-red-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                              <div className="flex items-start gap-3 mb-3">
                                <button
                                  onClick={() => handleProductCheckbox(product)}
                                  className="mt-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                >
                                  {isSelected ? (
                                    <FiCheckSquare className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <FiSquare className="w-5 h-5 text-gray-400" />
                                  )}
                                </button>
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
                                  {selectedData && selectedData.orderQuantity && (
                                    <div className="text-xs text-blue-600 mb-1">
                                      {selectedData.orderQuantity} {selectedData.orderUnit ? (typeof selectedData.orderUnit === 'string' ? selectedData.orderUnit : String(selectedData.orderUnit)) : ''}
                                    </div>
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
                                    {product.stock} {product.unit ? (typeof product.unit === 'string' ? product.unit : String(product.unit)) : ''}
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {getProductsGroupedByCategory().length === 0 && (
            <EmptyState
              icon={FiGrid}
              title="Keine Produkte gefunden"
              message="Es gibt keine Produkte unter dem kritischen Bestandsniveau."
            />
          )}
        </div>
      )}

      {/* TEDARİKÇİ GÖRÜNÜMÜ */}
      {activeTab === 0 && viewMode === 'supplier' && (
        <div className="space-y-6">
          {getProductsGroupedBySupplier().map((supplierGroup) => {
            const hasProducts = supplierGroup.products.length > 0;
            if (!hasProducts) return null;

            const selectedCount = supplierGroup.products.filter(p => isProductSelected(p.id)).length;

            const isExpanded = expandedSuppliers[supplierGroup.name] !== false; // Varsayılan olarak açık
            const toggleSupplier = () => {
              setExpandedSuppliers(prev => ({
                ...prev,
                [supplierGroup.name]: !isExpanded
              }));
            };

            return (
              <div key={supplierGroup.name} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Tedarikçi Başlığı - Tıklanabilir */}
                <button
                  onClick={toggleSupplier}
                  className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiTruck className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-sm md:text-base">{supplierGroup.name}</span>
                    {selectedCount > 0 && (
                      <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ml-2">
                        {selectedCount} ausgewählt
                      </span>
                    )}
                    <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ml-1">
                      {supplierGroup.products.length}
                    </span>
                  </h2>
                  {isExpanded ? (
                    <FiChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <FiChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {/* Tedarikçi İçeriği - Açılır Kapanır */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      {/* Desktop Tablo */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.length === supplierGroup.products.length && supplierGroup.products.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Tümünü seç - her biri için dialog açılacak
                                    } else {
                                      setSelectedProducts(selectedProducts.filter(p => !supplierGroup.products.some(sp => sp.id === p.productId)));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                                />
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Produkt
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Bestand / Kritisches Niveau
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Kategorie
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
                            {supplierGroup.products.map((product) => {
                              const currentStatus = getCurrentOrderStatus(product);
                              const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                                ? normalizeImageUrl(product.imageUrls[0])
                                : null;
                              const isSelected = isProductSelected(product.id);
                              const selectedData = getSelectedProductData(product.id);

                              return (
                                <tr key={product.id} className={`hover:bg-red-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                                  <td className="px-4 py-4">
                                    <button
                                      onClick={() => handleProductCheckbox(product)}
                                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                                    >
                                      {isSelected ? (
                                        <FiCheckSquare className="w-5 h-5 text-blue-600" />
                                      ) : (
                                        <FiSquare className="w-5 h-5 text-gray-400" />
                                      )}
                                    </button>
                                  </td>
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
                                        {selectedData && selectedData.orderQuantity && (
                                          <div className="text-xs text-blue-600 mt-1">
                                            {selectedData.orderQuantity} {selectedData.orderUnit ? (typeof selectedData.orderUnit === 'string' ? selectedData.orderUnit : String(selectedData.orderUnit)) : ''}
                                          </div>
                                        )}
                                        {product.barcode && (
                                          <div className="text-xs text-gray-400 font-mono mt-1">{String(product.barcode)}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-sm">
                                      <span className={`font-medium ${product.stock <= (product.lowStockLevel || 0) ? 'text-red-600' : 'text-gray-900'}`}>
                                        {product.stock}
                                      </span>
                                      {product.unit && (
                                        <span className="text-gray-500 ml-1">
                                          /{typeof product.unit === 'string' ? product.unit : String(product.unit || '')}
                                        </span>
                                      )}
                                      {product.lowStockLevel && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          Kritisches Niveau: {product.lowStockLevel}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-sm text-gray-900">
                                      {product.category?.name || '-'}
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
                      {/* Mobil Kart */}
                      <div className="md:hidden divide-y divide-gray-200">
                        {supplierGroup.products.map((product) => {
                          const currentStatus = getCurrentOrderStatus(product);
                          const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                            ? normalizeImageUrl(product.imageUrls[0])
                            : null;
                          const isSelected = isProductSelected(product.id);
                          const selectedData = getSelectedProductData(product.id);

                          return (
                            <div key={product.id} className={`p-4 hover:bg-red-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                              <div className="flex items-start gap-3 mb-3">
                                <button
                                  onClick={() => handleProductCheckbox(product)}
                                  className="mt-1 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                >
                                  {isSelected ? (
                                    <FiCheckSquare className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <FiSquare className="w-5 h-5 text-gray-400" />
                                  )}
                                </button>
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
                                  {selectedData && selectedData.orderQuantity && (
                                    <div className="text-xs text-blue-600 mb-1">
                                      {selectedData.orderQuantity} {selectedData.orderUnit ? (typeof selectedData.orderUnit === 'string' ? selectedData.orderUnit : String(selectedData.orderUnit)) : ''}
                                    </div>
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
                                    {product.stock} {product.unit ? (typeof product.unit === 'string' ? product.unit : String(product.unit)) : ''}
                                  </span>
                                </div>
                                {product.lowStockLevel && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Kritisches Niveau:</span>
                                    <span className="text-sm text-gray-900">{product.lowStockLevel}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Kategorie:</span>
                                  <span className="text-sm text-gray-900">{product.category?.name || '-'}</span>
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {getProductsGroupedBySupplier().length === 0 && (
            <EmptyState
              icon={FiTruck}
              title="Keine Produkte gefunden"
              message="Es gibt keine Produkte unter dem kritischen Bestandsniveau."
            />
          )}
        </div>
      )}

      {/* AKTİF SİPARİŞLER TAB'ı */}
      {activeTab === 1 && viewMode === 'criticality' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-green-200">
            <h2 className="text-base md:text-lg font-semibold text-green-900 flex items-center gap-2">
              <FiPackage className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Aktive Bestellungen</span>
            </h2>
          </div>

          {activeLists.length === 0 && activeOrders.length === 0 ? (
            <EmptyState
              icon={FiPackage}
              title="Keine aktiven Bestellungen"
              message="Es gibt keine aktiven Bestellungen (pending oder ordered)."
            />
          ) : (
            <>
              {/* Liste görünümü */}
              {activeLists.length > 0 && (
                <div className="p-4 md:p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Bestelllisten</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeLists.map((list) => (
                      <StockOrderListCard
                        key={list.id}
                        list={list}
                        onStatusUpdate={fetchData}
                        onViewDetails={(list) => setListDetailDialog({ open: true, list })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Eski sistem - Liste dışındaki siparişler */}
              {activeOrders.length > 0 && (
                <div className={`p-4 md:p-6 ${activeLists.length > 0 ? 'border-t border-gray-200' : ''}`}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Einzelne Bestellungen</h3>
                  {/* Mevcut aktif siparişler görünümü korunuyor */}
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
                              {order.orderQuantity} {order.orderUnit ? (typeof order.orderUnit === 'string' ? order.orderUnit : String(order.orderUnit)) : ''}
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

                  {/* Mobil görünüm */}
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
                            <span className="text-gray-900">
                              {order.orderQuantity} {order.orderUnit ? (typeof order.orderUnit === 'string' ? order.orderUnit : String(order.orderUnit)) : ''}
                            </span>
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
                </div>
              )}
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

      {/* PRODUCT QUANTITY DIALOG */}
      <ProductQuantityDialog
        open={quantityDialog.open}
        product={quantityDialog.product}
        onClose={() => setQuantityDialog({ open: false, product: null })}
        onSave={handleQuantitySave}
      />

      {/* CREATE LIST DIALOG */}
      <CreateStockOrderListDialog
        open={createListDialog}
        selectedProducts={selectedProducts}
        onClose={() => setCreateListDialog(false)}
        onSuccess={handleCreateListSuccess}
      />

      {/* LIST DETAIL DIALOG */}
      <AnimatePresence>
        {listDetailDialog.open && listDetailDialog.list && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setListDetailDialog({ open: false, list: null })}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">
                    Bestellliste: {listDetailDialog.list.name}
                  </h3>
                  <button
                    onClick={() => setListDetailDialog({ open: false, list: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="mt-1">{getStatusBadge(listDetailDialog.list.status)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Erstellt am</div>
                      <div className="mt-1 text-sm text-gray-900">{formatDate(listDetailDialog.list.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Erstellt von</div>
                      <div className="mt-1 text-sm text-gray-900">{listDetailDialog.list.admin?.firstName || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Produkte</div>
                      <div className="mt-1 text-sm text-gray-900">{listDetailDialog.list.orders?.length || 0}</div>
                    </div>
                  </div>

                  {listDetailDialog.list.note && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Notiz</div>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{listDetailDialog.list.note}</div>
                    </div>
                  )}

                  {listDetailDialog.list.supplierEmail && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Lieferant E-Mail</div>
                      <div className="text-sm text-gray-900">{listDetailDialog.list.supplierEmail}</div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Produkte</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Produkt</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Menge</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Einheit</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {listDetailDialog.list.orders?.map((order) => (
                            <tr key={order.id}>
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-900">{order.product?.name || '-'}</div>
                                {order.product?.category?.name && (
                                  <div className="text-xs text-gray-500">{order.product.category.name}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-900">{order.orderQuantity}</td>
                              <td className="px-3 py-2 text-gray-900">
                                {order.orderUnit 
                                  ? (typeof order.orderUnit === 'string' ? order.orderUnit : String(order.orderUnit))
                                  : (order.product?.unit 
                                    ? (typeof order.product.unit === 'string' ? order.product.unit : String(order.product.unit))
                                    : '-')}
                              </td>
                              <td className="px-3 py-2">{getStatusBadge(order.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sticky bottom-0 bg-white">
                  <button
                    onClick={() => setListDetailDialog({ open: false, list: null })}
                    className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Schließen
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await adminService.printStockOrderListPDF(listDetailDialog.list.id);
                      } catch (error) {
                        toast.error('Fehler beim Drucken der PDF');
                      }
                    }}
                    className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 flex items-center justify-center gap-1.5"
                  >
                    <FiPrinter className="w-4 h-4" />
                    Drucken
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await adminService.downloadStockOrderListPDF(listDetailDialog.list.id);
                        toast.success('PDF erfolgreich heruntergeladen');
                      } catch (error) {
                        toast.error('Fehler beim Herunterladen der PDF');
                      }
                    }}
                    className="px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                  >
                    <FiDownload className="w-4 h-4" />
                    PDF herunterladen
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

