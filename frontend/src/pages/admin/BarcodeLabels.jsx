import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiPrinter, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { toast } from 'react-toastify';
import barcodeLabelService from '../../services/barcodeLabelService';
import { useAlert } from '../../contexts/AlertContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';

function BarcodeLabels() {
  const { showConfirm } = useAlert();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabels, setSelectedLabels] = useState([]); // Toplu baskı için seçilenler

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    unit: '',
    barcode: '',
  });

  // Verileri yükle
  useEffect(() => {
    loadLabels();
  }, [searchQuery]);

  const loadLabels = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;

      const response = await barcodeLabelService.getAllBarcodeLabels(params);
      setLabels(response.data.labels || []);
    } catch (error) {
      toast.error('Barkod etiketleri yüklenemedi');
      console.error('Etiket yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Modal aç/kapat
  const openModal = (label = null) => {
    if (label) {
      setEditingLabel(label);
      setFormData({
        name: label.name || '',
        price: label.price || '',
        unit: label.unit || '',
        barcode: label.barcode || '',
      });
    } else {
      setEditingLabel(null);
      setFormData({
        name: '',
        price: '',
        unit: '',
        barcode: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLabel(null);
  };

  // Form değişikliklerini handle et
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasyon
    if (!formData.name.trim()) {
      toast.error('Ürün adı gereklidir');
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      toast.error('Geçerli bir fiyat giriniz');
      return;
    }
    if (!formData.barcode.trim()) {
      toast.error('Barkod numarası gereklidir');
      return;
    }

    try {
      const data = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        unit: formData.unit.trim() || null,
        barcode: formData.barcode.trim(),
      };

      if (editingLabel) {
        await barcodeLabelService.updateBarcodeLabel(editingLabel.id, data);
        toast.success('Barkod etiketi güncellendi');
      } else {
        await barcodeLabelService.createBarcodeLabel(data);
        toast.success('Barkod etiketi oluşturuldu');
      }

      loadLabels();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bir hata oluştu');
      console.error('Form submit hatası:', error);
    }
  };

  // Etiket silme
  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Etiket Sil',
      message: 'Bu barkod etiketini silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      type: 'danger',
    });

    if (confirmed) {
      try {
        await barcodeLabelService.deleteBarcodeLabel(id);
        toast.success('Barkod etiketi silindi');
        loadLabels();
      } catch (error) {
        toast.error('Silme işlemi başarısız');
        console.error('Silme hatası:', error);
      }
    }
  };

  // Seçim işlemleri
  const toggleSelectLabel = (labelId) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLabels.length === labels.length) {
      setSelectedLabels([]);
    } else {
      setSelectedLabels(labels.map((label) => label.id));
    }
  };

  // Toplu baskı
  const handlePrint = () => {
    if (selectedLabels.length === 0) {
      toast.warning('Lütfen yazdırmak için etiket seçiniz');
      return;
    }

    // Print sayfasına yönlendir
    const selectedIds = selectedLabels.join(',');
    window.open(`/admin/barcode-labels/print?ids=${selectedIds}`, '_blank');
  };

  // Toplu silme
  const handleBulkDelete = async () => {
    if (selectedLabels.length === 0) {
      toast.warning('Lütfen silmek için etiket seçiniz');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Toplu Silme',
      message: `${selectedLabels.length} adet barkod etiketini silmek istediğinizden emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      type: 'danger',
    });

    if (confirmed) {
      try {
        await barcodeLabelService.bulkDeleteBarcodeLabels(selectedLabels);
        toast.success('Barkod etiketleri silindi');
        setSelectedLabels([]);
        loadLabels();
      } catch (error) {
        toast.error('Silme işlemi başarısız');
        console.error('Toplu silme hatası:', error);
      }
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Barkod Etiketleri</h1>
        <p className="text-gray-600 mt-1">Ürün etiketlerinizi yönetin ve yazdırın</p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* Arama */}
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Ürün adı veya barkod ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex gap-2">
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <FiPlus />
            Yeni Etiket
          </button>

          {selectedLabels.length > 0 && (
            <>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiPrinter />
                Yazdır ({selectedLabels.length})
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <FiTrash2 />
                Sil ({selectedLabels.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Etiket Listesi */}
      {labels.length === 0 ? (
        <EmptyState
          title="Henüz barkod etiketi yok"
          description="Yeni bir barkod etiketi oluşturarak başlayın"
          actionLabel="Yeni Etiket"
          onAction={() => openModal()}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {selectedLabels.length === labels.length ? (
                      <FiCheckSquare className="w-5 h-5" />
                    ) : (
                      <FiSquare className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ürün Adı</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fiyat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Birim</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Barkod</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {labels.map((label) => (
                <motion.tr
                  key={label.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleSelectLabel(label.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {selectedLabels.includes(label.id) ? (
                        <FiCheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <FiSquare className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{label.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">€{parseFloat(label.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{label.unit || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{label.barcode}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(label)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => handleDelete(label.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingLabel ? 'Etiket Düzenle' : 'Yeni Etiket'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Ürün Adı */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ürün Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Ürün adını girin"
                      required
                    />
                  </div>

                  {/* Fiyat */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fiyat (€) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  {/* Birim */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Birim Tipi (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="örn: kg, adet, litre"
                    />
                  </div>

                  {/* Barkod */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barkod Numarası <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                      placeholder="8574673"
                      required
                    />
                  </div>

                  {/* Butonlar */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      {editingLabel ? 'Güncelle' : 'Oluştur'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BarcodeLabels;
