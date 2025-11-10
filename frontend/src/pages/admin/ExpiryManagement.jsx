import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiAlertCircle, FiTag, FiTrash2, FiRotateCcw, FiClock, FiSettings, FiX, FiCamera } from 'react-icons/fi';
import { toast } from 'react-toastify';
import axios from 'axios';
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
  const [activeTab, setActiveTab] = useState(0);

  // Dialog states
  const [removeDialog, setRemoveDialog] = useState({ open: false, product: null });
  const [labelDialog, setLabelDialog] = useState({ open: false, product: null });
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState(null); // 'critical' veya 'warning'

  // Form states
  const [excludeFromCheck, setExcludeFromCheck] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleRemoveProduct = async (excludeFromExpiryCheck = false) => {
    if (!removeDialog.product) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/remove/${removeDialog.product.id}`,
        { excludeFromCheck: excludeFromExpiryCheck, note },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Produkt erfolgreich entfernt');
      setRemoveDialog({ open: false, product: null });
      setExcludeFromCheck(false);
      setNote('');
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
        : err.response?.data?.error?.message || err.message || 'İşlem sırasında hata oluştu';
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
        // Kritik ürünü kaldır
        await handleRemoveProductByBarcode(product, false);
        // İşlem başarılı olduğunda popup'ı kapat
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
        { excludeFromCheck: excludeFromExpiryCheck, note: 'Durch Barcode-Scan entfernt' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`${product.name} erfolgreich entfernt`);
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'İşlem sırasında hata oluştu';
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

  if (loading && criticalProducts.length === 0 && warningProducts.length === 0) {
    return <Loading />;
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Verwaltung des Mindesthaltbarkeitsdatums (MHD)
            </h1>
          </div>
          <button
            onClick={() => setSettingsDialog(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
          >
            <FiSettings className="w-4 h-4" />
            <span>Einstellungen</span>
          </button>
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
        <div className="flex gap-2 overflow-x-auto pb-2 -mb-px">
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
            {criticalProducts.length > 0 && (
              <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {criticalProducts.length}
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
            {warningProducts.length > 0 && (
              <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 1 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {warningProducts.length}
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
                      Barcode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kategorie
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      MHD
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Verbleibende Tage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Lagerbestand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Letzte Aktion
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {criticalProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-red-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.barcode || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.category?.name || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(product.expiryDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {product.daysUntilExpiry} Tage
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.stock}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {product.lastAction ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeBadgeClass(product.lastAction.actionType)}`}>
                            {getActionTypeLabel(product.lastAction.actionType)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setRemoveDialog({ open: true, product })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          Entfernt
                        </button>
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
                        <p className="text-xs text-gray-500 mb-1">{product.category.name}</p>
                      )}
                      {product.barcode && (
                        <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2 whitespace-nowrap">
                      {product.daysUntilExpiry} Tage
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">MHD:</span>
                      <span className="ml-1 text-gray-900">{formatDate(product.expiryDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Lagerbestand:</span>
                      <span className="ml-1 text-gray-900">{product.stock}</span>
                    </div>
                  </div>

                  {product.lastAction && (
                    <div className="mb-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionTypeBadgeClass(product.lastAction.actionType)}`}>
                        {getActionTypeLabel(product.lastAction.actionType)}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setRemoveDialog({ open: true, product })}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Entfernt
                  </button>
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
                      Barcode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kategorie
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      MHD
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Verbleibende Tage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Lagerbestand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Letzte Aktion
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {warningProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-amber-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.barcode || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.category?.name || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(product.expiryDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          {product.daysUntilExpiry} Tage
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.stock}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {product.lastAction ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeBadgeClass(product.lastAction.actionType)}`}>
                            {getActionTypeLabel(product.lastAction.actionType)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setLabelDialog({ open: true, product })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                        >
                          <FiTag className="w-4 h-4" />
                          Etikettiert
                        </button>
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
                        <p className="text-xs text-gray-500 mb-1">{product.category.name}</p>
                      )}
                      {product.barcode && (
                        <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ml-2 whitespace-nowrap">
                      {product.daysUntilExpiry} Tage
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">MHD:</span>
                      <span className="ml-1 text-gray-900">{formatDate(product.expiryDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Lagerbestand:</span>
                      <span className="ml-1 text-gray-900">{product.stock}</span>
                    </div>
                  </div>

                  {product.lastAction && (
                    <div className="mb-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionTypeBadgeClass(product.lastAction.actionType)}`}>
                        {getActionTypeLabel(product.lastAction.actionType)}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setLabelDialog({ open: true, product })}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                  >
                    <FiTag className="w-4 h-4" />
                    Etikettiert
                  </button>
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
                      Datum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Vorgang
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      MHD
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Verbleibende Tage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Notiz
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
                  {history.map((action) => (
                    <tr key={action.id} className={`hover:bg-gray-50 transition-colors ${action.isUndone ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(action.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeBadgeClass(action.actionType)}`}>
                          {getActionTypeLabel(action.actionType)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {action.product?.name || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(action.expiryDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {action.daysUntilExpiry} Tage
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {action.admin?.firstName || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {action.note || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {action.isUndone ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Rückgängig gemacht
                          </span>
                        ) : action.excludedFromCheck ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            MHD-Befreiung
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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
                      <p className="text-xs text-gray-500">{formatDate(action.createdAt)}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${getActionTypeBadgeClass(action.actionType)}`}>
                      {getActionTypeLabel(action.actionType)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">MHD:</span>
                      <span className="text-gray-900">{formatDate(action.expiryDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Verbleibende Tage:</span>
                      <span className="text-gray-900">{action.daysUntilExpiry} Tage</span>
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

                  <div className="flex items-center justify-between">
                    <div>
                      {action.isUndone ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Rückgängig gemacht
                        </span>
                      ) : action.excludedFromCheck ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          MHD-Befreiung
                        </span>
                      ) : null}
                    </div>
                    {!action.isUndone && action.actionType !== 'undone' && (
                      <button
                        onClick={() => handleUndoAction(action.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Rückgängig machen"
                      >
                        <FiRotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
                  <h3 className="text-sm md:text-base font-semibold text-gray-900">Produkt entfernen</h3>
                  <button
                    onClick={() => setRemoveDialog({ open: false, product: null })}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs md:text-sm text-gray-700">
                    Möchten Sie das Produkt <strong>{removeDialog.product?.name}</strong> wirklich entfernen?
                  </p>
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
                    onClick={() => setRemoveDialog({ open: false, product: null })}
                    className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => handleRemoveProduct(false)}
                    className="px-3 py-2 text-xs md:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    Entfernt
                  </button>
                  <button
                    onClick={() => handleRemoveProduct(true)}
                    className="px-3 py-2 text-xs md:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    Entfernt und befreit
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
    </div>
  );
}

export default ExpiryManagement;
