import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiFilter, FiGrid, FiList, FiCheck, FiXCircle, FiImage, FiPackage, FiCalendar } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { useAlert } from '../../contexts/AlertContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import FileUpload from '../../components/common/FileUpload';
import { cleanRequestData } from '../../utils/requestUtils';

function Categories() {
  const { showConfirm } = useAlert();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    // localStorage'dan görünüm modunu oku
    const savedViewMode = localStorage.getItem('categoriesViewMode');
    return savedViewMode || 'grid';
  });

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    imageUrl: '',
    sortOrder: '',
    isActive: true,
  });

  // Verileri yükle
  useEffect(() => {
    loadCategories();
  }, [searchQuery, isActiveFilter, sortBy, sortOrder]);

  // Görünüm modunu localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('categoriesViewMode', viewMode);
  }, [viewMode]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const params = {
        sortBy,
        sortOrder,
      };

      if (searchQuery) params.search = searchQuery;
      if (isActiveFilter !== '') params.isActive = isActiveFilter === 'true';

      const response = await adminService.getCategories(params);
      setCategories(response.data.categories || []);
    } catch (error) {
      toast.error('Kategorien konnten nicht geladen werden');
      console.error('Kategori yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Modal aç/kapat
  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        imageUrl: category.imageUrl || '',
        sortOrder: category.sortOrder?.toString() || '',
        isActive: category.isActive !== undefined ? category.isActive : true,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        imageUrl: '',
        sortOrder: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name,
        slug: formData.slug,
        imageUrl: formData.imageUrl || null,
        sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : null,
        isActive: formData.isActive,
      };

      // Boş string'leri, null ve undefined değerleri temizle
      const cleanedData = cleanRequestData(submitData);

      if (editingCategory) {
        await adminService.updateCategory(editingCategory.id, cleanedData);
        toast.success('Kategorie erfolgreich aktualisiert');
      } else {
        await adminService.createCategory(cleanedData);
        toast.success('Kategorie erfolgreich erstellt');
      }

      closeModal();
      loadCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern');
      console.error('Kategori kaydetme hatası:', error);
    }
  };

  // Kategori sil
  const handleDelete = async (category) => {
    const confirmed = await showConfirm(
      `Möchten Sie "${category.name}" wirklich löschen?`,
      { title: 'Kategorie löschen' }
    );

    if (confirmed) {
      try {
        await adminService.deleteCategory(category.id);
        toast.success('Kategorie erfolgreich gelöscht');
        loadCategories();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Fehler beim Löschen');
      }
    }
  };

  // Slug oluştur (name'den)
  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  // Name değiştiğinde slug'u otomatik oluştur
  const handleNameChange = (name) => {
    setFormData({
      ...formData,
      name,
      slug: formData.slug || generateSlug(name),
    });
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSearchQuery('');
    setIsActiveFilter('');
  };

  // Aktif filtre sayısı
  const activeFilterCount = [
    searchQuery,
    isActiveFilter !== '',
  ].filter(Boolean).length;

  if (loading && categories.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Kategorien</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {categories.length} {categories.length === 1 ? 'Kategorie' : 'Kategorien'} insgesamt
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Kartenansicht"
            >
              <FiGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Listenansicht"
            >
              <FiList size={18} />
            </button>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiPlus size={20} />
            Neue Kategorie
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Kategorien suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
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
              {/* Aktif/Pasif */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={isActiveFilter}
                  onChange={(e) => setIsActiveFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Alle</option>
                  <option value="true">Aktiv</option>
                  <option value="false">Inaktiv</option>
                </select>
              </div>

              {/* Sortierung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sortierung
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="sortOrder-asc">Sortierung: Niedrig-Hoch</option>
                  <option value="sortOrder-desc">Sortierung: Hoch-Niedrig</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="createdAt-desc">Neueste zuerst</option>
                  <option value="createdAt-asc">Älteste zuerst</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Categories View */}
      {loading && categories.length === 0 ? (
        <div className="p-8 text-center">
          <div className="animate-pulse">Lädt...</div>
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FiGrid}
          title="Keine Kategorien gefunden"
          message="Erstellen Sie Ihre erste Kategorie oder passen Sie die Filter an."
        />
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Category Image */}
                  <div className="h-32 bg-gray-100 relative overflow-hidden">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiGrid className="text-gray-400 text-4xl" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {category.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          <FiCheck size={12} />
                          Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          <FiXCircle size={12} />
                          Inaktiv
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">/{category.slug}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <span>
                        {category._count?.products || 0} {category._count?.products === 1 ? 'Produkt' : 'Produkte'}
                      </span>
                      {category.sortOrder !== null && (
                        <span>Sortierung: {category.sortOrder}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(category)}
                        className="flex-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        <FiEdit2 className="inline mr-1" size={16} />
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden overflow-x-hidden">
              {/* Desktop Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                <div className="col-span-2">Bild</div>
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Details</div>
                <div className="col-span-2">Statistik</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Aktionen</div>
              </div>

              {/* List Items */}
              <div className="divide-y divide-gray-200">
                <AnimatePresence mode="popLayout">
                  {categories.map((category) => (
                    <motion.div
                      key={category.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Mobile View */}
                      <div className="md:hidden p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          {/* Image */}
                          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {category.imageUrl ? (
                              <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FiGrid className="text-gray-400 text-2xl" />
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg text-gray-900 truncate">{category.name}</h3>
                                <p className="text-sm text-gray-500 mt-1 truncate">/{category.slug}</p>
                              </div>
                              <div className="flex-shrink-0">
                                {category.isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                    <FiCheck size={12} />
                                    Aktiv
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                    <FiXCircle size={12} />
                                    Inaktiv
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <FiPackage className="w-4 h-4 text-gray-400" />
                            <div>
                              <span className="text-gray-500">Produkte:</span>
                              <span className="ml-2 font-semibold text-gray-900">
                                {category._count?.products || 0}
                              </span>
                            </div>
                          </div>
                          {category.sortOrder !== null && (
                            <div className="flex items-center gap-2">
                              <FiGrid className="w-4 h-4 text-gray-400" />
                              <div>
                                <span className="text-gray-500">Sortierung:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {category.sortOrder}
                                </span>
                              </div>
                            </div>
                          )}
                          {category.createdAt && (
                            <div className="col-span-2 flex items-center gap-2">
                              <FiCalendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500">Erstellt:</span>
                              <span className="ml-2 text-gray-700">
                                {new Date(category.createdAt).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => openModal(category)}
                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                            <span>Bearbeiten</span>
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Desktop View */}
                      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                        {/* Image */}
                        <div className="col-span-2">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                            {category.imageUrl ? (
                              <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FiGrid className="text-gray-400 text-xl" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Name & Slug */}
                        <div className="col-span-2">
                          <div className="font-semibold text-gray-900">{category.name}</div>
                          <div className="text-sm text-gray-500 mt-1">/{category.slug}</div>
                        </div>

                        {/* Details */}
                        <div className="col-span-2">
                          <div className="text-sm space-y-1">
                            {category.sortOrder !== null && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <FiGrid className="w-3 h-3" />
                                <span>Sortierung: {category.sortOrder}</span>
                              </div>
                            )}
                            {category.createdAt && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <FiCalendar className="w-3 h-3" />
                                <span>
                                  {new Date(category.createdAt).toLocaleDateString('de-DE')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Statistics */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <FiPackage className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-semibold text-gray-900">
                                {category._count?.products || 0}
                              </div>
                              <div className="text-xs text-gray-500">
                                {category._count?.products === 1 ? 'Produkt' : 'Produkte'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            {category.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                <FiCheck className="w-3 h-3" />
                                Aktiv
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                <FiXCircle className="w-3 h-3" />
                                Inaktiv
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openModal(category)}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                            >
                              <FiEdit2 className="w-4 h-4" />
                              <span className="hidden lg:inline">Bearbeiten</span>
                            </button>
                            <button
                              onClick={() => handleDelete(category)}
                              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}

      {/* Category Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="Wird automatisch generiert"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL-freundlicher Name (z.B. "obst-gemuese")
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kategoriebild
                    </label>
                    <FileUpload
                      value={formData.imageUrl || ''}
                      onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                      multiple={false}
                      folder="categories"
                      maxSize={50 * 1024 * 1024}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Oder geben Sie manuell eine URL ein:
                    </p>
                      <input
                        type="text"
                      value={formData.imageUrl || ''}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mt-1"
                      />
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sortierung
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                      placeholder="Niedrigere Zahlen erscheinen zuerst"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Kategorien werden nach diesem Wert sortiert
                    </p>
                  </div>

                  {/* Active Checkbox */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Aktiv</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {editingCategory ? 'Aktualisieren' : 'Erstellen'}
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

export default Categories;

