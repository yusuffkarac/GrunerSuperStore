import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiFilter, FiPackage, FiCheck, FiXCircle, FiGrid, FiList, FiLayers, FiTrendingUp, FiArchive, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { de } from 'date-fns/locale';
import adminService from '../../services/adminService';
import categoryService from '../../services/categoryService';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import FileUpload from '../../components/common/FileUpload';
import { normalizeImageUrl } from '../../utils/imageUtils';
import { cleanRequestData } from '../../utils/requestUtils';
import HelpTooltip from '../../components/common/HelpTooltip';
import Switch from '../../components/common/Switch';
import BulkPriceUpdateModal from '../../components/admin/BulkPriceUpdateModal';
import { useModalScroll } from '../../hooks/useModalScroll';

const formatDateForApi = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Memoized Product Row Component
const ProductRow = memo(({ product, onEdit, onDelete, onOpenVariants }) => {
  const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
    ? normalizeImageUrl(product.imageUrls[0])
    : null;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-4">
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
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">
        {product.category?.name || '-'}
      </td>
      <td className="px-4 py-4 text-sm font-medium text-gray-900">
        {parseFloat(product.price).toFixed(2)} €
      </td>
      <td className="px-4 py-4">
        <div className="text-sm">
          <span className={product.stock <= (product.lowStockLevel || 0) ? 'text-red-600 font-medium' : 'text-gray-900'}>
            {product.stock}
          </span>
          {product.unit && <span className="text-gray-500 ml-1">/{product.unit}</span>}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-600">
        {product.barcode || '-'}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {product.isActive ? (
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
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
              Empfohlen
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onOpenVariants(product)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Varianten verwalten"
          >
            <FiLayers size={18} />
          </button>
          <button
            onClick={() => onEdit(product)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Bearbeiten"
          >
            <FiEdit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Löschen"
          >
            <FiTrash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
});

ProductRow.displayName = 'ProductRow';

// Memoized Product Card Component (Desktop)
const ProductCardDesktop = memo(({ product, onEdit, onDelete, onOpenVariants }) => {
  const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
    ? normalizeImageUrl(product.imageUrls[0])
    : null;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
          <div className="font-medium text-gray-900 mb-1 truncate">
            {product.name}
          </div>
          <div className="text-sm text-gray-500 mb-2">
            {product.brand ? product.brand : 'Keine Marke'}
          </div>
          <div className="text-lg font-bold text-gray-900 mb-2">
            {parseFloat(product.price).toFixed(2)} €
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {product.isActive ? (
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
            {product.isFeatured && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
                Empfohlen
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {product.category?.name || '-'}
          </div>
          <div className="text-sm">
            <span className={product.stock <= (product.lowStockLevel || 0) ? 'text-red-600 font-medium' : 'text-gray-900'}>
              Lager: {product.stock}
            </span>
            {product.unit && <span className="text-gray-500 ml-1">/{product.unit}</span>}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Barcode: {product.barcode}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={() => onOpenVariants(product)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm border border-purple-200"
        >
          <FiLayers size={16} />
          Varianten
        </button>
        <button
          onClick={() => onEdit(product)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm border border-blue-200"
        >
          <FiEdit2 size={16} />
          Bearbeiten
        </button>
        <button
          onClick={() => onDelete(product)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm border border-red-200"
        >
          <FiTrash2 size={16} />
          Löschen
        </button>
      </div>
    </div>
  );
});

ProductCardDesktop.displayName = 'ProductCardDesktop';

// Memoized Product Card Component (Mobile)
const ProductCardMobile = memo(({ product, onEdit, onDelete, onOpenVariants }) => {
  const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
    ? normalizeImageUrl(product.imageUrls[0])
    : null;

  return (
    <div className="p-4">
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
          <div className="font-medium text-gray-900 mb-1">
            {product.name}
          </div>
          {product.brand && (
            <div className="text-sm text-gray-500 mb-2">{product.brand}</div>
          )}
          <div className="text-lg font-bold text-gray-900 mb-2">
            {parseFloat(product.price).toFixed(2)} €
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {product.isActive ? (
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
            {product.isFeatured && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
                Empfohlen
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Kategorie: {product.category?.name || '-'}
          </div>
          <div className="text-sm">
            <span className={product.stock <= (product.lowStockLevel || 0) ? 'text-red-600 font-medium' : 'text-gray-900'}>
              Lager: {product.stock}
            </span>
            {product.unit && <span className="text-gray-500 ml-1">/{product.unit}</span>}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Barcode: {product.barcode}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenVariants(product)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm border border-purple-200"
        >
          <FiLayers size={16} />
          Varianten
        </button>
        <button
          onClick={() => onEdit(product)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm border border-blue-200"
        >
          <FiEdit2 size={16} />
          Bearbeiten
        </button>
        <button
          onClick={() => onDelete(product)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm border border-red-200"
        >
          <FiTrash2 size={16} />
          Löschen
        </button>
      </div>
    </div>
  );
});

ProductCardMobile.displayName = 'ProductCardMobile';

// Memoized Mobile List Row Component
const ProductMobileRow = memo(({ product, onEdit, onDelete }) => {
  const imageUrl = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
    ? normalizeImageUrl(product.imageUrls[0])
    : null;

  return (
    <div className="py-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
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
            <FiPackage className="text-gray-400" size={18} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900 truncate">
              {product.name}
            </span>
            {product.isActive ? (
              <FiCheck className="text-green-600 flex-shrink-0" size={16} />
            ) : (
              <FiXCircle className="text-gray-400 flex-shrink-0" size={16} />
            )}
            {product.isFeatured && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded flex-shrink-0">
                E
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-xs font-semibold text-gray-900">
              {parseFloat(product.price).toFixed(2)}€
            </span>
            <span className="text-gray-400">•</span>
            <span className={product.stock <= (product.lowStockLevel || 0) ? 'text-red-600' : 'text-gray-600'}>
              {product.stock}
              {product.unit && <span className="text-gray-400">/{product.unit}</span>}
            </span>
            {product.category?.name && (
              <>
                <span className="text-gray-400">•</span>
                <span className="truncate">{product.category.name}</span>
              </>
            )}
            {product.barcode && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-xs text-gray-500 truncate">BC: {product.barcode}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(product)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Bearbeiten"
          >
            <FiEdit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Löschen"
          >
            <FiTrash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
});

ProductMobileRow.displayName = 'ProductMobileRow';

function Produkte() {
  const { showConfirm } = useAlert();
  const { themeColors } = useTheme();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [variantOptions, setVariantOptions] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [globalVariantOptions, setGlobalVariantOptions] = useState([]);
  const [loadingGlobalOptions, setLoadingGlobalOptions] = useState(false);
  const [optionFormMode, setOptionFormMode] = useState('select'); // 'select' veya 'create'
  const [variantOptionValues, setVariantOptionValues] = useState({}); // { optionName: [values] }
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [variantFormData, setVariantFormData] = useState({
    name: '',
    price: '',
    stock: '',
    sku: '',
    imageUrls: [],
    values: {},
  });
  
  // Modal scroll yönetimi - her modal için
  useModalScroll(showModal);
  useModalScroll(showVariantModal);
  useModalScroll(showBulkPriceModal);
  
  // Özel birimler için state (localStorage'dan yükle)
  const [customUnits, setCustomUnits] = useState(() => {
    const saved = localStorage.getItem('produkteCustomUnits');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);
  const [newCustomUnit, setNewCustomUnit] = useState('');
  
  // View mode: 'list' or 'card', stored in localStorage
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('produkteViewMode');
    return saved === 'list' || saved === 'card' ? saved : 'card';
  });

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [isFeaturedFilter, setIsFeaturedFilter] = useState('');
  const [sortBy, setSortBy] = useState(() => {
    const saved = localStorage.getItem('produkteSortBy');
    return saved || 'createdAt';
  });
  const [sortOrder, setSortOrder] = useState(() => {
    const saved = localStorage.getItem('produkteSortOrder');
    return saved || 'desc';
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('produkteItemsPerPage');
    return saved ? parseInt(saved) : 20;
  });
  const [pageInput, setPageInput] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: '',
    stock: '',
    lowStockLevel: '',
    unit: '',
    barcode: '',
    brand: '',
    imageUrls: [],
    isActive: true,
    isFeatured: false,
    showStock: false,
    ingredientsText: '',
    allergens: [],
    nutriscoreGrade: '',
    ecoscoreGrade: '',
    nutritionData: null,
    openfoodfactsCategories: [],
    expiryDate: null,
    hideFromExpiryManagement: false,
  });

  // Verileri yükle fonksiyonları
  const loadCategories = useCallback(async () => {
    try {
      const response = await categoryService.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
      };

      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (isActiveFilter !== '') params.isActive = isActiveFilter === 'true';
      if (isFeaturedFilter !== '') params.isFeatured = isFeaturedFilter === 'true';

      const response = await adminService.getProducts(params);
      setProducts(response.data.products || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Produkte konnten nicht geladen werden');
      console.error('Ürün yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedCategory, isActiveFilter, isFeaturedFilter, sortBy, sortOrder, itemsPerPage]);

  // Verileri yükle
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Modal aç/kapat
  const openModal = useCallback((product = null) => {
    // Sayfayı en üste scroll et
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setShowCustomUnitInput(false);
    setNewCustomUnit('');
    if (product) {
      setEditingProduct(product);
      // ingredientsText varsa description'a da kopyala (eğer description boşsa)
      const description = product.description || product.ingredientsText || '';
      setFormData({
        name: product.name || '',
        description: description,
        categoryId: product.categoryId || '',
        price: parseFloat(product.price) || '',
        stock: product.stock || '',
        lowStockLevel: product.lowStockLevel || '',
        unit: product.unit || '',
        barcode: product.barcode || '',
        brand: product.brand || '',
        imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
        isActive: product.isActive !== undefined ? product.isActive : true,
        isFeatured: product.isFeatured || false,
        showStock: product.showStock !== undefined ? product.showStock : false,
        ingredientsText: product.ingredientsText || '',
        allergens: Array.isArray(product.allergens) ? product.allergens : [],
        nutriscoreGrade: product.nutriscoreGrade || '',
        ecoscoreGrade: product.ecoscoreGrade || '',
        nutritionData: product.nutritionData || null,
        openfoodfactsCategories: Array.isArray(product.openfoodfactsCategories) ? product.openfoodfactsCategories : [],
        expiryDate: product.expiryDate ? new Date(product.expiryDate) : null,
        hideFromExpiryManagement: product.hideFromExpiryManagement || false,
        taxRate: product.taxRate ? parseFloat(product.taxRate) : '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        categoryId: '',
        price: '',
        stock: '',
        lowStockLevel: '',
        unit: '',
        barcode: '',
        brand: '',
        imageUrls: [],
        isActive: true,
        isFeatured: false,
        showStock: false,
        ingredientsText: '',
        allergens: [],
        nutriscoreGrade: '',
        ecoscoreGrade: '',
        nutritionData: null,
        openfoodfactsCategories: [],
        expiryDate: null,
        hideFromExpiryManagement: false,
        taxRate: '',
      });
    }
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingProduct(null);
    setShowCustomUnitInput(false);
    setNewCustomUnit('');
  }, []);

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // HTML5 validasyonunu kontrol et
    const form = e.target;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    try {
      const submitData = {
        name: formData.name,
        description: formData.description || null,
        categoryId: formData.categoryId || null,
        price: parseFloat(formData.price),
        lowStockLevel: formData.lowStockLevel ? parseInt(formData.lowStockLevel) : null,
        unit: formData.unit || null,
        barcode: formData.barcode || null,
        brand: formData.brand || null,
        imageUrls: formData.imageUrls.length > 0 ? formData.imageUrls : null,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        showStock: formData.showStock,
        ingredientsText: formData.ingredientsText || null,
        allergens: formData.allergens && formData.allergens.length > 0 ? formData.allergens : null,
        nutriscoreGrade: formData.nutriscoreGrade || null,
        ecoscoreGrade: formData.ecoscoreGrade || null,
        nutritionData: formData.nutritionData || null,
        openfoodfactsCategories: formData.openfoodfactsCategories && formData.openfoodfactsCategories.length > 0 ? formData.openfoodfactsCategories : null,
        expiryDate: formatDateForApi(formData.expiryDate),
        hideFromExpiryManagement: formData.hideFromExpiryManagement,
        taxRate: formData.taxRate ? parseFloat(formData.taxRate) : null,
      };

      // Stock alanını sadece geçerli bir değer varsa ekle
      if (formData.stock !== undefined && formData.stock !== null && formData.stock !== '') {
        const stockValue = parseInt(formData.stock);
        if (!isNaN(stockValue) && stockValue >= 0) {
          submitData.stock = stockValue;
        }
      }

      // Boş string'leri, null ve undefined değerleri temizle
      const cleanedData = cleanRequestData(submitData);

      if (editingProduct) {
        await adminService.updateProduct(editingProduct.id, cleanedData);
        toast.success('Produkt erfolgreich aktualisiert');
      } else {
        await adminService.createProduct(cleanedData);
        toast.success('Produkt erfolgreich erstellt');
      }

      closeModal();
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern');
      console.error('Ürün kaydetme hatası:', error);
    }
  };

  // Ürün sil
  const handleDelete = useCallback(async (product) => {
    const confirmed = await showConfirm(
      `Möchten Sie "${product.name}" wirklich löschen?`,
      { title: 'Produkt löschen' }
    );

    if (confirmed) {
      try {
        await adminService.deleteProduct(product.id);
        toast.success('Produkt erfolgreich gelöscht');
        loadProducts();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Fehler beim Löschen');
      }
    }
  }, [showConfirm, loadProducts]);

  // Varyant modal aç
  const openVariantModal = useCallback(async (product) => {
    setSelectedProductForVariants(product);
    setShowVariantModal(true);
    setLoadingVariants(true);
    try {
      const [optionsRes, variantsRes] = await Promise.all([
        adminService.getVariantOptions(product.id),
        adminService.getProductVariants(product.id),
      ]);
      setVariantOptions(optionsRes.data.options || []);
      setVariants(variantsRes.data.variants || []);
    } catch (error) {
      toast.error('Varianten konnten nicht geladen werden');
      console.error('Varyant yükleme hatası:', error);
    } finally {
      setLoadingVariants(false);
    }
  }, []);

  const closeVariantModal = () => {
    setShowVariantModal(false);
    setSelectedProductForVariants(null);
    setVariantOptions([]);
    setVariants([]);
    setShowVariantForm(false);
    setShowOptionForm(false);
    setEditingVariant(null);
    setVariantFormData({
      name: '',
      price: '',
      stock: '',
      sku: '',
      imageUrls: [],
      values: {},
    });
  };

  // Varyant seçeneği form aç
  const openOptionForm = async () => {
    setShowOptionForm(true);
    setOptionFormMode('select');
    setLoadingGlobalOptions(true);
    try {
      const response = await adminService.getAllVariantOptionNames();
      setGlobalVariantOptions(response.data?.options || []);
    } catch (error) {
      console.error('Global varyant seçenekleri yüklenemedi:', error);
      setGlobalVariantOptions([]);
    } finally {
      setLoadingGlobalOptions(false);
    }
  };

  const closeOptionForm = () => {
    setShowOptionForm(false);
    setOptionFormMode('select');
    setGlobalVariantOptions([]);
  };

  // Varyant form aç
  const openVariantForm = async (variant = null) => {
    // Her varyant seçeneği için daha önce kullanılmış değerleri yükle
    const valuesMap = {};
    for (const option of variantOptions) {
      try {
        const response = await adminService.getVariantOptionValues(option.name);
        valuesMap[option.name] = response.data?.values || [];
      } catch (error) {
        console.error(`Varyant seçeneği değerleri yüklenemedi (${option.name}):`, error);
        valuesMap[option.name] = [];
      }
    }
    setVariantOptionValues(valuesMap);

    if (variant) {
      // Düzenleme modu
      const valuesObj = {};
      if (variant.values && variant.values.length > 0) {
        variant.values.forEach((v) => {
          valuesObj[v.optionId] = v.value;
        });
      }
      setVariantFormData({
        name: variant.name || '',
        price: parseFloat(variant.price) || '',
        stock: variant.stock || '',
        sku: variant.sku || '',
        imageUrls: Array.isArray(variant.imageUrls) ? variant.imageUrls : [],
        values: valuesObj,
      });
      setEditingVariant(variant);
    } else {
      // Yeni varyant
      const valuesObj = {};
      variantOptions.forEach((opt) => {
        valuesObj[opt.id] = '';
      });
      setVariantFormData({
        name: '',
        price: '',
        stock: '',
        sku: '',
        imageUrls: [],
        values: valuesObj,
      });
      setEditingVariant(null);
    }
    setShowVariantForm(true);
  };

  const closeVariantForm = () => {
    setShowVariantForm(false);
    setEditingVariant(null);
    setVariantFormData({
      name: '',
      price: '',
      stock: '',
      sku: '',
      imageUrls: [],
      values: {},
    });
  };

  // Mevcut bir varyant seçeneğini ürüne ekle
  const handleSelectExistingOption = async (optionName) => {
    try {
      await adminService.createVariantOption(selectedProductForVariants.id, {
        name: optionName,
        displayOrder: 0,
      });
      toast.success('Varyant seçeneği eklendi');
      closeOptionForm();
      openVariantModal(selectedProductForVariants);
    } catch (error) {
      toast.error('Hata: ' + (error.response?.data?.message || 'Bilinmeyen hata'));
    }
  };

  // Varyant seçeneği kaydet
  const handleSaveOption = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('optionName');
    const displayOrder = parseInt(formData.get('displayOrder')) || 0;

    try {
      await adminService.createVariantOption(selectedProductForVariants.id, {
        name,
        displayOrder,
      });
      toast.success('Varyant seçeneği eklendi');
      closeOptionForm();
      openVariantModal(selectedProductForVariants);
    } catch (error) {
      toast.error('Hata: ' + (error.response?.data?.message || 'Bilinmeyen hata'));
    }
  };

  // Varyant kaydet
  const handleSaveVariant = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const price = parseFloat(formData.get('price'));
    const stock = parseInt(formData.get('stock'));
    const sku = formData.get('sku') || null;

    // Her seçenek için değer al
    const values = [];
    const valueParts = []; // Varyant adını oluşturmak için
    for (const option of variantOptions) {
      const value = formData.get(`value_${option.id}`);
      if (!value) {
        toast.error(`"${option.name}" için değer girmelisiniz`);
        return;
      }
      values.push({
        optionId: option.id,
        value: value,
      });
      valueParts.push(value);
    }

    // Varyant adını otomatik oluştur (örn: "Kırmızı - S" veya "Mavi - M")
    const name = valueParts.join(' - ');

    try {
      if (editingVariant) {
        await adminService.updateVariant(editingVariant.id, {
          name,
          price,
          stock,
          sku,
          imageUrls: variantFormData.imageUrls,
          values,
        });
        toast.success('Varyant güncellendi');
      } else {
        await adminService.createVariant(selectedProductForVariants.id, {
          name,
          price,
          stock,
          sku,
          imageUrls: variantFormData.imageUrls,
          values,
        });
        toast.success('Varyant eklendi');
      }
      closeVariantForm();
      openVariantModal(selectedProductForVariants);
    } catch (error) {
      toast.error('Hata: ' + (error.response?.data?.message || 'Bilinmeyen hata'));
    }
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setIsActiveFilter('');
    setIsFeaturedFilter('');
    setCurrentPage(1);
  };

  // Aktif filtre sayısı
  const activeFilterCount = useMemo(() => [
    searchQuery,
    selectedCategory,
    isActiveFilter !== '',
    isFeaturedFilter !== '',
  ].filter(Boolean).length, [searchQuery, selectedCategory, isActiveFilter, isFeaturedFilter]);

  // Kategori seçeneklerini memoize et
  const categoryOptions = useMemo(() => categories.map((cat) => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  )), [categories]);

  // Filtre toggle handler
  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  // Filtre değişiklik handler'ları
  const handleCategoryChange = useCallback((e) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleActiveFilterChange = useCallback((e) => {
    setIsActiveFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleFeaturedFilterChange = useCallback((e) => {
    setIsFeaturedFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((e) => {
    const [field, order] = e.target.value.split('-');
    setSortBy(field);
    setSortOrder(order);
    localStorage.setItem('produkteSortBy', field);
    localStorage.setItem('produkteSortOrder', order);
    setCurrentPage(1);
  }, []);

  // Kolon başlığına tıklanınca sıralama yap
  const handleColumnSort = useCallback((column) => {
    let newSortBy = column;
    let newSortOrder;
    // Eğer aynı kolona tıklanırsa sıralama yönünü değiştir
    if (sortBy === column) {
      newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newSortOrder);
    } else {
      // Yeni kolona geçildiğinde varsayılan olarak artan sıralama
      newSortOrder = 'asc';
      setSortBy(column);
      setSortOrder(newSortOrder);
    }
    // localStorage'a kaydet
    localStorage.setItem('produkteSortBy', newSortBy);
    localStorage.setItem('produkteSortOrder', newSortOrder);
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  // View mode handler
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem('produkteViewMode', mode);
  }, []);

  // Items per page handler
  const handleItemsPerPageChange = useCallback((value) => {
    const newItemsPerPage = parseInt(value);
    setItemsPerPage(newItemsPerPage);
    localStorage.setItem('produkteItemsPerPage', newItemsPerPage.toString());
    setCurrentPage(1); // Sayfa başına ürün sayısı değiştiğinde ilk sayfaya dön
  }, []);

  // Sayfa numarası input handler
  const handlePageInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 1 && parseInt(value) <= totalPages)) {
      setPageInput(value);
    }
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    if (pageInput && pageInput !== '') {
      const page = parseInt(pageInput);
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        setPageInput('');
      }
    }
  };

  // Sayfa numarasına git
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput('');
    }
  };

  // Sayfa değiştiğinde input'u temizle
  useEffect(() => {
    setPageInput('');
  }, [currentPage]);

  // Özel birim ekleme fonksiyonu
  const handleAddCustomUnit = useCallback(() => {
    if (newCustomUnit.trim() && !customUnits.includes(newCustomUnit.trim())) {
      const updatedUnits = [...customUnits, newCustomUnit.trim()];
      setCustomUnits(updatedUnits);
      localStorage.setItem('produkteCustomUnits', JSON.stringify(updatedUnits));
      setFormData({ ...formData, unit: newCustomUnit.trim() });
      setNewCustomUnit('');
      setShowCustomUnitInput(false);
      toast.success('Özel birim eklendi');
    } else if (customUnits.includes(newCustomUnit.trim())) {
      toast.error('Bu birim zaten mevcut');
    }
  }, [customUnits, newCustomUnit, formData]);

  // Birim değişikliği handler'ı
  const handleUnitChange = useCallback((e) => {
    const value = e.target.value;
    if (value === '__custom__') {
      setShowCustomUnitInput(true);
      setNewCustomUnit('');
    } else {
      setFormData({ ...formData, unit: value });
      setShowCustomUnitInput(false);
    }
  }, [formData]);

  // Memoized product handlers
  const handleEditProduct = useCallback((product) => {
    openModal(product);
  }, [openModal]);

  const handleDeleteProduct = useCallback((product) => {
    handleDelete(product);
  }, [handleDelete]);

  const handleOpenVariants = useCallback((product) => {
    openVariantModal(product);
  }, [openVariantModal]);

  if (loading && products.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            Produkte
            <HelpTooltip content="Verwalten Sie Ihr Produktsortiment: Produkte hinzufügen, bearbeiten, Preise aktualisieren und Lagerbestände überwachen." />
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {total} {total === 1 ? 'Produkt' : 'Produkte'} insgesamt
          </p>
        </div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={() => navigate('/admin/bulk-price-updates')}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm w-full sm:w-auto"
          >
            <FiArchive className="w-4 h-4" />
            <span>Massenaktualisierungen</span>
          </button>
          <button
            onClick={() => setShowBulkPriceModal(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto"
          >
            <FiTrendingUp className="w-4 h-4" />
            <span>Preise aktualisieren</span>
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-white rounded-lg transition-colors text-sm w-full sm:w-auto"
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
            <span>Neues Produkt</span>
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
            placeholder="Produkte suchen..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Filter Toggle & View Mode */}
        <div className="flex items-center justify-between">
          <button
            onClick={toggleFilters}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <FiFilter size={18} />
            Filter {activeFilterCount > 0 && (
              <span 
                className="text-white text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: themeColors?.primary?.[600] || '#16a34a'
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={viewMode === 'list' ? {
                  backgroundColor: themeColors?.primary?.[600] || '#16a34a'
                } : {}}
                title="Listenansicht"
              >
                <FiList size={18} />
              </button>
              <button
                onClick={() => handleViewModeChange('card')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'card'
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={viewMode === 'card' ? {
                  backgroundColor: themeColors?.primary?.[600] || '#16a34a'
                } : {}}
                title="Kartenansicht"
              >
                <FiGrid size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 animate-fade-in">
            {/* Kategori */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategorie
              </label>
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition-all"
              >
                <option value="">Alle</option>
                {categoryOptions}
              </select>
            </div>

            {/* Aktif/Pasif */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={isActiveFilter}
                onChange={handleActiveFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition-all"
              >
                <option value="">Alle</option>
                <option value="true">Aktiv</option>
                <option value="false">Inaktiv</option>
              </select>
            </div>

            {/* Featured */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empfohlen
              </label>
              <select
                value={isFeaturedFilter}
                onChange={handleFeaturedFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition-all"
              >
                <option value="">Alle</option>
                <option value="true">Empfohlen</option>
                <option value="false">Nicht empfohlen</option>
              </select>
            </div>

            {/* Sortierung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sortierung
              </label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={handleSortChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition-all"
              >
                <option value="createdAt-desc">Neueste zuerst</option>
                <option value="createdAt-asc">Älteste zuerst</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="price-asc">Preis: Niedrig-Hoch</option>
                <option value="price-desc">Preis: Hoch-Niedrig</option>
                <option value="stock-asc">Lagerbestand: Niedrig-Hoch</option>
                <option value="stock-desc">Lagerbestand: Hoch-Niedrig</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Products Table/Cards */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse">Lädt...</div>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={FiPackage}
            title="Keine Produkte gefunden"
            message="Erstellen Sie Ihr erstes Produkt oder passen Sie die Filter an."
          />
        ) : (
          <>
            {/* Desktop Table View */}
            {viewMode === 'list' && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleColumnSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Produkt
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? <FiChevronUp size={14} className="text-green-600" /> : <FiChevronDown size={14} className="text-green-600" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleColumnSort('categoryId')}
                    >
                      <div className="flex items-center gap-2">
                        Kategorie
                        {sortBy === 'categoryId' && (
                          sortOrder === 'asc' ? <FiChevronUp size={14} className="text-green-600" /> : <FiChevronDown size={14} className="text-green-600" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleColumnSort('price')}
                    >
                      <div className="flex items-center gap-2">
                        Preis
                        {sortBy === 'price' && (
                          sortOrder === 'asc' ? <FiChevronUp size={14} className="text-green-600" /> : <FiChevronDown size={14} className="text-green-600" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleColumnSort('stock')}
                    >
                      <div className="flex items-center gap-2">
                      Bestand
                        {sortBy === 'stock' && (
                          sortOrder === 'asc' ? <FiChevronUp size={14} className="text-green-600" /> : <FiChevronDown size={14} className="text-green-600" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleColumnSort('barcode')}
                    >
                      <div className="flex items-center gap-2">
                        Barcode
                        {sortBy === 'barcode' && (
                          sortOrder === 'asc' ? <FiChevronUp size={14} className="text-green-600" /> : <FiChevronDown size={14} className="text-green-600" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleColumnSort('isActive')}
                    >
                      <div className="flex items-center gap-2">
                        Status
                        {sortBy === 'isActive' && (
                          sortOrder === 'asc' ? <FiChevronUp size={14} className="text-green-600" /> : <FiChevronDown size={14} className="text-green-600" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                      onOpenVariants={handleOpenVariants}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Desktop Card View */}
            {viewMode === 'card' && (
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {products.map((product) => (
                  <ProductCardDesktop
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    onOpenVariants={handleOpenVariants}
                  />
                ))}
              </div>
            )}

            {/* Mobile Cards (when card view selected) */}
            {viewMode === 'card' && (
            <div className="md:hidden divide-y divide-gray-200">
              {products.map((product) => (
                <ProductCardMobile
                  key={product.id}
                  product={product}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onOpenVariants={handleOpenVariants}
                />
              ))}
            </div>
            )}

            {/* Mobile List View (when list view selected) - Compact */}
            {viewMode === 'list' && (
              <div className="md:hidden divide-y divide-gray-100">
                {products.map((product) => (
                  <ProductMobileRow
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Sol taraf - Sayfa bilgisi ve items per page */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-sm text-gray-700">
                  Seite {currentPage} von {totalPages} ({total} {total === 1 ? 'Produkt' : 'Produkte'})
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 whitespace-nowrap">
                    Pro Seite:
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>

              {/* Sağ taraf - Sayfa navigasyonu */}
              <div className="flex items-center gap-2">
                {/* Geri butonu */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Zurück
                </button>

                {/* Sayfa numaraları */}
                <div className="flex items-center gap-1">
                  {/* Mevcut sayfa etrafındaki sayfalar */}
                  {(() => {
                    const pages = [];
                    if (totalPages <= 7) {
                      // 7 veya daha az sayfa varsa hepsini göster
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Daha fazla sayfa varsa akıllı gösterim
                      // İlk sayfa her zaman gösterilir
                      pages.push(1);
                      
                      // Mevcut sayfa etrafındaki sayfaları belirle
                      let start = Math.max(2, currentPage - 1);
                      let end = Math.min(totalPages - 1, currentPage + 1);
                      
                      // Eğer mevcut sayfa 1 veya 2 ise, başlangıcı ayarla
                      if (currentPage <= 2) {
                        start = 2;
                        end = Math.min(4, totalPages - 1);
                      }
                      
                      // Eğer mevcut sayfa son sayfaya yakınsa, bitişi ayarla
                      if (currentPage >= totalPages - 1) {
                        start = Math.max(2, totalPages - 3);
                        end = totalPages - 1;
                      }
                      
                      // Eğer başlangıç 1'den uzaksa ellipsis ekle
                      if (start > 2) {
                        pages.push('...');
                      }
                      
                      // Mevcut sayfa etrafındaki sayfalar (1 ve totalPages hariç)
                      for (let i = start; i <= end; i++) {
                        if (i !== 1 && i !== totalPages) {
                          pages.push(i);
                        }
                      }
                      
                      // Eğer bitiş son sayfadan uzaksa ellipsis ekle
                      if (end < totalPages - 1) {
                        pages.push('...');
                      }
                      
                      // Son sayfa her zaman gösterilir
                      pages.push(totalPages);
                    }
                    
                    return pages.map((page, index) => {
                      if (page === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-1 border rounded-lg text-sm transition-colors ${
                            currentPage === page
                              ? 'text-white'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                          style={currentPage === page ? {
                            backgroundColor: themeColors?.primary?.[600] || '#16a34a',
                            borderColor: themeColors?.primary?.[600] || '#16a34a'
                          } : {}}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* İleri butonu */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Weiter
                </button>

                {/* Sayfa numarası input */}
                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={pageInput}
                    onChange={handlePageInputChange}
                    placeholder="Sayfa"
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 text-white rounded-lg text-sm"
                    style={{
                      backgroundColor: themeColors?.primary?.[600] || '#16a34a'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = themeColors?.primary?.[700] || '#15803d';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = themeColors?.primary?.[600] || '#16a34a';
                    }}
                    title="Sayfaya git"
                  >
                    →
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
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
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Beschreibung
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Category & Price Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kategorie *
                      </label>
                      <select
                        required
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Wählen...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preis (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0"
                        inputMode="decimal"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  {/* Stock & Unit Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lagerbestand *
                      </label>
                      <input
                        type="number"
                        name="stock"
                        
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        onInvalid={(e) => {
                          e.target.setCustomValidity('Lagerbestand ist ein Pflichtfeld');
                        }}
                        onInput={(e) => {
                          e.target.setCustomValidity('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      <div className="mt-2">
                        <Switch
                          id="showStock"
                          checked={formData.showStock}
                          onChange={(e) => setFormData({ ...formData, showStock: e.target.checked })}
                          label="Lagerbestand für Nutzer anzeigen"
                          color="green"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Einheit
                      </label>
                      <select
                        value={formData.unit || ''}
                        onChange={handleUnitChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Keine Einheit</option>
                        <option value="Kg">Kg</option>
                        <option value="Gr">Gr</option>
                        <option value="Stk">Stk</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                        {customUnits.length > 0 && (
                          <>
                            <option disabled>--- Benutzerdefinierte Einheiten ---</option>
                            {customUnits.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </>
                        )}
                        <option value="__custom__">+ Neue Einheit hinzufügen</option>
                      </select>
                      {showCustomUnitInput && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={newCustomUnit}
                            onChange={(e) => setNewCustomUnit(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomUnit();
                              }
                            }}
                            placeholder="Neue Einheit eingeben"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomUnit}
                            className="px-4 py-2 text-white rounded-lg transition-colors"
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
                            Hinzufügen
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomUnitInput(false);
                              setNewCustomUnit('');
                              setFormData({ ...formData, unit: '' });
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Abbrechen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Low Stock Level & Barcode */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Niedrige Lagerbestand
                      </label>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={formData.lowStockLevel}
                        onChange={(e) => setFormData({ ...formData, lowStockLevel: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Barcode
                      </label>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marke
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Mehrwertsteuersatz */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mehrwertsteuersatz (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                      placeholder="z.B. 19.00 (für 19%)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Geben Sie den Mehrwertsteuersatz in Prozent an (z.B. 19.00 = 19%)
                    </p>
                  </div>

                  {/* Son Kullanma Tarihi (SKT) */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Mindesthaltbarkeitsdatum (MHD)</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          MHD-Datum
                        </label>
                        <DatePicker
                          selected={formData.expiryDate}
                          onChange={(date) => setFormData({ ...formData, expiryDate: date })}
                          dateFormat="dd/MM/yyyy"
                          locale={de}
                          placeholderText="dd/MM/yyyy"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          wrapperClassName="w-full"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Geben Sie das Mindesthaltbarkeitsdatum des Produkts ein (optional)
                        </p>
                      </div>
                      <div>
                        <Switch
                          id="hideFromExpiryManagement"
                          checked={formData.hideFromExpiryManagement}
                          onChange={(e) => setFormData({ ...formData, hideFromExpiryManagement: e.target.checked })}
                          label="Von MHD-Verwaltung ausschließen"
                          color="green"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Dieses Produkt wird in der MHD-Verwaltungsseite nicht angezeigt
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ingredients Text */}
                  {formData.ingredientsText && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Inhaltsstoffe (OpenFoodFacts)
                      </label>
                      <textarea
                        value={formData.ingredientsText}
                        onChange={(e) => setFormData({ ...formData, ingredientsText: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-50"
                        placeholder="Von OpenFoodFacts importiert"
                      />
                    </div>
                  )}

                  {/* Allergens */}
                  {formData.allergens && formData.allergens.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allergene
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {formData.allergens.map((allergen, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={formData.allergens.join(', ')}
                        onChange={(e) => {
                          const allergens = e.target.value.split(',').map(a => a.trim()).filter(a => a);
                          setFormData({ ...formData, allergens });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mt-2"
                        placeholder="Komma-getrennt eingeben"
                      />
                    </div>
                  )}

                  {/* Nutri-Score & Eco-Score */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nutri-Score
                      </label>
                      <div className="flex items-center gap-2">
                        {formData.nutriscoreGrade && (
                          <span className={`text-2xl font-bold ${
                            formData.nutriscoreGrade === 'a' ? 'text-green-600' :
                            formData.nutriscoreGrade === 'b' ? 'text-lime-600' :
                            formData.nutriscoreGrade === 'c' ? 'text-yellow-600' :
                            formData.nutriscoreGrade === 'd' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {formData.nutriscoreGrade.toUpperCase()}
                          </span>
                        )}
                        <select
                          value={formData.nutriscoreGrade || ''}
                          onChange={(e) => setFormData({ ...formData, nutriscoreGrade: e.target.value || null })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Keine Auswahl</option>
                          <option value="a">A</option>
                          <option value="b">B</option>
                          <option value="c">C</option>
                          <option value="d">D</option>
                          <option value="e">E</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Eco-Score
                      </label>
                      <div className="flex items-center gap-2">
                        {formData.ecoscoreGrade && (
                          <span className={`text-2xl font-bold ${
                            formData.ecoscoreGrade === 'a' ? 'text-green-600' :
                            formData.ecoscoreGrade === 'b' ? 'text-lime-600' :
                            formData.ecoscoreGrade === 'c' ? 'text-yellow-600' :
                            formData.ecoscoreGrade === 'd' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {formData.ecoscoreGrade.toUpperCase()}
                          </span>
                        )}
                        <select
                          value={formData.ecoscoreGrade || ''}
                          onChange={(e) => setFormData({ ...formData, ecoscoreGrade: e.target.value || null })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Keine Auswahl</option>
                          <option value="a">A</option>
                          <option value="b">B</option>
                          <option value="c">C</option>
                          <option value="d">D</option>
                          <option value="e">E</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Nutrition Data */}
                  {formData.nutritionData && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nährwertinformationen
                      </label>
                      <div className="bg-gray-50 p-4 rounded-lg text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          {formData.nutritionData.energyKcal && (
                            <div>
                              <span className="font-medium">Energie:</span> {formData.nutritionData.energyKcal} {formData.nutritionData.energyKcalUnit || 'kcal'}
                            </div>
                          )}
                          {formData.nutritionData.proteins !== undefined && (
                            <div>
                              <span className="font-medium">Eiweiß:</span> {formData.nutritionData.proteins} {formData.nutritionData.proteinsUnit || 'g'}
                            </div>
                          )}
                          {formData.nutritionData.carbohydrates !== undefined && (
                            <div>
                              <span className="font-medium">Kohlenhydrate:</span> {formData.nutritionData.carbohydrates} {formData.nutritionData.carbohydratesUnit || 'g'}
                            </div>
                          )}
                          {formData.nutritionData.sugars !== undefined && (
                            <div>
                              <span className="font-medium">Zucker:</span> {formData.nutritionData.sugars} {formData.nutritionData.sugarsUnit || 'g'}
                            </div>
                          )}
                          {formData.nutritionData.fat !== undefined && (
                            <div>
                              <span className="font-medium">Fett:</span> {formData.nutritionData.fat} {formData.nutritionData.fatUnit || 'g'}
                            </div>
                          )}
                          {formData.nutritionData.saturatedFat !== undefined && (
                            <div>
                              <span className="font-medium">Gesättigte Fettsäuren:</span> {formData.nutritionData.saturatedFat} {formData.nutritionData.saturatedFatUnit || 'g'}
                            </div>
                          )}
                          {formData.nutritionData.salt !== undefined && (
                            <div>
                              <span className="font-medium">Salz:</span> {formData.nutritionData.salt} {formData.nutritionData.saltUnit || 'g'}
                            </div>
                          )}
                          {formData.nutritionData.fiber !== undefined && (
                            <div>
                              <span className="font-medium">Ballaststoffe:</span> {formData.nutritionData.fiber} {formData.nutritionData.fiberUnit || 'g'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Produktbilder
                    </label>
                    <FileUpload
                      value={formData.imageUrls}
                      onChange={(urls) => setFormData({ ...formData, imageUrls: urls })}
                      multiple={true}
                      folder="products"
                      maxSize={50 * 1024 * 1024}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Oder geben Sie manuell URLs ein (eine pro Zeile):
                    </p>
                    <textarea
                      value={Array.isArray(formData.imageUrls) ? formData.imageUrls.join('\n') : ''}
                      onChange={(e) => {
                        const urls = e.target.value.split('\n').filter(url => url.trim());
                        setFormData({ ...formData, imageUrls: urls });
                      }}
                      rows={2}
                      placeholder="https://example.com/image1.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mt-1"
                    />
                  </div>

                  {/* Switches */}
                  <div className="flex gap-6">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      label="Aktiv"
                      color="green"
                    />
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      label="Empfohlen"
                      color="green"
                    />
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
                      {editingProduct ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Varyant Yönetimi Modal */}
      <AnimatePresence>
        {showVariantModal && selectedProductForVariants && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex items-center justify-center p-4"
              onClick={(e) => {
                // Sadece overlay'e direkt tıklanınca kapat (input selection sırasında kapanmayı önle)
                if (e.target === e.currentTarget) {
                  closeVariantModal();
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Varianten verwalten
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedProductForVariants.name}
                    </p>
    </div>
                  <button
                    onClick={closeVariantModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loadingVariants ? (
                    <Loading />
                  ) : (
                    <div className="space-y-6">
                      {/* Varyant Seçenekleri */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Varyant Seçenekleri
                          </h3>
                          <button
                            onClick={openOptionForm}
                            className="flex items-center gap-2 px-3 py-1.5 text-white rounded-lg text-sm"
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
                            <FiPlus size={16} />
                            Seçenek Ekle
                          </button>
                        </div>
                        {variantOptions.length === 0 ? (
                          <p className="text-gray-500 text-sm">Henüz varyant seçeneği yok</p>
                        ) : (
                          <div className="space-y-2">
                            {variantOptions.map((option) => (
                              <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium">{option.name}</span>
                                <button
                                  onClick={() => {
                                    if (confirm('Bu seçeneği silmek istediğinize emin misiniz?')) {
                                      adminService.deleteVariantOption(option.id)
                                        .then(() => {
                                          toast.success('Seçenek silindi');
                                          openVariantModal(selectedProductForVariants);
                                        })
                                        .catch((error) => {
                                          toast.error('Hata: ' + (error.response?.data?.message || 'Bilinmeyen hata'));
                                        });
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Varyantlar */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Varyantlar ({variants.length})
                          </h3>
                          <button
                            onClick={() => {
                              if (variantOptions.length === 0) {
                                toast.error('Önce varyant seçeneği eklemelisiniz');
                                return;
                              }
                              openVariantForm();
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-white rounded-lg text-sm"
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
                            <FiPlus size={16} />
                            Varyant Ekle
                          </button>
                        </div>
                        {variants.length === 0 ? (
                          <p className="text-gray-500 text-sm">Henüz varyant yok</p>
                        ) : (
                          <div className="space-y-3">
                            {variants.map((variant) => (
                              <div key={variant.id} className="p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 mb-2">{variant.name}</div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-gray-600">Fiyat: </span>
                                        <span className="font-medium">{parseFloat(variant.price).toFixed(2)} €</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Stok: </span>
                                        <span className={`font-medium ${variant.stock <= 0 ? 'text-red-600' : ''}`}>
                                          {variant.stock}
                                        </span>
                                      </div>
                                    </div>
                                    {variant.values && variant.values.length > 0 ? (
                                      <div className="mt-2 text-xs text-gray-500">
                                        {variant.values.map((v, idx) => (
                                          <span key={idx}>
                                            {v.option.name}: {v.value}
                                            {idx < variant.values.length - 1 && ', '}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="mt-2 text-xs text-amber-600 font-medium">
                                        ⚠️ Varyant değerleri eksik - Ürün detayda görünmeyecek
                                      </div>
                                    )}
                                  </div>
                                  <div className="ml-4 flex items-center gap-2">
                                    <button
                                      onClick={() => openVariantForm(variant)}
                                      className="text-blue-600 hover:text-blue-700 p-2"
                                      title="Varyant düzenle"
                                    >
                                      <FiEdit2 size={18} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('Bu varyantı silmek istediğinize emin misiniz?')) {
                                          adminService.deleteVariant(variant.id)
                                            .then(() => {
                                              toast.success('Varyant silindi');
                                              openVariantModal(selectedProductForVariants);
                                            })
                                            .catch((error) => {
                                              toast.error('Hata: ' + (error.response?.data?.message || 'Bilinmeyen hata'));
                                            });
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-700 p-2"
                                    >
                                      <FiTrash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200">
                  <button
                    onClick={closeVariantModal}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Varyant Seçeneği Form Modal */}
      <AnimatePresence>
        {showOptionForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex items-center justify-center p-4"
              onClick={(e) => {
                // Sadece overlay'e direkt tıklanınca kapat (input selection sırasında kapanmayı önle)
                if (e.target === e.currentTarget) {
                  closeOptionForm();
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Varyant Seçeneği Ekle</h3>
                    <button
                      onClick={closeOptionForm}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiX size={24} />
                    </button>
                  </div>

                  {optionFormMode === 'select' ? (
                    <div className="space-y-4">
                      {/* Mevcut seçenekler */}
                      {loadingGlobalOptions ? (
                        <div className="text-center py-4">
                          <Loading />
                        </div>
                      ) : globalVariantOptions.length > 0 ? (
                        <div>
                          <p className="text-sm text-gray-600 mb-3">
                            Mevcut varyant seçeneklerinden birini seçin:
                          </p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {globalVariantOptions.map((option, index) => {
                              // Bu üründe zaten bu seçenek var mı kontrol et
                              const alreadyExists = variantOptions.some(
                                (opt) => opt.name === option.name
                              );
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleSelectExistingOption(option.name)}
                                  disabled={alreadyExists}
                                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                                    alreadyExists
                                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                      : 'bg-white border-gray-300 hover:border-green-500 hover:bg-green-50 text-gray-900'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{option.name}</span>
                                    {alreadyExists && (
                                      <span className="text-xs text-gray-500">(Zaten ekli)</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Henüz mevcut varyant seçeneği yok
                        </p>
                      )}

                      <div className="pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setOptionFormMode('create')}
                          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-green-500 hover:bg-green-50 transition-colors"
                        >
                          + Yeni Seçenek Oluştur
                        </button>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          type="button"
                          onClick={closeOptionForm}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveOption}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Seçenek Adı *
                          </label>
                          <input
                            type="text"
                            name="optionName"
                            required
                            placeholder="örn: Renk, Beden, Boyut"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            autoComplete="off"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sıralama
                          </label>
                          <input
                            type="number"
                            name="displayOrder"
                            defaultValue="0"
                            min="0"
                            inputMode="numeric"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            autoComplete="off"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <button
                          type="button"
                          onClick={() => setOptionFormMode('select')}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Geri
                        </button>
                        <button
                          type="button"
                          onClick={closeOptionForm}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          İptal
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
                          Kaydet
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Varyant Form Modal */}
      <AnimatePresence>
        {showVariantForm && variantOptions.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex items-center justify-center p-4"
              onClick={(e) => {
                // Sadece overlay'e direkt tıklanınca kapat (input selection sırasında kapanmayı önle)
                if (e.target === e.currentTarget) {
                  closeVariantForm();
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingVariant ? 'Varyant Düzenle' : 'Yeni Varyant Ekle'}
                    </h3>
                    <button
                      onClick={closeVariantForm}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiX size={24} />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveVariant} className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    {/* Varyant Seçenekleri - Her seçenek için değer */}
                    {variantOptions.map((option) => {
                      const suggestedValues = variantOptionValues[option.name] || [];
                      const currentValue = variantFormData.values[option.id] || '';
                      const inputId = `value_${option.id}`;
                      
                      return (
                        <div key={option.id}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {option.name} *
                          </label>
                          
                          {/* Mevcut değerler - Tıklanabilir butonlar */}
                          {suggestedValues.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-2">Önceki değerlerden seçin:</p>
                              <div className="flex flex-wrap gap-2">
                                {suggestedValues.map((value, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById(inputId);
                                      if (input) {
                                        input.value = value;
                                        // Form state'i güncelle
                                        setVariantFormData(prev => ({
                                          ...prev,
                                          values: {
                                            ...prev.values,
                                            [option.id]: value
                                          }
                                        }));
                                      }
                                    }}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                      currentValue === value
                                        ? 'text-white'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:bg-green-50'
                                    }`}
                                    style={currentValue === value ? {
                                      backgroundColor: themeColors?.primary?.[600] || '#16a34a',
                                      borderColor: themeColors?.primary?.[600] || '#16a34a'
                                    } : {}}
                                  >
                                    {value}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Input alanı */}
                          <input
                            type="text"
                            id={inputId}
                            name={`value_${option.id}`}
                            required
                            defaultValue={currentValue}
                            placeholder={suggestedValues.length > 0 ? 'Veya yeni değer girin' : `örn: ${option.name === 'Renk' ? 'Kırmızı' : option.name === 'Beden' ? 'S' : 'Değer'}`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            autoComplete="off"
                            onChange={(e) => {
                              setVariantFormData(prev => ({
                                ...prev,
                                values: {
                                  ...prev.values,
                                  [option.id]: e.target.value
                                }
                              }));
                            }}
                          />
                        </div>
                      );
                    })}

                    {/* Fiyat ve Stok */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fiyat (€) *
                        </label>
                        <input
                          type="number"
                          name="price"
                          required
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          defaultValue={variantFormData.price}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          autoComplete="off"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stok *
                        </label>
                        <input
                          type="number"
                          name="stock"
                          required
                          min="0"
                          inputMode="numeric"
                          defaultValue={variantFormData.stock}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SKU (Stok Kodu)
                      </label>
                      <input
                        type="text"
                        name="sku"
                        defaultValue={variantFormData.sku}
                        placeholder="Opsiyonel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeVariantForm}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      İptal
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
                      {editingVariant ? 'Güncelle' : 'Kaydet'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toplu Fiyat Güncelleme Modal */}
      <BulkPriceUpdateModal
        isOpen={showBulkPriceModal}
        onClose={() => setShowBulkPriceModal(false)}
        onSuccess={loadProducts}
      />
    </div>
  );
}

export default Produkte;

