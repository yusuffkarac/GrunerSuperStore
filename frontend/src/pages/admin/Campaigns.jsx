import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiFilter, FiCheck, FiXCircle, FiImage, FiTag, FiCalendar } from 'react-icons/fi';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { de } from 'date-fns/locale';
import campaignService from '../../services/campaignService';
import adminService from '../../services/adminService';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import FileUpload from '../../components/common/FileUpload';
import { cleanRequestData } from '../../utils/requestUtils';
import HelpTooltip from '../../components/common/HelpTooltip';
import Switch from '../../components/common/Switch';
import MultipleSelect from '../../components/common/MultipleSelect';
import { useModalScroll } from '../../hooks/useModalScroll';

function Campaigns() {
  const { showConfirm } = useAlert();
  const { themeColors } = useTheme();
  const [campaigns, setCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Modal scroll yönetimi
  useModalScroll(showModal);

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    type: 'PERCENTAGE',
    discountPercent: '',
    discountAmount: '',
    buyQuantity: '',
    getQuantity: '',
    startDate: null,
    endDate: null,
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    priority: '0',
    applyToAll: true,
    categoryIds: [],
    productIds: [],
    isActive: true,
  });

  // Verileri yükle
  useEffect(() => {
    loadCampaigns();
    loadCategories();
    loadProducts();
  }, [searchQuery, typeFilter, isActiveFilter]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.type = typeFilter;
      if (isActiveFilter !== '') params.isActive = isActiveFilter === 'true';

      const response = await campaignService.getAllCampaigns(params);
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      toast.error('Kampanyalar yüklenemedi');
      console.error('Kampanya yükleme hatası:', error);
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

  // Modal aç/kapat
  const openModal = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name || '',
        slug: campaign.slug || '',
        description: campaign.description || '',
        imageUrl: campaign.imageUrl || '',
        type: campaign.type || 'PERCENTAGE',
        discountPercent: campaign.discountPercent || '',
        discountAmount: campaign.discountAmount || '',
        buyQuantity: campaign.buyQuantity || '',
        getQuantity: campaign.getQuantity || '',
        startDate: campaign.startDate ? new Date(campaign.startDate) : null,
        endDate: campaign.endDate ? new Date(campaign.endDate) : null,
        minPurchase: campaign.minPurchase || '',
        maxDiscount: campaign.maxDiscount || '',
        usageLimit: campaign.usageLimit || '',
        priority: campaign.priority?.toString() || '0',
        applyToAll: campaign.applyToAll || false,
        categoryIds: campaign.categoryIds || [],
        productIds: campaign.productIds || [],
        isActive: campaign.isActive !== undefined ? campaign.isActive : true,
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        imageUrl: '',
        type: 'PERCENTAGE',
        discountPercent: '',
        discountAmount: '',
        buyQuantity: '',
        getQuantity: '',
        startDate: null,
        endDate: null,
        minPurchase: '',
        maxDiscount: '',
        usageLimit: '',
        priority: '0',
        applyToAll: true,
        categoryIds: [],
        productIds: [],
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCampaign(null);
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Type'a göre sadece gerekli discount alanını ekle
      const submitData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        imageUrl: formData.imageUrl || null,
        type: formData.type,
        buyQuantity: formData.buyQuantity ? parseInt(formData.buyQuantity) : null,
        getQuantity: formData.getQuantity ? parseInt(formData.getQuantity) : null,
        startDate: formData.startDate ? formData.startDate.toISOString().split('T')[0] : null,
        endDate: formData.endDate ? formData.endDate.toISOString().split('T')[0] : null,
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : null,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        priority: parseInt(formData.priority) || 0,
        applyToAll: formData.applyToAll,
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

      if (editingCampaign) {
        await campaignService.updateCampaign(editingCampaign.id, cleanedData);
        toast.success('Kampagne erfolgreich aktualisiert');
      } else {
        await campaignService.createCampaign(cleanedData);
        toast.success('Kampagne erfolgreich erstellt');
      }

      closeModal();
      loadCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern');
      console.error('Kampanya kaydetme hatası:', error);
    }
  };

  // Kampanya sil
  const handleDelete = async (campaign) => {
    const confirmed = await showConfirm(
      `"${campaign.name}" wirklich löschen?`,
      { title: 'Kampagne löschen' }
    );

    if (confirmed) {
      try {
        await campaignService.deleteCampaign(campaign.id);
        toast.success('Kampagne erfolgreich gelöscht');
        loadCampaigns();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Fehler beim Löschen');
      }
    }
  };

  // Slug oluştur
  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

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
    setTypeFilter('');
    setIsActiveFilter('');
  };

  // Kampanya tipi label
  const getCampaignTypeLabel = (type) => {
    const labels = {
      PERCENTAGE: 'Prozent',
      FIXED_AMOUNT: 'Fester Betrag',
      BUY_X_GET_Y: 'X kaufen Y zahlen',
      FREE_SHIPPING: 'Kostenloser Versand',
    };
    return labels[type] || type;
  };

  if (loading && campaigns.length === 0) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen @ pb-20">
      {/* Header */}
      <div className="shadow-sm sticky top-0 z-10">
        <div className=" mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Kampagnen
              <HelpTooltip content="Erstellen und verwalten Sie zeitlich begrenzte Rabattaktionen für Ihre Produkte." />
            </h1>
            <button
              onClick={() => openModal()}
              className="text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-sm whitespace-nowrap"
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
              <FiPlus className="w-4 h-4" />
              <span>Neue Kampagne</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Kampagnen suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <FiFilter className="w-4 h-4" />
              <span>Filter {(typeFilter || isActiveFilter) && `(${[typeFilter, isActiveFilter].filter(Boolean).length})`}</span>
            </button>

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
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Alle Typen</option>
                      <option value="PERCENTAGE">Prozent</option>
                      <option value="FIXED_AMOUNT">Fester Betrag</option>
                      <option value="BUY_X_GET_Y">X kaufen Y zahlen</option>
                      <option value="FREE_SHIPPING">Kostenloser Versand</option>
                    </select>

                    <select
                      value={isActiveFilter}
                      onChange={(e) => setIsActiveFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Alle Status</option>
                      <option value="true">Aktiv</option>
                      <option value="false">Inaktiv</option>
                    </select>

                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg"
                    >
                      Filter zurücksetzen
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="mx-auto px-4 py-6">
        {campaigns.length === 0 ? (
          <EmptyState
            icon={FiTag}
            title="Keine Kampagnen gefunden"
            description="Erstellen Sie Ihre erste Kampagne"
            action={{
              label: 'Neue Kampagne',
              onClick: () => openModal(),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <AnimatePresence mode="popLayout">
              {campaigns.map((campaign) => (
                <motion.div
                  key={campaign.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full w-full min-w-0"
                >
                  {/* Campaign Image */}
                  {campaign.imageUrl && (
                    <div className="h-40 bg-gray-200 overflow-hidden flex-shrink-0">
                      <img
                        src={campaign.imageUrl}
                        alt={campaign.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4 flex flex-col flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {getCampaignTypeLabel(campaign.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.isActive ? (
                          <FiCheck className="w-5 h-5 text-green-600" />
                        ) : (
                          <FiXCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {campaign.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{campaign.description}</p>
                    )}

                    {/* Details */}
                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-3 h-3" />
                        <span>
                          {new Date(campaign.startDate).toLocaleDateString('de-DE')} -{' '}
                          {new Date(campaign.endDate).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      {campaign.usageCount > 0 && (
                        <div>Verwendet: {campaign.usageCount}x</div>
                      )}
                      <div>Priorität: {campaign.priority}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => openModal(campaign)}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                        <span>Bearbeiten</span>
                      </button>
                      <button
                        onClick={() => handleDelete(campaign)}
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
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4 mt-0"
            onClick={(e) => {
              // Sadece overlay'e direkt tıklanınca kapat (input selection sırasında kapanmayı önle)
              if (e.target === e.currentTarget) {
                closeModal();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCampaign ? 'Kampagne bearbeiten' : 'Neue Kampagne'}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Beschreibung
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bild
                    </label>
                    <FileUpload
                      value={formData.imageUrl}
                      onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                      folder="campaigns"
                      maxFiles={1}
                    />
                  </div>
                </div>

                {/* Campaign Type & Discount */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-gray-900">Rabatt</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kampagnentyp *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="PERCENTAGE">Prozentrabatt</option>
                      <option value="FIXED_AMOUNT">Fester Betrag</option>
                      <option value="BUY_X_GET_Y">X kaufen Y zahlen</option>
                      <option value="FREE_SHIPPING">Kostenloser Versand</option>
                    </select>
                  </div>

                  {formData.type === 'PERCENTAGE' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rabatt (%) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        inputMode="decimal"
                        value={formData.discountPercent}
                        onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  )}

                  {formData.type === 'FIXED_AMOUNT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rabattbetrag (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={formData.discountAmount}
                        onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  )}

                  {formData.type === 'BUY_X_GET_Y' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kaufen (X) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={formData.buyQuantity}
                          onChange={(e) => setFormData({ ...formData, buyQuantity: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Zahlen (Y) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={formData.getQuantity}
                          onChange={(e) => setFormData({ ...formData, getQuantity: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-gray-900">Zeitraum</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Startdatum *
                      </label>
                      <DatePicker
                        selected={formData.startDate}
                        onChange={(date) => setFormData({ ...formData, startDate: date })}
                        dateFormat="dd/MM/yyyy"
                        locale={de}
                        placeholderText="dd/MM/yyyy"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        wrapperClassName="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enddatum *
                      </label>
                      <DatePicker
                        selected={formData.endDate}
                        onChange={(date) => setFormData({ ...formData, endDate: date })}
                        dateFormat="dd/MM/yyyy"
                        locale={de}
                        placeholderText="dd/MM/yyyy"
                        minDate={formData.startDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        wrapperClassName="w-full"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Targeting */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-gray-900">Zielgruppe</h3>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="applyToAll"
                      checked={formData.applyToAll}
                      onChange={(e) => setFormData({ ...formData, applyToAll: e.target.checked })}
                      color="green"
                    />
                    <label htmlFor="applyToAll" className="text-sm font-medium text-gray-700">
                      Für den gesamten Shop anwenden
                    </label>
                  </div>

                  {!formData.applyToAll && (
                    <>
                      <MultipleSelect
                        label="Kategorien"
                        options={categories}
                        value={formData.categoryIds}
                        onChange={(selectedIds) => {
                          setFormData({ ...formData, categoryIds: selectedIds });
                        }}
                        placeholder="Kategorien suchen..."
                        optional={true}
                        maxHeight={200}
                      />

                      <MultipleSelect
                        label="Produkte"
                        options={products}
                        value={formData.productIds}
                        onChange={(selectedIds) => {
                          setFormData({ ...formData, productIds: selectedIds });
                        }}
                        placeholder="Produkte suchen..."
                        optional={true}
                        maxHeight={200}
                        getOptionLabel={(product) => {
                          const barcodeText = product.barcode ? ` [${product.barcode}]` : '';
                          return `${product.name}${barcodeText}`;
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Conditions */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-gray-900">Bedingungen</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mindestbestellwert (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={formData.minPurchase}
                        onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max. Rabatt (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nutzungslimit *
                      </label>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={formData.usageLimit}
                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priorität *
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      color="green"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                      Aktiv
                    </label>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
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
                    {editingCampaign ? 'Aktualisieren' : 'Erstellen'}
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

export default Campaigns;
