import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiFilter, FiCheck, FiXCircle, FiTag, FiCalendar, FiRefreshCw, FiUsers, FiPackage, FiGrid, FiList } from 'react-icons/fi';
import { toast } from 'react-toastify';
import couponService from '../../services/couponService';
import adminService from '../../services/adminService';
import { useAlert } from '../../contexts/AlertContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { cleanRequestData } from '../../utils/requestUtils';
import HelpTooltip from '../../components/common/HelpTooltip';

function Coupons() {
  const { showConfirm } = useAlert();
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    // localStorage'dan görünüm modunu oku
    const savedViewMode = localStorage.getItem('couponsViewMode');
    return savedViewMode || 'grid';
  });

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'PERCENTAGE',
    discountPercent: '',
    discountAmount: '',
    startDate: '',
    endDate: '',
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    userUsageLimit: '1',
    applyToAll: true,
    userIds: [],
    categoryIds: [],
    productIds: [],
    isActive: true,
  });

  // Verileri yükle
  useEffect(() => {
    loadCoupons();
    loadCategories();
    loadProducts();
    loadUsers();
  }, [searchQuery, typeFilter, isActiveFilter]);

  // Görünüm modunu localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('couponsViewMode', viewMode);
  }, [viewMode]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.type = typeFilter;
      if (isActiveFilter !== '') params.isActive = isActiveFilter === 'true';

      const response = await couponService.getCoupons(params);
      setCoupons(response.data.coupons || []);
    } catch (error) {
      toast.error('Gutscheine konnten nicht geladen werden');
      console.error('Kupon yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await adminService.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Kategori yükleme hatası:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await adminService.getProducts({ limit: 100 });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Ürün yükleme hatası:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await adminService.getUsers({ limit: 100 });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Kullanıcı yükleme hatası:', error);
    }
  };

  // Modal aç/kapat
  const openModal = (coupon = null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code || '',
        name: coupon.name || '',
        type: coupon.type || 'PERCENTAGE',
        discountPercent: coupon.discountPercent || '',
        discountAmount: coupon.discountAmount || '',
        startDate: coupon.startDate ? coupon.startDate.split('T')[0] : '',
        endDate: coupon.endDate ? coupon.endDate.split('T')[0] : '',
        minPurchase: coupon.minPurchase || '',
        maxDiscount: coupon.maxDiscount || '',
        usageLimit: coupon.usageLimit || '',
        userUsageLimit: coupon.userUsageLimit?.toString() || '1',
        applyToAll: coupon.applyToAll !== undefined ? coupon.applyToAll : true,
        userIds: coupon.userIds || [],
        categoryIds: coupon.categoryIds || [],
        productIds: coupon.productIds || [],
        isActive: coupon.isActive !== undefined ? coupon.isActive : true,
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        name: '',
        type: 'PERCENTAGE',
        discountPercent: '',
        discountAmount: '',
        startDate: '',
        endDate: '',
        minPurchase: '',
        maxDiscount: '',
        usageLimit: '',
        userUsageLimit: '1',
        applyToAll: true,
        userIds: [],
        categoryIds: [],
        productIds: [],
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCoupon(null);
  };

  // Rastgele kod oluştur
  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await couponService.generateCouponCode(8);
      setFormData({ ...formData, code: response.data.code });
      toast.success('Gutscheincode erstellt');
    } catch (error) {
      toast.error('Code konnte nicht erstellt werden');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Type'a göre sadece gerekli discount alanını ekle
      const submitData = {
        code: formData.code,
        name: formData.name,
        type: formData.type,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : null,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        userUsageLimit: parseInt(formData.userUsageLimit) || 1,
        applyToAll: formData.applyToAll,
        userIds: formData.userIds.length > 0 ? formData.userIds : null,
        categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : null,
        productIds: formData.productIds.length > 0 ? formData.productIds : null,
        isActive: formData.isActive,
      };

      // Type'a göre sadece ilgili discount alanını ekle
      if (formData.type === 'PERCENTAGE') {
        submitData.discountPercent = formData.discountPercent ? parseFloat(formData.discountPercent) : null;
      } else if (formData.type === 'FIXED_AMOUNT') {
        submitData.discountAmount = formData.discountAmount ? parseFloat(formData.discountAmount) : null;
      }

      // Boş string'leri, null ve undefined değerleri temizle
      const cleanedData = cleanRequestData(submitData);

      if (editingCoupon) {
        await couponService.updateCoupon(editingCoupon.id, cleanedData);
        toast.success('Gutschein erfolgreich aktualisiert');
      } else {
        await couponService.createCoupon(cleanedData);
        toast.success('Gutschein erfolgreich erstellt');
      }

      closeModal();
      loadCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Speicherfehler');
      console.error('Kupon kaydetme hatası:', error);
    }
  };

  // Kupon sil
  const handleDelete = async (coupon) => {
    const confirmed = await showConfirm(
      `Möchten Sie den Gutschein "${coupon.code}" wirklich löschen?`,
      { title: 'Gutschein löschen' }
    );

    if (confirmed) {
      try {
        await couponService.deleteCoupon(coupon.id);
        toast.success('Gutschein erfolgreich gelöscht');
        loadCoupons();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Löschfehler');
      }
    }
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setIsActiveFilter('');
  };

  // Kupon tipi label
  const getCouponTypeLabel = (type) => {
    const labels = {
      PERCENTAGE: 'Prozent',
      FIXED_AMOUNT: 'Fester Betrag',
    };
    return labels[type] || type;
  };

  if (loading && coupons.length === 0) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className=" mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Gutscheine
              <HelpTooltip content="Verwalten Sie Rabattgutscheine: Erstellen, bearbeiten und verfolgen Sie Gutscheincodes für Ihre Kunden." />
            </h1>
            <button
              onClick={() => openModal()}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-sm whitespace-nowrap"
            >
              <FiPlus className="w-4 h-4" />
              <span>Neuer Gutschein</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Gutschein suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle & View Mode */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
              >
                <FiFilter className="w-4 h-4" />
                <span>Filter {(typeFilter || isActiveFilter) && `(${[typeFilter, isActiveFilter].filter(Boolean).length})`}</span>
              </button>
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
                    <FiGrid className="w-5 h-5" />
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
                    <FiList className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1">
                        Typ
                        <HelpTooltip content="Filtern Sie Gutscheine nach Rabatttyp: Prozentrabatt oder fester Betrag." />
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Alle Typen</option>
                        <option value="PERCENTAGE">Prozent</option>
                        <option value="FIXED_AMOUNT">Fester Betrag</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1">
                        Status
                        <HelpTooltip content="Filtern Sie Gutscheine nach ihrem Aktivierungsstatus. Aktive Gutscheine können verwendet werden, inaktive nicht." />
                      </label>
                      <select
                        value={isActiveFilter}
                        onChange={(e) => setIsActiveFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Alle Status</option>
                        <option value="true">Aktiv</option>
                        <option value="false">Inaktiv</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={clearFilters}
                        className="w-full px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg"
                      >
                        Filter zurücksetzen
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Coupons List */}
      <div className=" mx-auto px-4 py-6">
        {coupons.length === 0 ? (
          <EmptyState
            icon={FiTag}
            title="Keine Gutscheine gefunden"
            description="Erstellen Sie Ihren ersten Gutschein"
            action={{
              label: 'Neuer Gutschein',
              onClick: () => openModal(),
            }}
          />
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {coupons.map((coupon) => (
                    <motion.div
                      key={coupon.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{coupon.code}</h3>
                            {coupon.name && (
                              <p className="text-sm text-gray-600 mb-1">{coupon.name}</p>
                            )}
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              {getCouponTypeLabel(coupon.type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {coupon.isActive ? (
                              <FiCheck className="w-5 h-5 text-green-600" />
                            ) : (
                              <FiXCircle className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Discount Info */}
                        <div className="mb-3">
                          {coupon.type === 'PERCENTAGE' ? (
                            <p className="text-lg font-semibold text-green-600">
                              %{parseFloat(coupon.discountPercent || 0).toFixed(0)} Rabatt
                            </p>
                          ) : (
                            <p className="text-lg font-semibold text-green-600">
                              {parseFloat(coupon.discountAmount || 0).toFixed(2)} € Rabatt
                            </p>
                          )}
                        </div>

                        {/* Details */}
                        <div className="text-xs text-gray-500 space-y-1 mb-3">
                          <div className="flex items-center gap-2">
                            <FiCalendar className="w-3 h-3" />
                            <span>
                              {new Date(coupon.startDate).toLocaleDateString('de-DE')} -{' '}
                              {new Date(coupon.endDate).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                          {coupon.usageCount > 0 && (
                            <div className="flex items-center gap-2">
                              <FiUsers className="w-3 h-3" />
                              <span>Verwendung: {coupon.usageCount}x</span>
                            </div>
                          )}
                          {coupon.minPurchase && (
                            <div className="flex items-center gap-2">
                              <FiPackage className="w-3 h-3" />
                              <span>Min: {parseFloat(coupon.minPurchase).toFixed(2)} €</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(coupon)}
                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                            <span>Bearbeiten</span>
                          </button>
                          <button
                            onClick={() => handleDelete(coupon)}
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden overflow-x-hidden">
                {/* Desktop Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                  <div className="col-span-2">Code</div>
                  <div className="col-span-2">Rabatt</div>
                  <div className="col-span-2">Zeitraum</div>
                  <div className="col-span-2">Regeln</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Aktionen</div>
                </div>

                {/* List Items */}
                <div className="divide-y divide-gray-200">
                  <AnimatePresence mode="popLayout">
                    {coupons.map((coupon) => (
                      <motion.div
                        key={coupon.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Mobile View */}
                        <div className="md:hidden p-3">
                          {/* Header Row */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-base text-gray-900 truncate">{coupon.code}</h3>
                                {coupon.isActive ? (
                                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500"></span>
                                ) : (
                                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-400"></span>
                                )}
                              </div>
                              {coupon.name && (
                                <p className="text-xs text-gray-500 truncate">{coupon.name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => openModal(coupon)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(coupon)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Main Info - Single Row */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                              {getCouponTypeLabel(coupon.type)}
                            </span>
                            <span className="text-sm font-semibold text-green-600">
                              {coupon.type === 'PERCENTAGE' ? (
                                <>%{parseFloat(coupon.discountPercent || 0).toFixed(0)}</>
                              ) : (
                                <>{parseFloat(coupon.discountAmount || 0).toFixed(2)} €</>
                              )}
                            </span>
                            {coupon.maxDiscount && (
                              <span className="text-xs text-gray-500">
                                (Max: {parseFloat(coupon.maxDiscount).toFixed(2)} €)
                              </span>
                            )}
                          </div>

                          {/* Secondary Info - Compact */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" />
                              <span>{new Date(coupon.startDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {new Date(coupon.endDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                            {coupon.minPurchase && (
                              <div className="flex items-center gap-1">
                                <FiPackage className="w-3 h-3" />
                                <span>Min: {parseFloat(coupon.minPurchase).toFixed(0)}€</span>
                              </div>
                            )}
                            {coupon.usageCount > 0 && (
                              <div className="flex items-center gap-1">
                                <FiUsers className="w-3 h-3" />
                                <span>{coupon.usageCount}x</span>
                              </div>
                            )}
                          </div>

                          {/* Additional Rules - Only if exists, very compact */}
                          {(coupon.usageLimit || coupon.userUsageLimit) && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                              {coupon.usageLimit && <span>Limit: {coupon.usageLimit}x</span>}
                              {coupon.userUsageLimit && coupon.userUsageLimit !== 1 && (
                                <span>• Pro User: {coupon.userUsageLimit}x</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                          <div className="col-span-2">
                            <div className="font-semibold text-gray-900">{coupon.code}</div>
                            {coupon.name && (
                              <div className="text-sm text-gray-500 mt-1">{coupon.name}</div>
                            )}
                            <span className="inline-block mt-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              {getCouponTypeLabel(coupon.type)}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <div className="font-semibold text-green-600">
                              {coupon.type === 'PERCENTAGE' ? (
                                <>%{parseFloat(coupon.discountPercent || 0).toFixed(0)}</>
                              ) : (
                                <>{parseFloat(coupon.discountAmount || 0).toFixed(2)} €</>
                              )}
                            </div>
                            {coupon.maxDiscount && (
                              <div className="text-xs text-gray-500 mt-1">
                                Max: {parseFloat(coupon.maxDiscount).toFixed(2)} €
                              </div>
                            )}
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm text-gray-700">
                              {new Date(coupon.startDate).toLocaleDateString('de-DE')}
                            </div>
                            <div className="text-sm text-gray-700">
                              {new Date(coupon.endDate).toLocaleDateString('de-DE')}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm space-y-1">
                              {coupon.minPurchase && (
                                <div className="text-gray-600">
                                  Min: {parseFloat(coupon.minPurchase).toFixed(2)} €
                                </div>
                              )}
                              {coupon.usageLimit && (
                                <div className="text-gray-600">
                                  Limit: {coupon.usageLimit}x
                                </div>
                              )}
                              {coupon.userUsageLimit && (
                                <div className="text-gray-600">
                                  Pro User: {coupon.userUsageLimit}x
                                </div>
                              )}
                              {coupon.usageCount > 0 && (
                                <div className="text-green-600 font-medium">
                                  Verwendet: {coupon.usageCount}x
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center gap-2">
                              {coupon.isActive ? (
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
                          <div className="col-span-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openModal(coupon)}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                              >
                                <FiEdit2 className="w-4 h-4" />
                                <span className="hidden lg:inline">Bearbeiten</span>
                              </button>
                              <button
                                onClick={() => handleDelete(coupon)}
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
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCoupon ? 'Gutschein bearbeiten' : 'Neuer Gutschein'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Grundinformationen</h3>

                  {/* Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-0">
                      Gutscheincode *
                      <HelpTooltip content="Der eindeutige Code, den Kunden beim Checkout eingeben. Wird automatisch in Großbuchstaben konvertiert. Verwenden Sie 'Erstellen' für einen zufälligen Code." />
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="GUTSCHEIN2024"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        disabled={generatingCode}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <FiRefreshCw className={`w-4 h-4 ${generatingCode ? 'animate-spin' : ''}`} />
                        <span>Erstellen</span>
                      </button>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gutscheinname (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Neujahrsrabatt"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-0">
                      Rabatttyp *
                      <HelpTooltip content="Prozentrabatt: Reduziert den Preis um einen Prozentsatz. Fester Betrag: Reduziert den Preis um einen festen Euro-Betrag." />
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="PERCENTAGE">Prozentrabatt</option>
                      <option value="FIXED_AMOUNT">Fester Betrag Rabatt</option>
                    </select>
                  </div>

                  {/* Discount */}
                  {formData.type === 'PERCENTAGE' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-0">
                        Rabattprozentsatz *
                        <HelpTooltip content="Der Rabattprozentsatz (0.01-100). Beispiel: 20 bedeutet 20% Rabatt. Sie können optional einen maximalen Rabattbetrag festlegen." />
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        value={formData.discountPercent}
                        onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="20"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-0">
                        Rabattbetrag (€) *
                        <HelpTooltip content="Der feste Rabattbetrag in Euro. Beispiel: 10.00 bedeutet 10€ Rabatt vom Gesamtpreis." />
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.discountAmount}
                        onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="10.00"
                        required
                      />
                    </div>
                  )}

                  {/* Max Discount (for percentage) */}
                  {formData.type === 'PERCENTAGE' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-0">
                        Maximaler Rabatt (€) (Optional)
                        <HelpTooltip content="Begrenzt den maximalen Rabattbetrag bei Prozentrabatten. Beispiel: Bei 20% Rabatt und max. 50€ wird bei einem 500€ Einkauf nur 50€ statt 100€ abgezogen." />
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="50.00"
                      />
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Zeitraum
                    <HelpTooltip content="Der Zeitraum, in dem der Gutschein gültig ist. Der Gutschein kann nur zwischen Start- und Enddatum verwendet werden." />
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Startdatum *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enddatum *
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Rules */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Regeln
                    <HelpTooltip content="Definieren Sie Bedingungen und Limits für die Gutscheinnutzung. Diese Regeln bestimmen, wann und wie oft der Gutschein verwendet werden kann." />
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-0">
                      Mindestbestellwert (€) (Optional)
                      <HelpTooltip content="Der Gutschein kann nur angewendet werden, wenn der Warenkorbwert diesen Betrag erreicht oder überschreitet." />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minPurchase}
                      onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="50.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-0">
                      Gesamtnutzungslimit (Optional)
                      <HelpTooltip content="Die maximale Anzahl, wie oft dieser Gutschein insgesamt verwendet werden kann. Leer lassen für unbegrenzte Nutzung." />
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-0">
                      Nutzungslimit pro Benutzer
                      <HelpTooltip content="Wie oft derselbe Benutzer diesen Gutschein verwenden kann. Standard ist 1 (einmal pro Benutzer)." />
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.userUsageLimit}
                      onChange={(e) => setFormData({ ...formData, userUsageLimit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Targeting */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Zielgruppen
                    <HelpTooltip content="Bestimmen Sie, auf welche Produkte, Kategorien oder Benutzer dieser Gutschein angewendet werden kann. Sie können den Gutschein auf den gesamten Shop oder auf spezifische Kategorien/Produkte/Benutzer beschränken." />
                  </h3>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="applyToAll"
                      checked={formData.applyToAll}
                      onChange={(e) => setFormData({ ...formData, applyToAll: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <label htmlFor="applyToAll" className="text-sm text-gray-700 flex items-center gap-2">
                      Auf gesamten Shop anwenden
                      <HelpTooltip content="Wenn aktiviert, kann der Gutschein auf alle Produkte im Shop angewendet werden. Wenn deaktiviert, können Sie spezifische Kategorien, Produkte oder Benutzer auswählen." />
                    </label>
                  </div>

                  {!formData.applyToAll && (
                    <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                      {/* Categories */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kategoriler
                        </label>
                        <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                          {categories.map((cat) => (
                            <label key={cat.id} className="flex items-center gap-2 py-1">
                              <input
                                type="checkbox"
                                checked={formData.categoryIds.includes(cat.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      categoryIds: [...formData.categoryIds, cat.id],
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      categoryIds: formData.categoryIds.filter((id) => id !== cat.id),
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-green-600 rounded"
                              />
                              <span className="text-sm text-gray-700">{cat.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Products */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Produkte
                        </label>
                        <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                          {products.map((prod) => (
                            <label key={prod.id} className="flex items-center gap-2 py-1">
                              <input
                                type="checkbox"
                                checked={formData.productIds.includes(prod.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      productIds: [...formData.productIds, prod.id],
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      productIds: formData.productIds.filter((id) => id !== prod.id),
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-green-600 rounded"
                              />
                              <span className="text-sm text-gray-700">{prod.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Users */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personenbezogen (Optional)
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {users.map((user) => (
                        <label key={user.id} className="flex items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            checked={formData.userIds.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  userIds: [...formData.userIds, user.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  userIds: formData.userIds.filter((id) => id !== user.id),
                                });
                              }
                            }}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <span className="text-sm text-gray-700">
                            {user.firstName} {user.lastName} ({user.email})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700 flex items-center gap-2">
                    Aktiv
                    <HelpTooltip content="Nur aktive Gutscheine können von Kunden verwendet werden. Inaktive Gutscheine sind gesperrt und werden beim Checkout nicht akzeptiert." />
                  </label>
                </div>

                {/* Submit */}
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
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    {editingCoupon ? 'Aktualisieren' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Coupons;

