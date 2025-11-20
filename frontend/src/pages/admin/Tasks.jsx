import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiEdit2, FiX, FiFilter, FiPackage, FiCheckSquare, FiImage, FiHash, FiTag, FiDollarSign, FiClock, FiUpload, FiSave, FiXCircle, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { de } from 'date-fns/locale';
import adminService from '../../services/adminService';
import categoryService from '../../services/categoryService';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import FileUpload from '../../components/common/FileUpload';
import { normalizeImageUrl } from '../../utils/imageUtils';

const TASK_TYPES = [
  { id: 'image', label: 'Foto', icon: FiImage, color: 'blue', colorClass: 'blue' },
  { id: 'barcode', label: 'Barcode', icon: FiHash, color: 'green', colorClass: 'green' },
  { id: 'category', label: 'Kategorie', icon: FiTag, color: 'purple', colorClass: 'purple' },
  { id: 'price', label: 'Preis', icon: FiDollarSign, color: 'yellow', colorClass: 'yellow' },
  { id: 'expiryDate', label: 'MHD', icon: FiClock, color: 'red', colorClass: 'red' },
  { id: 'taxRate', label: 'Steuersatz', icon: FiDollarSign, color: 'orange', colorClass: 'yellow' },
];

const getColorClasses = (colorClass, isActive) => {
  if (isActive) {
    const activeColors = {
      blue: 'border-blue-500 text-blue-600 font-medium',
      green: 'border-green-500 text-green-600 font-medium',
      purple: 'border-purple-500 text-purple-600 font-medium',
      yellow: 'border-yellow-500 text-yellow-600 font-medium',
      red: 'border-red-500 text-red-600 font-medium',
      gray: 'border-gray-500 text-gray-600 font-medium',
    };
    return activeColors[colorClass] || activeColors.blue;
  }
  return 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300';
};

const getBadgeColorClasses = (colorClass) => {
  const badgeColors = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return badgeColors[colorClass] || badgeColors.blue;
};

const Tasks = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('image');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);

  const limit = 20;

  // Kategorileri yükle
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoryService.getCategories();
        setCategories(response.data?.categories || []);
      } catch (error) {
        console.error('Kategoriler yüklenemedi:', error);
      }
    };
    loadCategories();
  }, []);

  // Her tab için ürün sayısını yükle
  useEffect(() => {
    const loadCounts = async () => {
      const newCounts = {};
      for (const taskType of TASK_TYPES) {
        try {
          const response = await adminService.getProductsWithMissingData(taskType.id, { page: 1, limit: 1 });
          newCounts[taskType.id] = response.data?.pagination?.total || 0;
        } catch (error) {
          console.error(`${taskType.label} sayısı yüklenemedi:`, error);
          newCounts[taskType.id] = 0;
        }
      }
      // Gözardı edilenler sayısını yükle
      try {
        const response = await adminService.getIgnoredProducts(null, { page: 1, limit: 1 });
        newCounts['ignored'] = response.data?.pagination?.total || 0;
      } catch (error) {
        console.error('Gözardı edilenler sayısı yüklenemedi:', error);
        newCounts['ignored'] = 0;
      }
      setCounts(newCounts);
    };
    loadCounts();
  }, []);

  // Ürünleri yükle
  useEffect(() => {
    loadProducts();
  }, [activeTab, page, search, selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'ignored') {
        response = await adminService.getIgnoredProducts(null, {
          page,
          limit,
          search: search || undefined,
          categoryId: selectedCategory || undefined,
        });
      } else {
        response = await adminService.getProductsWithMissingData(activeTab, {
          page,
          limit,
          search: search || undefined,
          categoryId: selectedCategory || undefined,
        });
      }

      if (response.success) {
        setProducts(response.data?.products || []);
        setTotalPages(response.data?.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Ürünler yüklenemedi:', error);
      toast.error('Fehler beim Laden der Produkte');
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = async (productId) => {
    try {
      await adminService.ignoreProductTask(productId, activeTab);
      toast.success('Produkt erfolgreich von Aufgabentyp befreit');
      // Listeyi yenile
      loadProducts();
      // Sayıları güncelle
      const response = await adminService.getProductsWithMissingData(activeTab, { page: 1, limit: 1 });
      setCounts((prev) => ({
        ...prev,
        [activeTab]: response.data?.pagination?.total || 0,
      }));
      // Gözardı edilenler sayısını güncelle
      const ignoredResponse = await adminService.getIgnoredProducts(null, { page: 1, limit: 1 });
      setCounts((prev) => ({
        ...prev,
        ignored: ignoredResponse.data?.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('Muafiyet hatası:', error);
      toast.error(error.response?.data?.message || 'Befreiung fehlgeschlagen');
    }
  };

  const handleUnignore = async (productId, taskType) => {
    try {
      await adminService.unignoreProductTask(productId, taskType);
      toast.success('Befreiung erfolgreich aufgehoben');
      // Listeyi yenile
      loadProducts();
      // Sayıları güncelle
      const ignoredResponse = await adminService.getIgnoredProducts(null, { page: 1, limit: 1 });
      setCounts((prev) => ({
        ...prev,
        ignored: ignoredResponse.data?.pagination?.total || 0,
      }));
      // İlgili görev tipinin sayısını güncelle
      const response = await adminService.getProductsWithMissingData(taskType, { page: 1, limit: 1 });
      setCounts((prev) => ({
        ...prev,
        [taskType]: response.data?.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('Muafiyet kaldırma hatası:', error);
      toast.error(error.response?.data?.message || 'Aufhebung der Befreiung fehlgeschlagen');
    }
  };

  const handleEdit = (product) => {
    navigate(`/admin/products?edit=${product.id}`);
  };

  const handleQuickEdit = (product) => {
    setEditingProduct(product.id);
    // Mevcut değerleri set et
    const currentValues = {};
    if (activeTab === 'barcode') currentValues.barcode = product.barcode || '';
    if (activeTab === 'category') currentValues.categoryId = product.categoryId || '';
    if (activeTab === 'price') currentValues.price = product.price ? parseFloat(product.price) : '';
    if (activeTab === 'expiryDate') currentValues.expiryDate = product.expiryDate || '';
    if (activeTab === 'image') currentValues.imageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
    if (activeTab === 'taxRate') currentValues.taxRate = product.taxRate ? parseFloat(product.taxRate) : '';
    setEditValues(currentValues);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditValues({});
  };

  const handleSave = async (productId) => {
    setSaving(true);
    try {
      const updateData = {};
      
      switch (activeTab) {
        case 'image':
          if (editValues.imageUrls && editValues.imageUrls.length > 0) {
            updateData.imageUrls = editValues.imageUrls;
          }
          break;
        case 'barcode':
          if (editValues.barcode !== undefined) {
            updateData.barcode = editValues.barcode || null;
          }
          break;
        case 'category':
          if (editValues.categoryId) {
            updateData.categoryId = editValues.categoryId;
          }
          break;
        case 'price':
          if (editValues.price !== undefined && editValues.price !== '') {
            updateData.price = parseFloat(editValues.price);
          }
          break;
        case 'expiryDate':
          if (editValues.expiryDate) {
            updateData.expiryDate = editValues.expiryDate;
          }
          break;
        case 'taxRate':
          if (editValues.taxRate !== undefined && editValues.taxRate !== '') {
            updateData.taxRate = parseFloat(editValues.taxRate);
          } else if (editValues.taxRate === '') {
            updateData.taxRate = null;
          }
          break;
      }

      await adminService.updateProduct(productId, updateData);
      toast.success('Produkt erfolgreich aktualisiert');
      setEditingProduct(null);
      setEditValues({});
      // Listeyi yenile
      loadProducts();
      // Sayıları güncelle
      const response = await adminService.getProductsWithMissingData(activeTab, { page: 1, limit: 1 });
      setCounts((prev) => ({
        ...prev,
        [activeTab]: response.data?.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast.error(error.response?.data?.message || 'Aktualisierung fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const getTaskTypeInfo = (typeId) => {
    if (typeId === 'ignored') {
      return { id: 'ignored', label: 'Ignorierte', icon: FiEyeOff, color: 'gray', colorClass: 'gray' };
    }
    return TASK_TYPES.find((t) => t.id === typeId) || TASK_TYPES[0];
  };

  const taskType = getTaskTypeInfo(activeTab);

  return (
    <div className="">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Aufgaben</h1>
        <p className="text-sm md:text-base text-gray-600">Produkte mit fehlenden Informationen nach Aufgabentyp anzeigen</p>
      </div>

      {/* Tab'lar */}
      <div className="mb-4 md:mb-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-2 pb-0 -mb-px md:flex-nowrap">
          {TASK_TYPES.map((type) => {
            const Icon = type.icon;
            const count = counts[type.id] || 0;
            const isActive = activeTab === type.id;

            return (
              <button
                key={type.id}
                onClick={() => {
                  setActiveTab(type.id);
                  setPage(1);
                }}
                className={`flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 md:py-3 border-b-2 transition-colors whitespace-nowrap flex-1 md:flex-initial min-w-0 ${getColorClasses(type.colorClass, isActive)}`}
                title={type.label}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="hidden md:inline">{type.label}</span>
                {count > 0 && (
                  <span className={`px-1 md:px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${isActive ? getBadgeColorClasses(type.colorClass) : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {/* Gözardı Edilenler Tab */}
          <button
            onClick={() => {
              setActiveTab('ignored');
              setPage(1);
            }}
            className={`flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 md:py-3 border-b-2 transition-colors whitespace-nowrap flex-1 md:flex-initial min-w-0 ${getColorClasses('gray', activeTab === 'ignored')}`}
            title="Ignorierte"
          >
            <FiEyeOff size={18} className="flex-shrink-0" />
              <span className="hidden md:inline">Ignorierte</span>
            {counts['ignored'] > 0 && (
              <span className={`px-1 md:px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${activeTab === 'ignored' ? getBadgeColorClasses('gray') : 'bg-gray-100 text-gray-600'}`}>
                {counts['ignored']}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Produkt suchen..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="">Alle Kategorien</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ürün Listesi */}
      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
        <EmptyState
          icon={taskType.icon}
          title={activeTab === 'ignored' ? 'Keine ignorierten Produkte gefunden' : `Keine Produkte mit fehlendem ${taskType.label} gefunden`}
          description={activeTab === 'ignored' ? 'Es gibt derzeit keine Produkte, die von Aufgaben befreit sind.' : 'Alle Produkte scheinen für diesen Aufgabentyp vollständig zu sein.'}
        />
      ) : (
        <>
          {/* Desktop Tablo Görünümü */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produkt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'ignored' ? 'Gözardı Edilen Görevler' : 'Hinzufügen'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'ignored' ? 'Aktion' : 'BEFREIT'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                    ? normalizeImageUrl(product.imageUrls[0])
                    : null;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                                loading="lazy"
                              />
                            ) : (
                              <FiPackage className="text-gray-400" size={20} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {product.name}
                            </div>
                            {product.brand && (
                              <div className="text-sm text-gray-500">{product.brand}</div>
                            )}
                            {product.barcode && (
                              <div className="text-xs text-gray-400 font-mono">{product.barcode}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.category?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {activeTab === 'ignored' ? (
                          <div className="flex flex-wrap gap-1">
                            {product.ignoredTasks && product.ignoredTasks.length > 0 ? (
                              product.ignoredTasks.map((taskType) => {
                                const taskInfo = TASK_TYPES.find((t) => t.id === taskType) || { label: taskType };
                                return (
                                  <span
                                    key={taskType}
                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                  >
                                    {taskInfo.label}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        ) : editingProduct === product.id ? (
                          <div className="space-y-2 min-w-[300px]">
                            {activeTab === 'image' && (
                              <div>
                                <FileUpload
                                  value={editValues.imageUrls || []}
                                  onChange={(urls) => setEditValues({ ...editValues, imageUrls: urls })}
                                  multiple={true}
                                  folder="products"
                                  className="w-full"
                                />
                              </div>
                            )}
                            {activeTab === 'barcode' && (
                              <input
                                type="text"
                                value={editValues.barcode || ''}
                                onChange={(e) => setEditValues({ ...editValues, barcode: e.target.value })}
                                placeholder="Barcode eingeben"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                            )}
                            {activeTab === 'category' && (
                              <select
                                value={editValues.categoryId || ''}
                                onChange={(e) => setEditValues({ ...editValues, categoryId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              >
                                <option value="">Kategorie auswählen</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            {activeTab === 'price' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={editValues.price || ''}
                                  onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                                  placeholder="Preis eingeben"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  autoFocus
                                />
                                <span className="text-gray-500">€</span>
                              </div>
                            )}
                            {activeTab === 'expiryDate' && (
                              <input
                                type="date"
                                value={editValues.expiryDate ? new Date(editValues.expiryDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => setEditValues({ ...editValues, expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                            )}
                            {activeTab === 'taxRate' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  inputMode="decimal"
                                  value={editValues.taxRate || ''}
                                  onChange={(e) => setEditValues({ ...editValues, taxRate: e.target.value })}
                                  placeholder="Vergi oranı (örn: 19.00)"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  autoFocus
                                />
                                <span className="text-gray-500">%</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSave(product.id)}
                                disabled={saving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                              >
                                <FiSave size={14} />
                                Speichern
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                              >
                                <FiXCircle size={14} />
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuickEdit(product)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            >
                              {activeTab === 'image' ? (
                                <>
                                  <FiUpload size={12} className="inline mr-1" />
                                  Hochladen
                                </>
                              ) : (
                                'Hinzufügen'
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'ignored' ? (
                            product.ignoredTasks && product.ignoredTasks.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {product.ignoredTasks.map((taskType) => {
                                  const taskInfo = TASK_TYPES.find((t) => t.id === taskType) || { label: taskType };
                                  return (
                                    <button
                                      key={taskType}
                                      onClick={() => handleUnignore(product.id, taskType)}
                                      className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                      title={`${taskInfo.label} muafiyetini kaldır`}
                                    >
                                      <FiX size={12} className="inline mr-1" />
                                      {taskInfo.label}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null
                          ) : editingProduct !== product.id ? (
                            <button
                              onClick={() => handleIgnore(product.id)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Befreien"
                            >
                              <FiCheckSquare size={18} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobil Kart Görünümü */}
          <div className="md:hidden space-y-4">
            {products.map((product) => {
              const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
                ? normalizeImageUrl(product.imageUrls[0])
                : null;

              return (
                <div key={product.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                        />
                      ) : (
                        <FiPackage className="text-gray-400" size={24} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 mb-1">{product.name}</div>
                      {product.brand && (
                        <div className="text-sm text-gray-500 mb-1">{product.brand}</div>
                      )}
                      {product.barcode && (
                        <div className="text-xs text-gray-400 font-mono mb-1">{product.barcode}</div>
                      )}
                      <div className="text-sm text-gray-600">
                        {product.category?.name || 'Keine Kategorie'}
                      </div>
                    </div>
                  </div>

                  {editingProduct === product.id ? (
                    <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
                      {activeTab === 'image' && (
                        <div>
                          <FileUpload
                            value={editValues.imageUrls || []}
                            onChange={(urls) => setEditValues({ ...editValues, imageUrls: urls })}
                            multiple={true}
                            folder="products"
                            className="w-full"
                          />
                        </div>
                      )}
                      {activeTab === 'barcode' && (
                        <input
                          type="text"
                          value={editValues.barcode || ''}
                          onChange={(e) => setEditValues({ ...editValues, barcode: e.target.value })}
                          placeholder="Barcode eingeben"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          autoFocus
                        />
                      )}
                      {activeTab === 'category' && (
                        <select
                          value={editValues.categoryId || ''}
                          onChange={(e) => setEditValues({ ...editValues, categoryId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          autoFocus
                        >
                          <option value="">Kategorie auswählen</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {activeTab === 'price' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={editValues.price || ''}
                            onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                            placeholder="Preis eingeben"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            autoFocus
                          />
                          <span className="text-gray-500">€</span>
                        </div>
                      )}
                      {activeTab === 'expiryDate' && (
                        <DatePicker
                          selected={editValues.expiryDate ? new Date(editValues.expiryDate) : null}
                          onChange={(date) => setEditValues({ ...editValues, expiryDate: date ? date.toISOString() : null })}
                          dateFormat="dd/MM/yyyy"
                          locale={de}
                          placeholderText="dd/MM/yyyy"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          wrapperClassName="w-full"
                          autoFocus
                        />
                      )}
                      {activeTab === 'taxRate' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            inputMode="decimal"
                            value={editValues.taxRate || ''}
                            onChange={(e) => setEditValues({ ...editValues, taxRate: e.target.value })}
                            placeholder="Vergi oranı (örn: 19.00)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            autoFocus
                          />
                          <span className="text-gray-500">%</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSave(product.id)}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <FiSave size={14} />
                          Speichern
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <FiXCircle size={14} />
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : activeTab === 'ignored' ? (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Gözardı Edilen Görevler:</div>
                        {product.ignoredTasks && product.ignoredTasks.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {product.ignoredTasks.map((taskType) => {
                              const taskInfo = TASK_TYPES.find((t) => t.id === taskType) || { label: taskType };
                              return (
                                <button
                                  key={taskType}
                                  onClick={() => handleUnignore(product.id, taskType)}
                                  className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                                  title={`${taskInfo.label} muafiyetini kaldır`}
                                >
                                  <FiX size={14} />
                                  {taskInfo.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleQuickEdit(product)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {activeTab === 'image' ? (
                          <>
                            <FiUpload size={14} />
                            <span>Hochladen</span>
                          </>
                        ) : (
                          <>
                            <FiEdit2 size={14} />
                            <span>Hinzufügen</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleIgnore(product.id)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Befreien"
                      >
                        <FiCheckSquare size={18} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sayfalama */}
          {totalPages > 1 && (
            <div className="mt-4 md:mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm md:text-base"
              >
                Zurück
              </button>
              <span className="px-3 md:px-4 py-2 text-xs md:text-sm text-gray-600">
                Seite {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm md:text-base"
              >
                Nächste
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Tasks;

