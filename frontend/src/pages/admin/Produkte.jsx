import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiFilter, FiPackage, FiCheck, FiXCircle, FiGrid, FiList, FiLayers } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import categoryService from '../../services/categoryService';
import { useAlert } from '../../contexts/AlertContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import FileUpload from '../../components/common/FileUpload';
import { normalizeImageUrl } from '../../utils/imageUtils';
import { cleanRequestData } from '../../utils/requestUtils';

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
              Featured
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
                Featured
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
                Featured
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
                F
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
  const [variantFormData, setVariantFormData] = useState({
    name: '',
    price: '',
    stock: '',
    sku: '',
    imageUrls: [],
    values: {},
  });
  
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
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 20;

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
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        description: product.description || '',
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
      });
    }
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingProduct(null);
  }, []);

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name,
        description: formData.description || null,
        categoryId: formData.categoryId || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
        lowStockLevel: formData.lowStockLevel ? parseInt(formData.lowStockLevel) : null,
        unit: formData.unit || null,
        barcode: formData.barcode || null,
        brand: formData.brand || null,
        imageUrls: formData.imageUrls.length > 0 ? formData.imageUrls : null,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        showStock: formData.showStock,
      };

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
    setCurrentPage(1);
  }, []);

  // View mode handler
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem('produkteViewMode', mode);
  }, []);

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Produkte</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {total} {total === 1 ? 'Produkt' : 'Produkte'} insgesamt
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <FiPlus size={20} />
          Neues Produkt
        </button>
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
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
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
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Listenansicht"
              >
                <FiList size={18} />
              </button>
              <button
                onClick={() => handleViewModeChange('card')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'card'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Kartenansicht"
              >
                <FiGrid size={18} />
              </button>
            </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
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
                Featured
              </label>
              <select
                value={isFeaturedFilter}
                onChange={handleFeaturedFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition-all"
              >
                <option value="">Alle</option>
                <option value="true">Featured</option>
                <option value="false">Nicht Featured</option>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kategorie
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Preis
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Lager
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Barcode
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
          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Seite {currentPage} von {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zurück
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
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
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
                        required
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.showStock}
                          onChange={(e) => setFormData({ ...formData, showStock: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.showStock ? 'bg-green-600' : 'bg-gray-300'
                        }`}>
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.showStock ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </div>
                        <span className="text-sm text-gray-700">Lagerbestand für Nutzer anzeigen</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Einheit
                      </label>
                      <input
                        type="text"
                        placeholder="z.B. kg, Stück"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.isActive ? 'bg-green-600' : 'bg-gray-300'
                      }`}>
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <span className="text-sm text-gray-700">Aktiv</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.isFeatured ? 'bg-green-600' : 'bg-gray-300'
                      }`}>
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.isFeatured ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <span className="text-sm text-gray-700">Featured</span>
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
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={closeVariantModal}
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
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
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
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
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
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={closeOptionForm}
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
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={closeVariantForm}
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
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:bg-green-50'
                                    }`}
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
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
    </div>
  );
}

export default Produkte;

