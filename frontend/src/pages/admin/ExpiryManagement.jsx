import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiAlertCircle, FiTag, FiTrash2, FiRotateCcw, FiClock, FiSettings, FiX, FiCamera, FiMail } from 'react-icons/fi';
import { toast } from 'react-toastify';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { de } from 'date-fns/locale';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import BarcodeScanner from '../../components/common/BarcodeScanner';

// API URL - Development'ta Vite proxy kullan, production'da environment variable veya tam URL
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  // Development modunda Vite proxy kullan
  if (import.meta.env.DEV) {
    return '/api';
  }
  // Production'da tam URL kullan
  return 'http://localhost:5001/api';
};

const API_URL = getApiUrl();

function ExpiryManagement() {
  const [criticalProducts, setCriticalProducts] = useState([]);
  const [warningProducts, setWarningProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({ enabled: true, warningDays: 3, criticalDays: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    // localStorage'dan aktif tab'ı oku, yoksa varsayılan olarak 0 (Critical)
    const savedTab = localStorage.getItem('expiryManagement_activeTab');
    return savedTab ? parseInt(savedTab, 10) : 0;
  });

  // Dialog states
  const [removeDialog, setRemoveDialog] = useState({ open: false, product: null });
  const [labelDialog, setLabelDialog] = useState({ open: false, product: null });
  const [undoDialog, setUndoDialog] = useState({ open: false, actionId: null, productName: '' });
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState(null); // 'critical' veya 'warning'
  const [dateUpdateDialog, setDateUpdateDialog] = useState({ open: false, product: null }); // Kırmızı alan için
  const [warningDateUpdateDialog, setWarningDateUpdateDialog] = useState({ open: false, product: null }); // Sarı alan için

  // Form states
  const [excludeFromCheck, setExcludeFromCheck] = useState(false);
  const [note, setNote] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState(null); // Date objesi olacak
  const [updateExpiryDate, setUpdateExpiryDate] = useState(null); // Date objesi olacak

  useEffect(() => {
    fetchData();
    
    // Günlük bildirimi tetikle (sayfaya giren ilk kişi)
    const triggerDailyReminder = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.get(
          `${API_URL}/admin/expiry/daily-reminder`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        // Hata olsa bile sessizce devam et (önemli değil)
        console.log('Günlük bildirim hatası (önemli değil):', err);
      }
    };
    
    triggerDailyReminder();
    
    // Custom styles for DatePicker
    const datePickerStyles = `
      .react-datepicker {
        font-size: 1.25rem !important;
        border-radius: 0.5rem !important;
      }
      .react-datepicker__header {
        padding-top: 1rem !important;
        background-color: #f3f4f6 !important;
        border-bottom: 1px solid #e5e7eb !important;
      }
      .react-datepicker__current-month {
        font-size: 1.125rem !important;
        font-weight: 600 !important;
        margin-bottom: 0.5rem !important;
      }
      .react-datepicker__day-name {
        font-size: 0.875rem !important;
        font-weight: 600 !important;
        width: 2.5rem !important;
        line-height: 2.5rem !important;
        margin: 0.25rem !important;
      }
      .react-datepicker__day {
        font-size: 1rem !important;
        width: 2.5rem !important;
        line-height: 2.5rem !important;
        margin: 0.25rem !important;
      }
      .react-datepicker__day--selected,
      .react-datepicker__day--keyboard-selected {
        background-color: #3b82f6 !important;
        border-radius: 0.375rem !important;
      }
      .react-datepicker__day:hover {
        border-radius: 0.375rem !important;
      }
      .react-datepicker__navigation {
        top: 1rem !important;
      }
      .react-datepicker__navigation-icon::before {
        border-color: #374151 !important;
        border-width: 2px 2px 0 0 !important;
      }
      .react-datepicker-popper {
        z-index: 9999 !important;
        position: fixed !important;
      }
      .react-datepicker-popper[data-placement^="bottom"] {
        margin-top: 8px !important;
      }
      .react-datepicker-popper[data-placement^="top"] {
        margin-bottom: 8px !important;
      }
      .react-datepicker__portal {
        z-index: 9999 !important;
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = datePickerStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      // Cleanup
      const existingStyle = document.querySelector('style[data-datepicker-custom]');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Aktif tab değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('expiryManagement_activeTab', activeTab.toString());
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [criticalRes, warningRes, historyRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/expiry/critical`, config),
        axios.get(`${API_URL}/admin/expiry/warning`, config),
        axios.get(`${API_URL}/admin/expiry/history?limit=50`, config),
        axios.get(`${API_URL}/admin/expiry/settings`, config),
      ]);

      setCriticalProducts(criticalRes.data || []);
      setWarningProducts(warningRes.data || []);
      setHistory(historyRes.data?.actions || []);
      setSettings(settingsRes.data || { enabled: true, warningDays: 3, criticalDays: 0 });
      setError(null);
    } catch (err) {
      // Hata mesajını string'e çevir
      let errorMessage = 'Fehler beim Laden der Daten';
      if (err.response?.data?.error) {
        errorMessage = typeof err.response.data.error === 'string' 
          ? err.response.data.error 
          : err.response.data.error?.message || JSON.stringify(err.response.data.error);
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async () => {
    if (!removeDialog.product) return;

    // Tarih girilmesi zorunlu
    if (!newExpiryDate) {
      toast.error('Bitte geben Sie ein Datum ein');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `${API_URL}/admin/expiry/update-date/${removeDialog.product.id}`,
        { 
          newExpiryDate: newExpiryDate ? newExpiryDate.toISOString().split('T')[0] : null,
          note: note || 'MHD aktualisiert'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('MHD erfolgreich aktualisiert');
      setRemoveDialog({ open: false, product: null });
      setNote('');
      setNewExpiryDate(null);
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler während des Vorgangs';
      toast.error(errorMessage);
    }
  };

  const handleDeactivateCriticalProduct = async (productId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/remove/${productId}`,
        { 
          excludeFromCheck: true, 
          note: 'Produkt deaktiviert'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Produkt erfolgreich deaktiviert');
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler beim Deaktivieren';
      toast.error(errorMessage);
    }
  };

  const handleUpdateExpiryDate = async (productId, isWarning = false) => {
    if (!updateExpiryDate) {
      toast.error('Bitte geben Sie ein Datum ein');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `${API_URL}/admin/expiry/update-date/${productId}`,
        { 
          newExpiryDate: updateExpiryDate ? updateExpiryDate.toISOString().split('T')[0] : null,
          note: 'MHD aktualisiert'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('MHD erfolgreich aktualisiert');
      setDateUpdateDialog({ open: false, product: null });
      setWarningDateUpdateDialog({ open: false, product: null });
      setUpdateExpiryDate(null);
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler beim Aktualisieren des MHD';
      toast.error(errorMessage);
    }
  };

  const handleDeactivateWarningProduct = async (productId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/remove/${productId}`,
        { 
          excludeFromCheck: true, 
          note: 'Deaktiviert - yeni mal yok',
          newExpiryDate: null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Produkt erfolgreich deaktiviert');
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler während des Vorgangs';
      toast.error(errorMessage);
    }
  };

  const handleLabelProduct = async () => {
    if (!labelDialog.product) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/label/${labelDialog.product.id}`,
        { note },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Produkt erfolgreich etikettiert');
      setLabelDialog({ open: false, product: null });
      setNote('');
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler während des Vorgangs';
      toast.error(errorMessage);
    }
  };

  const handleUndoAction = async (actionId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/undo/${actionId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Vorgang erfolgreich rückgängig gemacht');
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler beim Rückgängigmachen';
      toast.error(errorMessage);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `${API_URL}/admin/expiry/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Einstellungen erfolgreich aktualisiert');
      setSettingsDialog(false);
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler beim Aktualisieren der Einstellungen';
      toast.error(errorMessage);
    }
  };

  // Barkod okuma fonksiyonları
  const handleBarcodeScan = async (barcode) => {
    try {
      // Barkod ile ürünü bul
      const products = scannerMode === 'critical' ? criticalProducts : warningProducts;
      const product = products.find(p => p.barcode === barcode);

      if (!product) {
        toast.warning(`Barcode gelesen: ${barcode} - Dieser Barcode wurde nicht in der Liste gefunden`);
        return; // Popup açık kalacak
      }

      // Moda göre işlem yap
      if (scannerMode === 'critical') {
        // Kritik ürün için tarih güncelleme dialogunu aç
        setDateUpdateDialog({ open: true, product });
        // Popup'ı kapat
        setBarcodeScannerOpen(false);
        setScannerMode(null);
      } else if (scannerMode === 'warning') {
        // Uyarı ürününü etiketle
        await handleLabelProductByBarcode(product);
        // İşlem başarılı olduğunda popup'ı kapat
        setBarcodeScannerOpen(false);
        setScannerMode(null);
      }
    } catch (err) {
      toast.error('Fehler beim Verarbeiten des Barcodes');
      console.error('Barkod işleme hatası:', err);
      // Hata olsa bile popup açık kalsın
    }
  };

  const handleRemoveProductByBarcode = async (product, excludeFromExpiryCheck = false) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/remove/${product.id}`,
        { excludeFromCheck: excludeFromExpiryCheck, note: 'Durch Barcode-Scan entfernt', newExpiryDate: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`${product.name} erfolgreich entfernt`);
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler während des Vorgangs';
      toast.error(errorMessage);
    }
  };

  const handleLabelProductByBarcode = async (product) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/label/${product.id}`,
        { note: 'Durch Barcode-Scan etikettiert' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`${product.name} erfolgreich etikettiert`);
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler während des Vorgangs';
      toast.error(errorMessage);
    }
  };

  const openBarcodeScanner = (mode) => {
    setScannerMode(mode);
    setBarcodeScannerOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const getActionTypeLabel = (type) => {
    const types = {
      labeled: 'Etikettiert',
      removed: 'Entfernt',
      undone: 'Rückgängig gemacht',
    };
    return types[type] || type;
  };

  const getActionTypeBadgeClass = (type) => {
    const classes = {
      labeled: 'bg-amber-100 text-amber-800',
      removed: 'bg-red-100 text-red-800',
      undone: 'bg-blue-100 text-blue-800',
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  };

  // Bugün mail gönderilip gönderilmediğini kontrol et
  const hasMailBeenSentToday = () => {
    const today = new Date().toDateString();
    const lastSentDate = localStorage.getItem('expiryManagement_mailSentDate');
    return lastSentDate === today;
  };

  // Mail gönderme fonksiyonu
  const handleSendCompletionMail = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/check-and-notify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Bugünün tarihini localStorage'a kaydet
      const today = new Date().toDateString();
      localStorage.setItem('expiryManagement_mailSentDate', today);

      toast.success('E-Mail erfolgreich gesendet');
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Fehler beim Senden der E-Mail';
      toast.error(errorMessage);
    }
  };

  // Toplam işlenmemiş ürün sayısını hesapla
  const getTotalUnprocessedCount = () => {
    return getUnprocessedCriticalCount() + getUnprocessedWarningCount();
  };

  // Mail gönderme butonunun görünür olup olmayacağını kontrol et
  const shouldShowMailButton = () => {
    return getTotalUnprocessedCount() === 0 && !hasMailBeenSentToday();
  };

  // İşlem yapılmamış ürünleri say
  const getUnprocessedCriticalCount = () => {
    return criticalProducts.filter(product => {
      // Deaktif edilmişse sayma
      if (product.excludeFromExpiryCheck === true) {
        return false;
      }
      // İşlem yapılmışsa ve geri alınmamışsa sayma
      if (product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone') {
        return false;
      }
      return true;
    }).length;
  };

  const getUnprocessedWarningCount = () => {
    return warningProducts.filter(product => {
      // Deaktif edilmişse sayma
      if (product.excludeFromExpiryCheck === true) {
        return false;
      }
      // İşlem yapılmışsa ve geri alınmamışsa sayma
      if (product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone') {
        return false;
      }
      return true;
    }).length;
  };

  if (loading && criticalProducts.length === 0 && warningProducts.length === 0) {
    return <Loading />;
  }

  return (
    <div >
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Verwaltung des Mindesthaltbarkeitsdatums (MHD)
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {shouldShowMailButton() && (
              <button
                onClick={handleSendCompletionMail}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap animate-pulse"
              >
                <FiMail className="w-4 h-4" />
                <span>E-Mail senden</span>
              </button>
            )}
            <button
              onClick={() => setSettingsDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
            >
              <FiSettings className="w-4 h-4" />
              <span>Einstellungen</span>
            </button>
          </div>
        </div>
        <p className="text-sm md:text-base text-gray-600">
          Verwalten Sie Produkte auf kritischer und Warnstufe
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
            <span className="hidden sm:inline">Kritische Produkte</span>
            <span className="sm:hidden">Kritisch</span>
            {getUnprocessedCriticalCount() > 0 && (
              <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {getUnprocessedCriticalCount()}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
              activeTab === 1
                ? 'border-amber-500 text-amber-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <FiAlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Warnprodukte</span>
            <span className="sm:hidden">Warnung</span>
            {getUnprocessedWarningCount() > 0 && (
              <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 1 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {getUnprocessedWarningCount()}
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
            <span className="hidden sm:inline">Vorgangsverlauf</span>
            <span className="sm:hidden">Verlauf</span>
          </button>
        </div>
      </div>

      {/* KRİTİK ÜRÜNLER TABLOSU */}
      {activeTab === 0 && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-base md:text-lg font-semibold text-red-900 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Produkte am letzten Tag</span>
              </h2>
              {criticalProducts.length > 0 && (
                <button
                  onClick={() => openBarcodeScanner('critical')}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs md:text-sm font-medium"
                >
                  <FiCamera className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Barcode scannen</span>
                </button>
              )}
            </div>

            {criticalProducts.length === 0 ? (
              <EmptyState
                icon={FiAlertCircle}
                title="Keine Produkte auf kritischer Stufe"
                message="Es gibt keine Produkte am letzten Tag."
              />
            ) : (
              <>
                {/* Desktop Tablo Görünümü */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Produktname
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      MHD / Verbleibende Tage
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {criticalProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-red-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="mt-1 space-y-0.5">
                          {product.category?.name && (
                            <div className="text-xs text-gray-500">{product.category.name}</div>
                          )}
                          {product.barcode && (
                            <div className="text-xs text-gray-400 font-mono">{product.barcode}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(product.expiryDate)}
                        </div>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {product.daysUntilExpiry} Tage
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {product.excludeFromExpiryCheck === true ? (
                            <button
                              onClick={() => setDateUpdateDialog({ open: true, product })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Datum Eingeben
                            </button>
                          ) : (
                            <>
                              {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                                <button
                                  onClick={() => handleUndoAction(product.lastAction.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Rückgängig machen"
                                >
                                  <FiRotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setRemoveDialog({ open: true, product })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                              >
                                <FiTrash2 className="w-4 h-4" />
                                Aussortieren
                              </button>
                              <button
                                onClick={() => handleDeactivateCriticalProduct(product.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                Deaktivieren
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

            {/* Mobil Kart Görünümü - Kritik */}
            <div className="md:hidden divide-y divide-gray-200">
              {criticalProducts.map((product) => (
                <div key={product.id} className="p-4 hover:bg-red-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm mb-1">{product.name}</h3>
                      {product.category?.name && (
                        <p className="text-xs text-gray-500 mb-0.5">{product.category.name}</p>
                      )}
                      {product.barcode && (
                        <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">MHD:</div>
                    <div className="text-sm text-gray-900">{formatDate(product.expiryDate)}</div>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {product.daysUntilExpiry} Tage
                      </span>
                    </div>
                  </div>

                  {product.excludeFromExpiryCheck === true ? (
                    <button
                      onClick={() => setDateUpdateDialog({ open: true, product })}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Datum Eingeben
                    </button>
                  ) : (
                    <div className="flex flex-row flex-wrap gap-2">
                      {product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                        <button
                          onClick={() => handleUndoAction(product.lastAction.id)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                          title="Rückgängig machen"
                        >
                          <FiRotateCcw className="w-3 h-3" />
                          <span className="hidden sm:inline">Rückgängig</span>
                        </button>
                      )}
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => setRemoveDialog({ open: true, product })}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                        >
                          <FiTrash2 className="w-3 h-3" />
                          Aussortieren
                        </button>
                        <button
                          onClick={() => handleDeactivateCriticalProduct(product.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          Deaktivieren
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
            )}
          </div>
        </>
      )}

      {/* UYARI ÜRÜNLERİ TABLOSU */}
      {activeTab === 1 && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-base md:text-lg font-semibold text-amber-900 flex items-center gap-2">
                <FiAlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Rabattetikett sollte angebracht werden</span>
              </h2>
              {warningProducts.length > 0 && (
                <button
                  onClick={() => openBarcodeScanner('warning')}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-xs md:text-sm font-medium"
                >
                  <FiCamera className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Barcode scannen</span>
                </button>
              )}
            </div>

            {warningProducts.length === 0 ? (
              <EmptyState
                icon={FiAlertTriangle}
                title="Keine Produkte auf Warnstufe"
                message="Es gibt keine Produkte, die etikettiert werden müssen."
              />
            ) : (
              <>
                {/* Desktop Tablo Görünümü */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Produktname
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      MHD / Verbleibende Tage
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {warningProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-amber-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="mt-1 space-y-0.5">
                          {product.category?.name && (
                            <div className="text-xs text-gray-500">{product.category.name}</div>
                          )}
                          {product.barcode && (
                            <div className="text-xs text-gray-400 font-mono">{product.barcode}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(product.expiryDate)}
                        </div>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {product.daysUntilExpiry} Tage
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {product.excludeFromExpiryCheck && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Deaktiviert
                            </span>
                          )}
                          {product.lastAction?.actionType === 'labeled' && !product.lastAction?.isUndone ? (
                            <>
                              {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                                <button
                                  onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name })}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Rückgängig machen"
                                >
                                  <FiRotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm cursor-default">
                                <FiTag className="w-4 h-4" />
                                Erledigt!
                              </span>
                              <button
                                onClick={() => setWarningDateUpdateDialog({ open: true, product })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                Neues Datum
                              </button>
                            </>
                          ) : (
                            <>
                              {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                                <button
                                  onClick={() => handleUndoAction(product.lastAction.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Rückgängig machen"
                                >
                                  <FiRotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              {!product.excludeFromExpiryCheck && (
                                <button
                                  onClick={() => setLabelDialog({ open: true, product })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                                >
                                  <FiTag className="w-4 h-4" />
                                  Reduziert
                                </button>
                              )}
                              {!product.excludeFromExpiryCheck && (
                                <button
                                  onClick={() => handleDeactivateWarningProduct(product.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                >
                                  Deaktivieren
                                </button>
                              )}
                              <button
                                onClick={() => setWarningDateUpdateDialog({ open: true, product })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                Neues Datum
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

            {/* Mobil Kart Görünümü - Warning */}
            <div className="md:hidden divide-y divide-gray-200">
              {warningProducts.map((product) => (
                <div key={product.id} className="p-4 hover:bg-amber-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm mb-1">{product.name}</h3>
                      {product.category?.name && (
                        <p className="text-xs text-gray-500 mb-0.5">{product.category.name}</p>
                      )}
                      {product.barcode && (
                        <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">MHD:</div>
                    <div className="text-sm text-gray-900">{formatDate(product.expiryDate)}</div>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {product.daysUntilExpiry} Tage
                      </span>
                    </div>
                  </div>

                  {product.excludeFromExpiryCheck && (
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Deaktiviert
                      </span>
                    </div>
                  )}
                  <div className="flex flex-row gap-2 w-full">
                    {product.lastAction?.actionType === 'labeled' && !product.lastAction?.isUndone ? (
                      <>
                        {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                          <button
                            onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name })}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                            title="Rückgängig machen"
                          >
                            <FiRotateCcw className="w-3 h-3" />
                            <span className="hidden sm:inline">Rückgängig machen</span>
                          </button>
                        )}
                        <span className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-medium">
                          <FiTag className="w-3 h-3" />
                          Erledigt!
                        </span>
                        <button
                          onClick={() => setWarningDateUpdateDialog({ open: true, product })}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          Neues Datum
                        </button>
                      </>
                    ) : (
                      <>
                        {product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                          <button
                            onClick={() => handleUndoAction(product.lastAction.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                            title="Rückgängig machen"
                          >
                            <FiRotateCcw className="w-3 h-3" />
                            <span className="hidden sm:inline">Rückgängig</span>
                          </button>
                        )}
                        {!product.excludeFromExpiryCheck && (
                          <button
                            onClick={() => setLabelDialog({ open: true, product })}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-xs font-medium"
                          >
                            <FiTag className="w-3 h-3" />
                            Reduziert
                          </button>
                        )}
                        {!product.excludeFromExpiryCheck && (
                          <button
                            onClick={() => handleDeactivateWarningProduct(product.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium"
                          >
                            Deaktivieren
                          </button>
                        )}
                        <button
                          onClick={() => setWarningDateUpdateDialog({ open: true, product })}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          Neues Datum
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
        </>
      )}

      {/* İŞLEM GEÇMİŞİ */}
      {activeTab === 2 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiClock className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Vorgangsverlauf</span>
            </h2>
          </div>

          {history.length === 0 ? (
            <EmptyState
              icon={FiClock}
              title="Noch keine Vorgangsaufzeichnung vorhanden"
              message="MHD-Verwaltungsvorgänge werden hier angezeigt."
            />
          ) : (
            <>
              {/* Desktop Tablo Görünümü */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Produktname
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      MHD / Verbleibende Tage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Vorgang
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Notiz
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((action) => (
                    <tr key={action.id} className={`hover:bg-gray-50 transition-colors ${action.isUndone ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{action.product?.name || '-'}</div>
                        <div className="mt-1 space-y-0.5">
                          {action.product?.category?.name && (
                            <div className="text-xs text-gray-500">{action.product.category.name}</div>
                          )}
                          {action.product?.barcode && (
                            <div className="text-xs text-gray-400 font-mono">{action.product.barcode}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{formatDate(action.expiryDate)}</div>
                        <div className="mt-1">
                          <span className="text-xs text-gray-600">{action.daysUntilExpiry} Tage</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(action.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeBadgeClass(action.actionType)}`}>
                          {getActionTypeLabel(action.actionType)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {action.admin?.firstName || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {action.note || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!action.isUndone && action.actionType !== 'undone' && (
                          <button
                            onClick={() => handleUndoAction(action.id)}
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

            {/* Mobil Kart Görünümü - History */}
            <div className="md:hidden divide-y divide-gray-200">
              {history.map((action) => (
                <div key={action.id} className={`p-4 hover:bg-gray-50 transition-colors ${action.isUndone ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm mb-1">
                        {action.product?.name || '-'}
                      </h3>
                      {action.product?.category?.name && (
                        <p className="text-xs text-gray-500 mb-0.5">{action.product.category.name}</p>
                      )}
                      {action.product?.barcode && (
                        <p className="text-xs text-gray-400 font-mono">{action.product.barcode}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${getActionTypeBadgeClass(action.actionType)}`}>
                      {getActionTypeLabel(action.actionType)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">MHD:</span>
                      <span className="ml-1 text-gray-900">{formatDate(action.expiryDate)}</span>
                      <span className="ml-2 text-gray-600">({action.daysUntilExpiry} Tage)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Datum:</span>
                      <span className="text-gray-900">{formatDate(action.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Admin:</span>
                      <span className="text-gray-900">{action.admin?.firstName || '-'}</span>
                    </div>
                    {action.note && (
                      <div className="pt-1">
                        <span className="text-gray-500">Notiz:</span>
                        <p className="text-gray-900 mt-0.5">{action.note}</p>
                      </div>
                    )}
                  </div>

                  {!action.isUndone && action.actionType !== 'undone' && (
                    <button
                      onClick={() => handleUndoAction(action.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                      title="Rückgängig machen"
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

      {/* KALDIRMA DİALOGU */}
      <AnimatePresence>
        {removeDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRemoveDialog({ open: false, product: null })}
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
                  <h3 className="text-sm md:text-base font-semibold text-gray-900">Produkt aussortieren</h3>
                  <button
                    onClick={() => {
                      setRemoveDialog({ open: false, product: null });
                      setNewExpiryDate('');
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs md:text-sm text-gray-700">
                    Möchten Sie das Produkt <strong>{removeDialog.product?.name}</strong> wirklich aussortieren?
                  </p>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Neues MHD (optional)
                    </label>
                    <DatePicker
                      selected={newExpiryDate}
                      onChange={(date) => setNewExpiryDate(date)}
                      dateFormat="dd.MM.yyyy"
                      minDate={new Date()}
                      locale={de}
                      placeholderText="dd.MM.yyyy"
                      className="w-full px-4 py-2 text-lg md:text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      wrapperClassName="w-full"
                      calendarClassName="!text-lg"
                      popperClassName="!z-[9999]"
                      popperPlacement="bottom-start"
                      withPortal
                      showPopperArrow={false}
                      popperModifiers={[
                        {
                          name: "offset",
                          options: {
                            offset: [0, 8],
                          },
                        },
                        {
                          name: "preventOverflow",
                          options: {
                            rootBoundary: "viewport",
                            tether: false,
                            altAxis: true,
                          },
                        },
                        {
                          name: "flip",
                          options: {
                            fallbackPlacements: ["bottom-start", "bottom", "top-start", "top"],
                          },
                        },
                      ]}
                    />
                  </div>
                  <textarea
                    placeholder="Notiz (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setRemoveDialog({ open: false, product: null });
                      setNewExpiryDate(null);
                      setNote('');
                    }}
                    className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => handleRemoveProduct()}
                    disabled={!newExpiryDate}
                    className={`px-3 py-2 text-xs md:text-sm bg-red-600 text-white rounded-lg transition-colors whitespace-nowrap ${
                      !newExpiryDate ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                    }`}
                  >
                    Aussortieren
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ETİKETLEME DİALOGU */}
      <AnimatePresence>
        {labelDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLabelDialog({ open: false, product: null })}
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
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Produkt etikettieren</h3>
                  <button
                    onClick={() => setLabelDialog({ open: false, product: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-gray-700">
                    Möchten Sie wirklich ein Rabattetikett auf das Produkt <strong>{labelDialog.product?.name}</strong> kleben?
                  </p>
                  <textarea
                    placeholder="Notiz (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => setLabelDialog({ open: false, product: null })}
                    className="px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleLabelProduct}
                    className="px-4 py-2 text-xs md:text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Etikettiert
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* UNDO DİALOGU */}
      <AnimatePresence>
        {undoDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUndoDialog({ open: false, actionId: null, productName: '' })}
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
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Vorgang rückgängig machen</h3>
                  <button
                    onClick={() => setUndoDialog({ open: false, actionId: null, productName: '' })}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-gray-700">
                    Möchten Sie die "Erledigt!"-Markierung für das Produkt <strong>{undoDialog.productName}</strong> wirklich rückgängig machen?
                  </p>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => setUndoDialog({ open: false, actionId: null, productName: '' })}
                    className="px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => {
                      handleUndoAction(undoDialog.actionId);
                      setUndoDialog({ open: false, actionId: null, productName: '' });
                    }}
                    className="px-4 py-2 text-xs md:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Rückgängig machen
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AYARLAR DİALOGU */}
      <AnimatePresence>
        {settingsDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsDialog(false)}
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
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">MHD-Verwaltungseinstellungen</h3>
                  <button
                    onClick={() => setSettingsDialog(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Orange Warnung (Wie viele Tage vorher soll das Etikett angebracht werden?)
                    </label>
                    <input
                      type="number"
                      value={settings.warningDays}
                      onChange={(e) => setSettings({ ...settings, warningDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Rote Kritik (Wie viele Tage vorher soll entfernt werden?)
                    </label>
                    <input
                      type="number"
                      value={settings.criticalDays}
                      onChange={(e) => setSettings({ ...settings, criticalDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-xs md:text-sm text-gray-700">MHD-Verwaltung aktiv</span>
                  </label>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => setSettingsDialog(false)}
                    className="px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdateSettings}
                    className="px-4 py-2 text-xs md:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BARKOD OKUMA SCANNER */}
      <BarcodeScanner
        isOpen={barcodeScannerOpen}
        onClose={() => {
          setBarcodeScannerOpen(false);
          setScannerMode(null);
        }}
        onScan={handleBarcodeScan}
        title={scannerMode === 'critical' ? 'Kritisches Produkt-Barcode scannen' : 'Warnprodukt-Barcode scannen'}
        keepOpen={true}
      />

      {/* TARİH GÜNCELLEME DİALOGU - Kırmızı Alan */}
      <AnimatePresence>
        {dateUpdateDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setDateUpdateDialog({ open: false, product: null });
                setUpdateExpiryDate(null);
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
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">MHD Datum Eingeben</h3>
                  <button
                    onClick={() => {
                      setDateUpdateDialog({ open: false, product: null });
                      setUpdateExpiryDate(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-gray-700">
                    Bitte geben Sie das neue MHD für <strong>{dateUpdateDialog.product?.name}</strong> ein:
                  </p>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      Neues MHD
                    </label>
                    <DatePicker
                      selected={updateExpiryDate}
                      onChange={(date) => setUpdateExpiryDate(date)}
                      dateFormat="dd.MM.yyyy"
                      minDate={new Date()}
                      locale={de}
                      placeholderText="dd.MM.yyyy"
                      className="w-full px-4 py-2 text-lg md:text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      wrapperClassName="w-full"
                      calendarClassName="!text-lg"
                      popperClassName="!z-[9999]"
                      popperPlacement="bottom-start"
                      withPortal
                      showPopperArrow={false}
                      popperModifiers={[
                        {
                          name: "offset",
                          options: {
                            offset: [0, 8],
                          },
                        },
                        {
                          name: "preventOverflow",
                          options: {
                            rootBoundary: "viewport",
                            tether: false,
                            altAxis: true,
                          },
                        },
                        {
                          name: "flip",
                          options: {
                            fallbackPlacements: ["bottom-start", "bottom", "top-start", "top"],
                          },
                        },
                      ]}
                    />
                  </div>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => {
                      setDateUpdateDialog({ open: false, product: null });
                      setUpdateExpiryDate(null);
                    }}
                    className="px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => handleUpdateExpiryDate(dateUpdateDialog.product?.id, false)}
                    className="px-4 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TARİH GÜNCELLEME DİALOGU - Sarı Alan */}
      <AnimatePresence>
        {warningDateUpdateDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setWarningDateUpdateDialog({ open: false, product: null });
                setUpdateExpiryDate(null);
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
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Neues Datum hinzufügen</h3>
                  <button
                    onClick={() => {
                      setWarningDateUpdateDialog({ open: false, product: null });
                      setUpdateExpiryDate(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-gray-700">
                    Bitte geben Sie das neue MHD für <strong>{warningDateUpdateDialog.product?.name}</strong> ein:
                  </p>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      Neues MHD
                    </label>
                    <DatePicker
                      selected={updateExpiryDate}
                      onChange={(date) => setUpdateExpiryDate(date)}
                      dateFormat="dd.MM.yyyy"
                      minDate={new Date()}
                      locale={de}
                      placeholderText="dd.MM.yyyy"
                      className="w-full px-4 py-2 text-lg md:text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      wrapperClassName="w-full"
                      calendarClassName="!text-lg"
                      popperClassName="!z-[9999]"
                      popperPlacement="bottom-start"
                      withPortal
                      showPopperArrow={false}
                      popperModifiers={[
                        {
                          name: "offset",
                          options: {
                            offset: [0, 8],
                          },
                        },
                        {
                          name: "preventOverflow",
                          options: {
                            rootBoundary: "viewport",
                            tether: false,
                            altAxis: true,
                          },
                        },
                        {
                          name: "flip",
                          options: {
                            fallbackPlacements: ["bottom-start", "bottom", "top-start", "top"],
                          },
                        },
                      ]}
                    />
                  </div>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => {
                      setWarningDateUpdateDialog({ open: false, product: null });
                      setUpdateExpiryDate(null);
                    }}
                    className="px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => handleUpdateExpiryDate(warningDateUpdateDialog.product?.id, true)}
                    className="px-4 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Speichern
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

export default ExpiryManagement;

