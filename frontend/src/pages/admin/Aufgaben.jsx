import { useState, useEffect } from 'react';
import { FiX, FiEdit2, FiSave, FiXCircle, FiPackage, FiDollarSign, FiImage, FiBox, FiHash, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import FileUpload from '../../components/common/FileUpload';
import { normalizeImageUrl } from '../../utils/imageUtils';

const TABS = [
  { id: 'price', label: 'Preis', icon: FiDollarSign },
  { id: 'image', label: 'Bild', icon: FiImage },
  { id: 'stock', label: 'Lagerbestand', icon: FiBox },
  { id: 'barcode', label: 'Barcode', icon: FiHash },
];

function Aufgaben() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState({
    price: { count: 0, products: [] },
    image: { count: 0, products: [] },
    stock: { count: 0, products: [] },
    barcode: { count: 0, products: [] },
  });
  const [activeTab, setActiveTab] = useState('price');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await adminService.getTasks();
      setTasks(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Aufgaben');
      console.error('Tasks fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = async (productId, category) => {
    try {
      await adminService.ignoreTask(productId, category);
      toast.success('Aufgabe erfolgreich ignoriert');
      await fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Ignorieren der Aufgabe');
      console.error('Ignore error:', error);
    }
  };

  const handleEdit = (product, category) => {
    setEditingProduct({ id: product.id, category });
    setEditValues({
      price: product.price || '',
      stock: product.stock !== null && product.stock !== undefined ? product.stock : '',
      barcode: product.barcode || '',
      imageUrls: product.imageUrls || [],
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditValues({});
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    try {
      setSaving(true);
      const updateData = {};

      if (editingProduct.category === 'price') {
        const price = parseFloat(editValues.price);
        if (isNaN(price) || price < 0) {
          toast.error('Ungültiger Preis');
          return;
        }
        updateData.price = price;
      } else if (editingProduct.category === 'stock') {
        const stock = parseInt(editValues.stock);
        if (isNaN(stock) || stock < 0) {
          toast.error('Ungültiger Lagerbestand');
          return;
        }
        updateData.stock = stock;
      } else if (editingProduct.category === 'barcode') {
        updateData.barcode = editValues.barcode || null;
      } else if (editingProduct.category === 'image') {
        updateData.imageUrls = Array.isArray(editValues.imageUrls) ? editValues.imageUrls : [];
      }

      await adminService.updateProduct(editingProduct.id, updateData);
      toast.success('Produkt erfolgreich aktualisiert');
      setEditingProduct(null);
      setEditValues({});
      await fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren des Produkts');
      console.error('Update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const currentProducts = tasks[activeTab]?.products || [];

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aufgaben</h1>
          <p className="text-sm text-gray-600 mt-1">
            Produkte mit fehlenden Informationen verwalten
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tasks[tab.id]?.count || 0;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                    ${isActive
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`
                      ml-1 px-2 py-0.5 text-xs rounded-full
                      ${isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentProducts.length === 0 ? (
            <EmptyState
              icon={FiAlertCircle}
              title="Keine Aufgaben"
              message={`Keine Produkte mit fehlendem ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()} gefunden.`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentProducts.map((product) => {
                const isEditing = editingProduct?.id === product.id && editingProduct?.category === activeTab;

                return (
                  <div
                    key={product.id}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Product Info */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                        {activeTab === 'image' ? (
                          <FiImage className="text-gray-400" size={20} />
                        ) : (
                          <FiPackage className="text-gray-400" size={20} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {product.category?.name || 'Keine Kategorie'}
                        </p>
                      </div>
                    </div>

                    {/* Edit Form */}
                    {isEditing ? (
                      <div className="space-y-3">
                        {activeTab === 'price' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Preis (€)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValues.price}
                              onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="0.00"
                            />
                          </div>
                        )}

                        {activeTab === 'stock' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Lagerbestand
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editValues.stock}
                              onChange={(e) => setEditValues({ ...editValues, stock: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="0"
                            />
                          </div>
                        )}

                        {activeTab === 'barcode' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Barcode
                            </label>
                            <input
                              type="text"
                              value={editValues.barcode}
                              onChange={(e) => setEditValues({ ...editValues, barcode: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Barcode eingeben"
                            />
                          </div>
                        )}

                        {activeTab === 'image' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Produktbilder
                            </label>
                            <FileUpload
                              value={editValues.imageUrls}
                              onChange={(urls) => setEditValues({ ...editValues, imageUrls: urls })}
                              multiple={true}
                              folder="products"
                              className="mt-1"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FiSave size={16} />
                            {saving ? 'Speichern...' : 'Speichern'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Missing Info Display */}
                        <div className="mb-3">
                          {activeTab === 'price' && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Preis:</span> <span className="text-red-600">Fehlt</span>
                            </div>
                          )}
                          {activeTab === 'stock' && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Lagerbestand:</span> <span className="text-red-600">Fehlt</span>
                            </div>
                          )}
                          {activeTab === 'barcode' && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Barcode:</span> <span className="text-red-600">Fehlt</span>
                            </div>
                          )}
                          {activeTab === 'image' && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Bilder:</span> <span className="text-red-600">Fehlen</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(product, activeTab)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <FiEdit2 size={16} />
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleIgnore(product.id, activeTab)}
                            className="px-3 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors"
                            title="Ignorieren"
                          >
                            <FiXCircle size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Aufgaben;

