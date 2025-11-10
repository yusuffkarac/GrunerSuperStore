import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiAlertCircle, FiTag, FiTrash2, FiRotateCcw, FiClock, FiSettings, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import axios from 'axios';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';

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
      let errorMessage = 'Veriler yüklenirken hata oluştu';
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

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/admin/expiry/remove/${removeDialog.product.id}`,
        { excludeFromCheck, note },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Ürün başarıyla raftan kaldırıldı');
      setRemoveDialog({ open: false, product: null });
      setExcludeFromCheck(false);
      setNote('');
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'İşlem sırasında hata oluştu';
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

      toast.success('Ürün başarıyla etiketlendi');
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

      toast.success('İşlem başarıyla geri alındı');
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Geri alma sırasında hata oluştu';
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

      toast.success('Ayarlar başarıyla güncellendi');
      setSettingsDialog(false);
      fetchData();
    } catch (err) {
      const errorMessage = typeof err.response?.data?.error === 'string' 
        ? err.response.data.error 
        : err.response?.data?.error?.message || err.message || 'Ayarlar güncellenirken hata oluştu';
      toast.error(errorMessage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getActionTypeLabel = (type) => {
    const types = {
      labeled: 'Etiketlendi',
      removed: 'Kaldırıldı',
      undone: 'Geri Alındı',
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
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">
            Son Kullanma Tarihi (SKT) Yönetimi
          </h1>
          <p className="text-gray-600 mt-0.5 md:mt-1 text-xs md:text-base">
            Kritik ve uyarı seviyesindeki ürünleri yönetin
          </p>
        </div>
        <button
          onClick={() => setSettingsDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
        >
          <FiSettings className="w-4 h-4" />
          <span>Ayarlar</span>
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <FiX size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border-b border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab(0)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 0
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FiAlertCircle className="w-4 h-4" />
            Kritik Ürünler ({criticalProducts.length})
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 1
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FiAlertTriangle className="w-4 h-4" />
            Uyarı Ürünleri ({warningProducts.length})
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 2
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FiClock className="w-4 h-4" />
            İşlem Geçmişi
          </button>
        </div>
      </div>

      {/* KRİTİK ÜRÜNLER TABLOSU */}
      {activeTab === 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border-l-4 border-red-600">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200">
            <h2 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <FiAlertCircle className="w-5 h-5" />
              Son Günü Gelen Ürünler (Raftan Kaldırılmalı)
            </h2>
          </div>

          {criticalProducts.length === 0 ? (
            <EmptyState
              icon={FiAlertCircle}
              title="Kritik seviyede ürün bulunmuyor"
              message="Son günü gelen ürün bulunmuyor."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Ürün Adı
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Barkod
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      SKT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kalan Gün
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Stok
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Son İşlem
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      İşlemler
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
                          {product.daysUntilExpiry} gün
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
                          Kaldırdım
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* UYARI ÜRÜNLERİ TABLOSU */}
      {activeTab === 1 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border-l-4 border-amber-500">
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
            <h2 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
              <FiAlertTriangle className="w-5 h-5" />
              İndirim Etiketi Yapıştırılmalı
            </h2>
          </div>

          {warningProducts.length === 0 ? (
            <EmptyState
              icon={FiAlertTriangle}
              title="Uyarı seviyesinde ürün bulunmuyor"
              message="Etiket yapıştırılması gereken ürün bulunmuyor."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Ürün Adı
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Barkod
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      SKT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kalan Gün
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Stok
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Son İşlem
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      İşlemler
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
                          {product.daysUntilExpiry} gün
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
                          Etiketledim
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* İŞLEM GEÇMİŞİ */}
      {activeTab === 2 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiClock className="w-5 h-5" />
              İşlem Geçmişi
            </h2>
          </div>

          {history.length === 0 ? (
            <EmptyState
              icon={FiClock}
              title="Henüz işlem kaydı bulunmuyor"
              message="SKT yönetimi işlemleri burada görüntülenecek."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      İşlem
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      SKT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kalan Gün
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Not
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      İşlemler
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
                        {action.daysUntilExpiry} gün
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
                            Geri Alındı
                          </span>
                        ) : action.excludedFromCheck ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            SKT Muaf
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
                            title="Geri Al"
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
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Ürünü Raftan Kaldır</h3>
                  <button
                    onClick={() => setRemoveDialog({ open: false, product: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <p className="text-gray-700">
                    <strong>{removeDialog.product?.name}</strong> ürününü raftan kaldırdığınızı onaylıyor musunuz?
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excludeFromCheck}
                      onChange={(e) => setExcludeFromCheck(e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      Bu ürünü SKT kontrollerinden muaf tut (deaktif et)
                    </span>
                  </label>
                  <textarea
                    placeholder="Not (İsteğe bağlı)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setRemoveDialog({ open: false, product: null })}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleRemoveProduct}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Kaldırdım
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
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Ürünü Etiketle</h3>
                  <button
                    onClick={() => setLabelDialog({ open: false, product: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <p className="text-gray-700">
                    <strong>{labelDialog.product?.name}</strong> ürününe indirim etiketi yapıştırdığınızı onaylıyor musunuz?
                  </p>
                  <textarea
                    placeholder="Not (İsteğe bağlı)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setLabelDialog({ open: false, product: null })}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleLabelProduct}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Etiketledim
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
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">SKT Yönetim Ayarları</h3>
                  <button
                    onClick={() => setSettingsDialog(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Turuncu Uyarı (Kaç gün kala etiket yapıştırılsın?)
                    </label>
                    <input
                      type="number"
                      value={settings.warningDays}
                      onChange={(e) => setSettings({ ...settings, warningDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kırmızı Kritik (Kaç gün kala raftan kaldırılsın?)
                    </label>
                    <input
                      type="number"
                      value={settings.criticalDays}
                      onChange={(e) => setSettings({ ...settings, criticalDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">SKT Yönetimi Aktif</span>
                  </label>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setSettingsDialog(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleUpdateSettings}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Kaydet
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
