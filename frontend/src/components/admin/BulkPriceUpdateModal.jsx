import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiTrendingUp, FiPercent, FiDollarSign } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import categoryService from '../../services/categoryService';

function BulkPriceUpdateModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    type: 'all', // 'all' | 'category' | 'products'
    categoryId: '',
    adjustmentType: 'percentage', // 'percentage' | 'fixed'
    adjustmentValue: '',
    includeVariants: true,
    updateType: 'permanent', // 'permanent' | 'temporary'
    temporaryPriceEndDate: '',
  });

  // Kategorileri yükle
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasyon
    if (!formData.adjustmentValue || parseFloat(formData.adjustmentValue) === 0) {
      toast.error('Bitte geben Sie einen Anpassungswert ein');
      return;
    }

    if (formData.type === 'category' && !formData.categoryId) {
      toast.error('Bitte wählen Sie eine Kategorie aus');
      return;
    }

    if (formData.updateType === 'temporary' && !formData.temporaryPriceEndDate) {
      toast.error('Bitte geben Sie ein Enddatum für die temporäre Preisaktualisierung ein');
      return;
    }

    if (formData.updateType === 'temporary') {
      const endDate = new Date(formData.temporaryPriceEndDate);
      const now = new Date();
      if (endDate <= now) {
        toast.error('Das Enddatum muss in der Zukunft liegen');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        type: formData.type,
        adjustmentType: formData.adjustmentType,
        adjustmentValue: parseFloat(formData.adjustmentValue),
        includeVariants: formData.includeVariants,
        updateType: formData.updateType,
      };

      if (formData.type === 'category') {
        payload.categoryId = formData.categoryId;
      }

      if (formData.updateType === 'temporary') {
        payload.temporaryPriceEndDate = formData.temporaryPriceEndDate;
      }

      const response = await adminService.bulkUpdatePrices(payload);

      toast.success(response.message || 'Preise erfolgreich aktualisiert');

      // Başarılı mesaj detayı
      if (response.data) {
        const { products, variants, totalUpdated } = response.data;
        toast.info(
          `${products.updatedCount} Produkt(e) und ${variants.updatedCount} Variante(n) aktualisiert (Gesamt: ${totalUpdated})`,
          { autoClose: 5000 }
        );
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Toplu fiyat güncelleme hatası:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren der Preise');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'all',
      categoryId: '',
      adjustmentType: 'percentage',
      adjustmentValue: '',
      includeVariants: true,
      updateType: 'permanent',
      temporaryPriceEndDate: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black bg-opacity-50"
        />

        {/* Modal */}
        <div className="flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiTrendingUp className="text-green-600" />
                Preise massenweise aktualisieren
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Kapsam */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anwendungsbereich
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">Alle Produkte</option>
                  <option value="category">Spezifische Kategorie</option>
                </select>
              </div>

              {/* Kategori seçimi */}
              {formData.type === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategorie auswählen
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Kategorie wählen...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Artış türü */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anpassungstyp
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, adjustmentType: 'percentage' })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.adjustmentType === 'percentage'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-green-300'
                    }`}
                  >
                    <FiPercent className={`mx-auto mb-2 ${
                      formData.adjustmentType === 'percentage' ? 'text-green-600' : 'text-gray-400'
                    }`} size={24} />
                    <div className="text-sm font-medium">Prozentsatz</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, adjustmentType: 'fixed' })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.adjustmentType === 'fixed'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-green-300'
                    }`}
                  >
                    <FiDollarSign className={`mx-auto mb-2 ${
                      formData.adjustmentType === 'fixed' ? 'text-green-600' : 'text-gray-400'
                    }`} size={24} />
                    <div className="text-sm font-medium">Fester Betrag</div>
                  </button>
                </div>
              </div>

              {/* Artış miktarı */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.adjustmentType === 'percentage' ? 'Prozentsatz (%)' : 'Betrag (€)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.adjustmentValue}
                    onChange={(e) => setFormData({ ...formData, adjustmentValue: e.target.value })}
                    placeholder={formData.adjustmentType === 'percentage' ? 'z.B. 10 (für +10%)' : 'z.B. 2.50 (für +2,50€)'}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    {formData.adjustmentType === 'percentage' ? '%' : '€'}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.adjustmentType === 'percentage'
                    ? 'Positive Werte erhöhen, negative Werte senken die Preise'
                    : 'Positive Werte erhöhen, negative Werte senken die Preise'}
                </p>
              </div>

              {/* Varyantları dahil et */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeVariants"
                  checked={formData.includeVariants}
                  onChange={(e) => setFormData({ ...formData, includeVariants: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  disabled={formData.updateType === 'temporary'}
                />
                <label htmlFor="includeVariants" className="text-sm text-gray-700">
                  Auch Produktvarianten aktualisieren
                  {formData.updateType === 'temporary' && (
                    <span className="text-xs text-gray-500 ml-1">(nur bei permanenten Aktualisierungen)</span>
                  )}
                </label>
              </div>

              {/* Güncelleme Tipi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aktualisierungstyp
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, updateType: 'permanent' })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.updateType === 'permanent'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-green-300'
                    }`}
                  >
                    <div className={`text-sm font-medium ${
                      formData.updateType === 'permanent' ? 'text-green-600' : 'text-gray-700'
                    }`}>
                      Permanent
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Preis wird dauerhaft geändert
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, updateType: 'temporary' })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.updateType === 'temporary'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-300 hover:border-yellow-300'
                    }`}
                  >
                    <div className={`text-sm font-medium ${
                      formData.updateType === 'temporary' ? 'text-yellow-600' : 'text-gray-700'
                    }`}>
                      Temporär
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Preis nur bis zum Enddatum
                    </div>
                  </button>
                </div>
              </div>

              {/* Geçici fiyat bitiş tarihi */}
              {formData.updateType === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enddatum für temporäre Preisaktualisierung
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.temporaryPriceEndDate}
                    onChange={(e) => setFormData({ ...formData, temporaryPriceEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required={formData.updateType === 'temporary'}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nach diesem Datum wird der ursprüngliche Preis wieder angezeigt
                  </p>
                </div>
              )}

              {/* Önizleme */}
              {formData.adjustmentValue && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Beispiel:</h4>
                  <p className="text-sm text-blue-800">
                    Ein Produkt mit einem Preis von <strong>10,00 €</strong> wird zu{' '}
                    <strong>
                      {formData.adjustmentType === 'percentage'
                        ? (10 * (1 + parseFloat(formData.adjustmentValue || 0) / 100)).toFixed(2)
                        : (10 + parseFloat(formData.adjustmentValue || 0)).toFixed(2)}{' '}
                      €
                    </strong>
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Aktualisierung...' : 'Preise aktualisieren'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

export default BulkPriceUpdateModal;
