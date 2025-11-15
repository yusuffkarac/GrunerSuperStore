import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiAlertCircle, FiTag, FiTrash2, FiRotateCcw, FiClock, FiSettings, FiX, FiCamera, FiMail, FiChevronLeft, FiChevronRight, FiGrid, FiLayers, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { toast } from 'react-toastify';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { de } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import { useModalScroll } from '../../hooks/useModalScroll';
import { getTodayInGermany, getTodayStringInGermany } from '../../utils/dateUtils';

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
  // Production'da nginx üzerinden git (port kullanma, nginx proxy kullan)
  return '/api';
};

const API_URL = getApiUrl();

function ExpiryManagement() {
  const { themeColors } = useTheme();
  const [criticalProducts, setCriticalProducts] = useState([]);
  const [warningProducts, setWarningProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({ enabled: true, warningDays: 3, criticalDays: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    // localStorage'dan seçili tarihi oku, yoksa bugün (Almanya saatine göre)
    const savedDate = localStorage.getItem('expiryManagement_selectedDate');
    return savedDate ? new Date(savedDate) : getTodayInGermany();
  });
  const [activeTab, setActiveTab] = useState(() => {
    // localStorage'dan aktif tab'ı oku, yoksa varsayılan olarak 0 (Critical)
    const savedTab = localStorage.getItem('expiryManagement_activeTab');
    return savedTab ? parseInt(savedTab, 10) : 0;
  });
  const [viewMode, setViewMode] = useState(() => {
    // localStorage'dan görünüm modunu oku, yoksa varsayılan olarak 'category' (kategori)
    const savedMode = localStorage.getItem('expiryManagement_viewMode');
    return savedMode || 'category'; // 'criticality' veya 'category'
  });
  const [expandedCategories, setExpandedCategories] = useState(() => {
    // localStorage'dan açık kategorileri oku
    const saved = localStorage.getItem('expiryManagement_expandedCategories');
    return saved ? JSON.parse(saved) : {}; // { "Kategori Adı": true/false }
  });

  // Dialog states
  const [removeDialog, setRemoveDialog] = useState({ open: false, product: null });
  const [undoDialog, setUndoDialog] = useState({ open: false, actionId: null, productName: '', actionType: null });
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState(null); // 'critical' veya 'warning'
  const [dateUpdateDialog, setDateUpdateDialog] = useState({ open: false, product: null }); // Kırmızı alan için
  const [warningDateUpdateDialog, setWarningDateUpdateDialog] = useState({ open: false, product: null }); // Sarı alan için
  const [mailResendDialog, setMailResendDialog] = useState(false);

  // Form states
  const [note, setNote] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState(null); // Date objesi olacak
  const [updateExpiryDate, setUpdateExpiryDate] = useState(null); // Date objesi olacak

  // Modal scroll yönetimi - her modal için
  useModalScroll(removeDialog.open);
  useModalScroll(undoDialog.open);
  useModalScroll(settingsDialog);
  useModalScroll(barcodeScannerOpen);
  useModalScroll(dateUpdateDialog.open);
  useModalScroll(warningDateUpdateDialog.open);
  useModalScroll(mailResendDialog);

  useEffect(() => {
    fetchData();
  }, [selectedDate, activeTab]);
  
  useEffect(() => {
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

  // Seçili tarih değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (selectedDate) {
      localStorage.setItem('expiryManagement_selectedDate', selectedDate.toISOString());
    }
  }, [selectedDate]);

  // Görünüm modu değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('expiryManagement_viewMode', viewMode);
    // Kategori moduna geçildiğinde aktif tab'ı 0'a ayarla (kategori görünümü için)
    if (viewMode === 'category' && activeTab !== 2) {
      setActiveTab(0);
    }
  }, [viewMode]);

  // Açık kategorileri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('expiryManagement_expandedCategories', JSON.stringify(expandedCategories));
  }, [expandedCategories]);

  // Tarihi yerel saat diliminde formatla (timezone kaymasını önlemek için)
  const formatDateToLocalString = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Tarih filtresi için date parametresi ekle (sadece history için)
      const dateParam = activeTab === 2 && selectedDate 
        ? `&date=${formatDateToLocalString(selectedDate)}` 
        : '';

      const [criticalRes, warningRes, historyRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/expiry/critical`, config),
        axios.get(`${API_URL}/admin/expiry/warning`, config),
        axios.get(`${API_URL}/admin/expiry/history?limit=1000${dateParam}`, config),
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
          newExpiryDate: newExpiryDate ? formatDateToLocalString(newExpiryDate) : null,
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
          newExpiryDate: updateExpiryDate ? formatDateToLocalString(updateExpiryDate) : null,
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

  const handleLabelProduct = async (productId, productName = '') => {
    if (!productId) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/label/${productId}`,
        { note: 'Reduzieren' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`${productName} erfolgreich etikettiert`);
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

  // Note'dan OLD_DATE kısmını temizle (kullanıcıya gösterim için)
  const cleanNote = (note) => {
    if (!note) return null;
    return note.replace(/\s*\|\s*OLD_DATE:[^\s|]+/g, '').trim() || null;
  };

  // Tarih navigasyon fonksiyonları
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    // Geleceğe gitmeyi engelle
    const today = getTodayInGermany();
    today.setHours(23, 59, 59, 999);
    if (newDate <= today) {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(getTodayInGermany());
  };

  const isToday = () => {
    const today = getTodayInGermany();
    return selectedDate.toDateString() === today.toDateString();
  };

  const getActionTypeLabel = (type, action) => {
    // Eğer removed ise, excludedFromCheck değerine göre ayır
    if (type === 'removed' && action) {
      if (action.excludedFromCheck === true) {
        return 'Produkt deaktiviert';
      } else {
        return 'Aussortiert';
      }
    }
    
    const types = {
      labeled: 'Etikettiert',
      removed: 'Aussortiert', // Fallback (normalde kullanılmayacak)
      undone: 'Rückgängig gemacht',
    };
    return types[type] || type;
  };

  const getActionTypeBadgeClass = (type, action) => {
    // Eğer removed ise, excludedFromCheck değerine göre ayır
    if (type === 'removed' && action) {
      if (action.excludedFromCheck === true) {
        return 'bg-gray-100 text-gray-800'; // Produkt deaktiviert - gri
      } else {
        return 'bg-red-100 text-red-800'; // Aussortiert - kırmızı
      }
    }
    
    const classes = {
      labeled: 'bg-amber-100 text-amber-800',
      removed: 'bg-red-100 text-red-800', // Fallback
      undone: 'bg-blue-100 text-blue-800',
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  };

  // Bugün mail gönderilip gönderilmediğini kontrol et
  const hasMailBeenSentToday = () => {
    const today = getTodayInGermany().toDateString();
    const lastSentDate = localStorage.getItem('expiryManagement_mailSentDate');
    return lastSentDate === today;
  };

  // Mail gönderme fonksiyonu
  const handleSendCompletionMail = async () => {
    // Eğer bugün zaten gönderilmişse, onay dialog'unu aç
    if (hasMailBeenSentToday()) {
      setMailResendDialog(true);
      return;
    }

    // Direkt gönder
    await sendMail();
  };

  // Mail gönderme işlemi
  const sendMail = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/check-and-notify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Bugünün tarihini localStorage'a kaydet (Almanya saatine göre)
      const today = getTodayInGermany().toDateString();
      localStorage.setItem('expiryManagement_mailSentDate', today);

      toast.success('E-Mail erfolgreich gesendet');
      setMailResendDialog(false);
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
    return getTotalUnprocessedCount() === 0;
  };

  // İşlem yapılmamış mı kontrol et
  const isUnprocessed = (product) => {
    // Bugünün tarihini al (sadece tarih, saat olmadan, Almanya saatine göre)
    const today = getTodayInGermany();
    
    // Deaktif edilmişse ve bugün deaktif edildiyse işlem yapılmış sayılır
    // Ama önceki günlerde deaktif edildiyse tekrar işlem yapılması gerekir (yarın geri gelsin)
    if (product.excludeFromExpiryCheck === true) {
      // Son işlem varsa ve bugün yapıldıysa, bugün için işlem yapılmış sayılır
      if (product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone') {
        const actionDate = new Date(product.lastAction.createdAt);
        actionDate.setHours(0, 0, 0, 0);
        
        if (actionDate.getTime() === today.getTime()) {
          return false; // Bugün deaktif edildi, işlem yapılmış
        }
      }
      // Önceki günlerde deaktif edilmişse, yarın tekrar işlem yapılması gerekir
      return true; // İşlem yapılmamış sayılır (yarın geri gelecek)
    }
    
    // Bugün bir işlem yapılmışsa ve geri alınmamışsa işlem yapılmış sayılır
    if (product.lastAction && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone') {
      // Son işlemin tarihini al
      const actionDate = new Date(product.lastAction.createdAt);
      actionDate.setHours(0, 0, 0, 0);
      
      // Eğer bugün yapıldıysa
      if (actionDate.getTime() === today.getTime()) {
        // Eğer bugün tarih güncellemesi yapılmışsa (note'da "MHD aktualisiert" varsa)
        if (product.lastAction.note && product.lastAction.note.includes('MHD aktualisiert')) {
          // Eğer ürün hala critical veya warning aralığındaysa, yeni işlem gerekiyor (soluk olmamalı)
          if (product.daysUntilExpiry <= settings.warningDays) {
            return true; // Soluk olmamalı - yeni tarihine göre işlem gerekiyor
          }
          // Eğer ürün her iki aralığın dışındaysa (30 gün sonraya atıldı), işlenmiş sayılır (soluk olmalı)
          return false; // Soluk olmalı - bugün için işlenmiş
        }
        // Diğer işlemler için işlenmiş sayılır
        return false;
      }
    }
    return true;
  };

  // Kritik ve uyarı ürünlerini deduplicate et (bir ürün hem kritik hem uyarı olabilir, güncel tarihine göre ayır)
  const getDeduplicatedProducts = () => {
    // Her ürünü ilk hangi listede gördüğümüzü işaretle
    const productMap = {};
    
    // Önce tüm ürünleri map'e ekle
    criticalProducts.forEach(product => {
      if (!productMap[product.id]) {
        productMap[product.id] = { ...product, seenInCritical: true, seenInWarning: false };
      } else {
        productMap[product.id].seenInCritical = true;
      }
    });
    
    warningProducts.forEach(product => {
      if (!productMap[product.id]) {
        productMap[product.id] = { ...product, seenInCritical: false, seenInWarning: true };
      } else {
        productMap[product.id].seenInWarning = true;
      }
    });
    
    const uniqueProducts = Object.values(productMap);
    
    // Ürünleri güncel tarihine göre ayır, ama aralık dışındakiler için eski tarihine göre karar ver
    const uniqueCritical = [];
    const uniqueWarning = [];
    
    uniqueProducts.forEach(p => {
      if (p.daysUntilExpiry <= settings.criticalDays) {
        // Critical aralığında
        uniqueCritical.push(p);
      } else if (p.daysUntilExpiry <= settings.warningDays) {
        // Warning aralığında
        uniqueWarning.push(p);
      } else {
        // Her iki aralığın dışında - işlem öncesi eski tarihine göre karar ver
        // Eğer sadece critical listesinde gördüysek (warning'de yok), critical'de tut
        // Eğer sadece warning listesinde gördüysek (critical'de yok), warning'de tut
        // Eğer her ikisinde de gördüysek, eski tarihi kontrol et
        if (p.seenInCritical && !p.seenInWarning) {
          uniqueCritical.push(p);
        } else if (p.seenInWarning && !p.seenInCritical) {
          uniqueWarning.push(p);
        } else {
          // Her iki listede de var - eski tarihten karar ver
          // lastAction note'unda OLD_DATE varsa onu kullan
          let oldDaysUntilExpiry = p.daysUntilExpiry;
          if (p.lastAction?.note && p.lastAction.note.includes('OLD_DATE:')) {
            const oldDateMatch = p.lastAction.note.match(/OLD_DATE:([^\s|]+)/);
            if (oldDateMatch && oldDateMatch[1]) {
              try {
                const oldDate = new Date(oldDateMatch[1]);
                const today = getTodayInGermany();
                oldDate.setHours(0, 0, 0, 0);
                const diffTime = oldDate - today;
                oldDaysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              } catch (e) {
                // Eski tarih parse edilemezse, şu anki tarihe göre karar ver
              }
            }
          }
          
          // Eski tarih hangi aralıktaysa o listede tut
          if (oldDaysUntilExpiry <= settings.criticalDays) {
            uniqueCritical.push(p);
          } else {
            uniqueWarning.push(p);
          }
        }
      }
    });
    
    return {
      uniqueCritical,
      uniqueWarning
    };
  };

  // İşlem yapılmamış ürünleri say
  const getUnprocessedCriticalCount = () => {
    const { uniqueCritical } = getDeduplicatedProducts();
    return uniqueCritical.filter(product => isUnprocessed(product)).length;
  };

  const getUnprocessedWarningCount = () => {
    const { uniqueWarning } = getDeduplicatedProducts();
    return uniqueWarning.filter(product => isUnprocessed(product)).length;
  };

  // Toplam ürün sayılarını al (sadece işlem yapılmamış ürünler)
  const getTotalCriticalCount = () => {
    const { uniqueCritical } = getDeduplicatedProducts();
    return uniqueCritical.filter(product => isUnprocessed(product)).length;
  };

  const getTotalWarningCount = () => {
    const { uniqueWarning } = getDeduplicatedProducts();
    return uniqueWarning.filter(product => isUnprocessed(product)).length;
  };

  // Bugün yapılan işlemlerin sayısını al
  const getTodayActionCount = () => {
    const today = getTodayInGermany();
    
    return getFilteredHistory().filter(action => {
      const actionDate = new Date(action.createdAt);
      actionDate.setHours(0, 0, 0, 0);
      return actionDate.getTime() === today.getTime();
    }).length;
  };

  // Her ürün için sadece son işlemi getir
  const getFilteredHistory = () => {
    // Geri alınmamış işlemleri al
    const activeActions = history.filter(action => !action.isUndone && action.actionType !== 'undone');
    
    // Her ürün için en son işlemi bul
    const lastActionsByProduct = {};
    
    activeActions.forEach(action => {
      const productId = action.productId || action.product?.id;
      if (!productId) return;
      
      // Eğer bu ürün için daha önce bir işlem yoksa veya bu işlem daha yeni ise
      if (!lastActionsByProduct[productId] || 
          new Date(action.createdAt) > new Date(lastActionsByProduct[productId].createdAt)) {
        lastActionsByProduct[productId] = action;
      }
    });
    
    // Sadece son işlemleri döndür, önce isme göre sonra tarihe göre sırala
    return Object.values(lastActionsByProduct).sort((a, b) => {
      // Önce isme göre sırala
      const nameA = a.product?.name || '';
      const nameB = b.product?.name || '';
      const nameCompare = nameA.localeCompare(nameB, 'de');
      if (nameCompare !== 0) return nameCompare;
      
      // İsimler aynıysa tarihe göre sırala (yeni önce)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  // Kategoriye göre ürünleri grupla
  const getProductsGroupedByCategory = () => {
    // Önce deduplicate mantığını kullan (Kritikalität görünümü ile aynı mantık)
    const { uniqueCritical, uniqueWarning } = getDeduplicatedProducts();
    
    // Tüm ürünleri birleştir ve type'larını ekle
    const allProducts = [
      ...uniqueCritical.map(p => ({ ...p, type: 'critical' })),
      ...uniqueWarning.map(p => ({ ...p, type: 'warning' }))
    ];

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

    // Her kategorideki ürünleri sadece isme göre sırala (sabit kalması için)
    Object.values(grouped).forEach(category => {
      category.products.sort((a, b) => {
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
            {/* Görünüm Modu Switch */}
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
            </div>
            {shouldShowMailButton() && (
              <button
                onClick={handleSendCompletionMail}
                className={`flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap ${
                  !hasMailBeenSentToday() ? 'animate-pulse' : ''
                }`}
              >
                <FiMail className="w-4 h-4" />
                <span>E-Mail senden</span>
              </button>
            )}
            <button
              onClick={() => setSettingsDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
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

      {/* Tabs - Sadece kritiklik modunda göster */}
      {viewMode === 'criticality' && (
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
              <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {getTotalCriticalCount()}
              </span>
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
              <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {getTotalWarningCount()}
              </span>
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
              <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {getTodayActionCount()}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Kategori Modunda - History Tab */}
      {viewMode === 'category' && (
        <div className="mb-4 md:mb-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex gap-2 overflow-x-auto pb-0 -mb-px">
              <button
                onClick={() => setActiveTab(0)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
                  activeTab !== 2
                    ? 'border-green-500 text-green-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <FiGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Kategorien</span>
                <span className="sm:hidden">Kategorien</span>
                <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {getTotalUnprocessedCount()}
                </span>
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
            <div className="flex items-center gap-1.5 px-3 pb-2 md:pb-0 md:mb-px">
              <span className="px-2 py-1 rounded-full text-[10px] md:text-xs font-medium bg-blue-100 text-blue-700">
                {(() => {
                  const allProducts = [...criticalProducts, ...warningProducts];
                  const uniqueProductsMap = {};
                  allProducts.forEach(p => {
                    if (!uniqueProductsMap[p.id]) {
                      uniqueProductsMap[p.id] = p;
                    } else if (p.type === 'critical') {
                      uniqueProductsMap[p.id] = p;
                    }
                  });
                  const uniqueProducts = Object.values(uniqueProductsMap);
                  const total = uniqueProducts.length;
                  const processed = total - uniqueProducts.filter(p => isUnprocessed(p)).length;
                  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
                  return `${processed}/${total} - ${percentage}%`;
                })()}
              </span>
              <span className="px-2 py-1 rounded-full text-[10px] md:text-xs font-medium bg-gray-100 text-gray-700">
                {getTodayActionCount()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KRİTİK ÜRÜNLER TABLOSU */}
      {viewMode === 'criticality' && activeTab === 0 && (() => {
        const { uniqueCritical } = getDeduplicatedProducts();
        return (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-base md:text-lg font-semibold text-red-900 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Produkte am letzten Tag</span>
              </h2>
              {uniqueCritical.length > 0 && (
                <button
                  onClick={() => openBarcodeScanner('critical')}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs md:text-sm font-medium"
                >
                  <FiCamera className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Barcode scannen</span>
                </button>
              )}
            </div>

            {uniqueCritical.length === 0 ? (
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
                  {uniqueCritical.map((product) => (
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
                                onClick={() => setDateUpdateDialog({ open: true, product })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                Datum Eingeben
                              </button>
                            </>
                          ) : (
                            <>
                              {product.lastAction?.actionType === 'removed' && !product.lastAction?.isUndone && product.lastAction?.excludedFromCheck === false ? (
                                <>
                                  {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                                    <button
                                      onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name, actionType: product.lastAction.actionType })}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Rückgängig machen"
                                    >
                                      <FiRotateCcw className="w-4 h-4" />
                                    </button>
                                  )}
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-sm cursor-default">
                                    <FiTrash2 className="w-4 h-4" />
                                    Aussortiert!
                                  </span>
                                  <button
                                    onClick={() => setDateUpdateDialog({ open: true, product })}
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
                                  <button
                                    onClick={() => setRemoveDialog({ open: true, product })}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                    Aussortieren
                                  </button>
                                  <button
                                    onClick={() => handleDeactivateCriticalProduct(product.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-42sm"
                                  >
                                    Deaktivieren
                                  </button>
                                </>
                              )}
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
              {uniqueCritical.map((product) => (
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">MHD:</span>
                      <span className="text-sm text-gray-900">{formatDate(product.expiryDate)}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {product.daysUntilExpiry} Tage
                      </span>
                    </div>
                  </div>

                  {product.excludeFromExpiryCheck === true ? (
                    <div className="flex flex-row flex-wrap gap-2">
                      {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                        <button
                          onClick={() => handleUndoAction(product.lastAction.id)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                          title="Rückgängig machen"
                        >
                          <FiRotateCcw className="w-3 h-3" />
                          <span className="hidden sm:inline">Rückgängig</span>
                        </button>
                      )}
                      <button
                        onClick={() => setDateUpdateDialog({ open: true, product })}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Datum Eingeben
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-row flex-wrap gap-2">
                      {product.lastAction?.actionType === 'removed' && !product.lastAction?.isUndone && product.lastAction?.excludedFromCheck === false ? (
                        <>
                          {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                            <button
                              onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name, actionType: product.lastAction.actionType })}
                              className="flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                              title="Rückgängig machen"
                            >
                              <FiRotateCcw className="w-3 h-3" />
                              <span className="hidden sm:inline">Rückgängig</span>
                            </button>
                          )}
                          <span className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-medium">
                            <FiTrash2 className="w-3 h-3" />
                            Aussortiert!
                          </span>
                          <button
                            onClick={() => setDateUpdateDialog({ open: true, product })}
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
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
            )}
          </div>
        </>
        );
      })()}

      {/* UYARI ÜRÜNLERİ TABLOSU */}
      {viewMode === 'criticality' && activeTab === 1 && (() => {
        const { uniqueWarning } = getDeduplicatedProducts();
        return (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-base md:text-lg font-semibold text-amber-900 flex items-center gap-2">
                <FiAlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Rabattetikett sollte angebracht werden</span>
              </h2>
              {uniqueWarning.length > 0 && (
                <button
                  onClick={() => openBarcodeScanner('warning')}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-xs md:text-sm font-medium"
                >
                  <FiCamera className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Barcode scannen</span>
                </button>
              )}
            </div>

            {uniqueWarning.length === 0 ? (
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
                  {uniqueWarning.map((product) => (
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
                                  onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name, actionType: product.lastAction.actionType })}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Rückgängig machen"
                                >
                                  <FiRotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm cursor-default">
                                <FiTag className="w-4 h-4" />
                                Reduziert!
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
                                  onClick={() => handleLabelProduct(product.id, product.name)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                                >
                                  <FiTag className="w-4 h-4" />
                                  Reduzieren
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
              {uniqueWarning.map((product) => (
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">MHD:</span>
                      <span className="text-sm text-gray-900">{formatDate(product.expiryDate)}</span>
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
                            onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name, actionType: product.lastAction.actionType })}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                            title="Rückgängig machen"
                          >
                            <FiRotateCcw className="w-3 h-3" />
                            <span className="hidden sm:inline">Rückgängig machen</span>
                          </button>
                        )}
                        <span className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-medium">
                          <FiTag className="w-3 h-3" />
                          Reduziert!
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
                            className="flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-[10px] font-medium whitespace-nowrap"
                            title="Rückgängig machen"
                          >
                            <FiRotateCcw className="w-2.5 h-2.5" />
                            <span className="hidden sm:inline">Rückgängig</span>
                          </button>
                        )}
                        {!product.excludeFromExpiryCheck && (
                          <button
                            onClick={() => handleLabelProduct(product.id, product.name)}
                            className="flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors text-[10px] font-medium whitespace-nowrap"
                          >
                            <FiTag className="w-2.5 h-2.5" />
                            Reduzieren
                          </button>
                        )}
                        {!product.excludeFromExpiryCheck && (
                          <button
                            onClick={() => handleDeactivateWarningProduct(product.id)}
                            className="flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-[10px] font-medium whitespace-nowrap"
                          >
                            Deaktivieren
                          </button>
                        )}
                        <button
                          onClick={() => setWarningDateUpdateDialog({ open: true, product })}
                          className="flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[10px] font-medium whitespace-nowrap"
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
        );
      })()}

      {/* KATEGORİ GÖRÜNÜMÜ */}
      {viewMode === 'category' && activeTab !== 2 && (
        <div className="space-y-6">
          {getProductsGroupedByCategory().map((categoryGroup) => {
            const hasProducts = categoryGroup.products.length > 0;
            if (!hasProducts) return null;

            const totalCount = categoryGroup.products.length;
            const unprocessedCount = categoryGroup.products.filter(p => isUnprocessed(p)).length;
            const processedCount = totalCount - unprocessedCount;
            const percentage = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
            const criticalCount = categoryGroup.products.filter(p => p.type === 'critical' && isUnprocessed(p)).length;
            const warningCount = categoryGroup.products.filter(p => p.type === 'warning' && isUnprocessed(p)).length;

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
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {processedCount}/{totalCount} - {percentage}%
                      </span>
                      {criticalCount > 0 && (
                        <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {criticalCount} kritisch
                        </span>
                      )}
                      {warningCount > 0 && (
                        <span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          {warningCount} Warnung
                        </span>
                      )}
                    </div>
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
                            {categoryGroup.products.map((product) => {
                              const isProductUnprocessed = isUnprocessed(product);
                              // Soluk göster: işlem yapılmış ama deaktif edilmemiş ürünler
                              const shouldShowDimmed = !isProductUnprocessed && product.excludeFromExpiryCheck !== true;
                              const badgeClass = product.type === 'critical' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-amber-100 text-amber-800';
                              const rowClass = product.type === 'critical'
                                ? 'hover:bg-red-50'
                                : 'hover:bg-amber-50';
                              
                              return (
                                <tr key={product.id} className={`${rowClass} transition-colors ${shouldShowDimmed ? 'opacity-60' : ''}`}>
                                  <td className="px-4 py-4" style={{ width: '500px' }} >
                                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                    {product.barcode && (
                                      <div className="mt-1 text-xs text-gray-400 font-mono">{product.barcode}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-sm text-gray-900">{formatDate(product.expiryDate)}</div>
                                    <div className="mt-1">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                                        {product.daysUntilExpiry} Tage
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                      {product.excludeFromExpiryCheck === true ? (
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
                                            onClick={() => setDateUpdateDialog({ open: true, product })}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                          >
                                            Datum Eingeben
                                          </button>
                                        </>
                                      ) : product.type === 'critical' ? (
                                        <>
                                          {product.lastAction?.actionType === 'removed' && !product.lastAction?.isUndone && product.lastAction?.excludedFromCheck === false ? (
                                            <>
                                              {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                                                <button
                                                  onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name, actionType: product.lastAction.actionType })}
                                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                  title="Rückgängig machen"
                                                >
                                                  <FiRotateCcw className="w-4 h-4" />
                                                </button>
                                              )}
                                              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-sm cursor-default">
                                                <FiTrash2 className="w-4 h-4" />
                                                Aussortiert!
                                              </span>
                                              <button
                                                onClick={() => setDateUpdateDialog({ open: true, product })}
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
                                              <button
                                                onClick={() => setRemoveDialog({ open: true, product })}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                              >
                                                <FiTrash2 className="w-4 h-4" />
                                                Aussortieren
                                              </button>
                                              <button
                                                onClick={() => handleDeactivateCriticalProduct(product.id)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                              >
                                                Deaktivieren
                                              </button>
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          {product.excludeFromExpiryCheck && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                              Deaktiviert
                                            </span>
                                          )}
                                          {product.lastAction?.actionType === 'labeled' && !product.lastAction?.isUndone ? (
                                            <>
                                              {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                                                <button
                                                  onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name, actionType: product.lastAction.actionType })}
                                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                  title="Rückgängig machen"
                                                >
                                                  <FiRotateCcw className="w-4 h-4" />
                                                </button>
                                              )}
                                              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm cursor-default">
                                                <FiTag className="w-4 h-4" />
                                                Reduziert!
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
                                                <>
                                                  <button
                                                    onClick={() => handleLabelProduct(product.id, product.name)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                                                  >
                                                    <FiTag className="w-4 h-4" />
                                                    Reduzieren
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeactivateWarningProduct(product.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                                  >
                                                    Deaktivieren
                                                  </button>
                                                </>
                                              )}
                                              <button
                                                onClick={() => setWarningDateUpdateDialog({ open: true, product })}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                              >
                                                Neues Datum
                                              </button>
                                            </>
                                          )}
                                        </>
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
                          const isProductUnprocessed = isUnprocessed(product);
                          // Soluk göster: işlem yapılmış ama deaktif edilmemiş ürünler
                          const shouldShowDimmed = !isProductUnprocessed && product.excludeFromExpiryCheck !== true;
                          const badgeClass = product.type === 'critical' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-amber-100 text-amber-800';
                          const cardClass = product.type === 'critical'
                            ? 'hover:bg-red-50'
                            : 'hover:bg-amber-50';
                          
                          return (
                            <div key={product.id} className={`p-4 ${cardClass} transition-colors ${shouldShowDimmed ? 'opacity-60' : ''}`}>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900 text-sm mb-1">{product.name}</h3>
                                  {product.barcode && (
                                    <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>
                                  )}
                                </div>
                              </div>
                              <div className="mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-gray-500">MHD:</span>
                                  <span className="text-sm text-gray-900">{formatDate(product.expiryDate)}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                                    {product.daysUntilExpiry} Tage
                                  </span>
                                </div>
                              </div>
                              {product.excludeFromExpiryCheck === true ? (
                                <div className="flex flex-row flex-wrap gap-2">
                                  {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                                    <button
                                      onClick={() => handleUndoAction(product.lastAction.id)}
                                      className="flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                                      title="Rückgängig machen"
                                    >
                                      <FiRotateCcw className="w-3 h-3" />
                                      <span className="hidden sm:inline">Rückgängig</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setDateUpdateDialog({ open: true, product })}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                  >
                                    Datum Eingeben
                                  </button>
                                </div>
                              ) : product.type === 'critical' ? (
                                <div className="flex flex-row flex-wrap gap-2">
                                  {product.lastAction?.actionType === 'removed' && !product.lastAction?.isUndone && product.lastAction?.excludedFromCheck === false ? (
                                    <>
                                      {product.lastAction && product.lastAction.id && !product.lastAction.isUndone && product.lastAction.actionType !== 'undone' && (
                                        <button
                                          onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name, actionType: product.lastAction.actionType })}
                                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                                        >
                                          <FiRotateCcw className="w-3 h-3" />
                                          <span className="hidden sm:inline">Rückgängig</span>
                                        </button>
                                      )}
                                      <span className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-medium">
                                        <FiTrash2 className="w-3 h-3" />
                                        Aussortiert!
                                      </span>
                                      <button
                                        onClick={() => setDateUpdateDialog({ open: true, product })}
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
                                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
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
                                    </>
                                  )}
                                </div>
                              ) : (
                                <>
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
                                            onClick={() => setUndoDialog({ open: true, actionId: product.lastAction.id, productName: product.name, actionType: product.lastAction.actionType })}
                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                                          >
                                            <FiRotateCcw className="w-3 h-3" />
                                            <span className="hidden sm:inline">Rückgängig machen</span>
                                          </button>
                                        )}
                                        <span className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-medium">
                                          <FiTag className="w-3 h-3" />
                                          Reduziert!
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
                                            className="flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-[10px] font-medium whitespace-nowrap"
                                          >
                                            <FiRotateCcw className="w-2.5 h-2.5" />
                                            <span className="hidden sm:inline">Rückgängig</span>
                                          </button>
                                        )}
                                        {!product.excludeFromExpiryCheck && (
                                          <>
                                            <button
                                              onClick={() => handleLabelProduct(product.id, product.name)}
                                              className="flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors text-[10px] font-medium whitespace-nowrap"
                                            >
                                              <FiTag className="w-2.5 h-2.5" />
                                              Reduzieren
                                            </button>
                                            <button
                                              onClick={() => handleDeactivateWarningProduct(product.id)}
                                              className="flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-[10px] font-medium whitespace-nowrap"
                                            >
                                              Deaktivieren
                                            </button>
                                          </>
                                        )}
                                        <button
                                          onClick={() => setWarningDateUpdateDialog({ open: true, product })}
                                          className="flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[10px] font-medium whitespace-nowrap"
                                        >
                                          Neues Datum
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
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
              message="Es gibt keine Produkte auf kritischer oder Warnstufe."
            />
          )}
        </div>
      )}

      {/* İŞLEM GEÇMİŞİ */}
      {activeTab === 2 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiClock className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Vorgangsverlauf</span>
              </h2>
              
              {/* Tarih Filtresi */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousDay}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Vorheriger Tag"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="relative">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    dateFormat="dd.MM.yyyy"
                    maxDate={new Date()}
                    locale={de}
                    className="w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    wrapperClassName="w-auto"
                    popperClassName="!z-[9999]"
                    popperPlacement="bottom-end"
                  />
                </div>
                
                <button
                  onClick={goToNextDay}
                  disabled={isToday()}
                  className={`p-2 rounded-lg transition-colors ${
                    isToday() 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Nächster Tag"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
                
                {!isToday() && (
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    title="Heute"
                  >
                    Heute
                  </button>
                )}
              </div>
            </div>
          </div>

          {getFilteredHistory().length === 0 ? (
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
                  {getFilteredHistory().map((action) => (
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeBadgeClass(action.actionType, action)}`}>
                          {getActionTypeLabel(action.actionType, action)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {action.admin?.firstName || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {cleanNote(action.note) || '-'}
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
              {getFilteredHistory().map((action) => (
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${getActionTypeBadgeClass(action.actionType, action)}`}>
                      {getActionTypeLabel(action.actionType, action)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">MHD:</span>
                      <span className="ml-1 text-gray-900">{formatDate(action.expiryDate)}</span>
                      <span className="ml-2 text-gray-600">({action.daysUntilExpiry} Tage)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Datum:</span>
                        <span className="text-gray-900">{formatDate(action.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Admin:</span>
                        <span className="text-gray-900">{action.admin?.firstName || '-'}</span>
                      </div>
                    </div>
                    {cleanNote(action.note) && (
                      <div className="pt-1">
                        <span className="text-gray-500">Notiz:</span>
                        <p className="text-gray-900 mt-0.5">{cleanNote(action.note)}</p>
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
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
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

      {/* UNDO DİALOGU */}
      <AnimatePresence>
        {undoDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUndoDialog({ open: false, actionId: null, productName: '', actionType: null })}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Vorgang rückgängig machen</h3>
                  <button
                    onClick={() => setUndoDialog({ open: false, actionId: null, productName: '', actionType: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-gray-700">
                    Möchten Sie die "{undoDialog.actionType === 'removed' ? 'Aussortiert!' : 'Reduziert!'}"-Markierung für das Produkt <strong>{undoDialog.productName}</strong> wirklich rückgängig machen?
                  </p>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => setUndoDialog({ open: false, actionId: null, productName: '', actionType: null })}
                    className="px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => {
                      handleUndoAction(undoDialog.actionId);
                      setUndoDialog({ open: false, actionId: null, productName: '' });
                    }}
                    className="px-4 py-2 text-xs md:text-sm text-white rounded-lg transition-colors"
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
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
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
                      inputMode="numeric"
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
                      inputMode="numeric"
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
                    className="px-4 py-2 text-xs md:text-sm text-white rounded-lg transition-colors"
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
                    Speichern
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MAIL YENİDEN GÖNDERME DİALOGU */}
      <AnimatePresence>
        {mailResendDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMailResendDialog(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">E-Mail erneut senden</h3>
                  <button
                    onClick={() => setMailResendDialog(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-gray-700">
                    Heute wurde bereits eine E-Mail gesendet. Möchten Sie trotzdem erneut senden?
                  </p>
                </div>
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 md:gap-3">
                  <button
                    onClick={() => setMailResendDialog(false)}
                    className="px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => sendMail()}
                    className="px-4 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Erneut senden
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
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
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
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
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

