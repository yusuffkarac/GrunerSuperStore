import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiPrinter, FiCheckSquare, FiSquare, FiChevronLeft, FiChevronRight, FiSettings, FiRotateCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import barcodeLabelService from '../../services/barcodeLabelService';
import settingsService from '../../services/settingsService';
import { useAlert } from '../../contexts/AlertContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import HelpTooltip from '../../components/common/HelpTooltip';
import SwitchListItem from '../../components/common/SwitchListItem';
import { useModalScroll } from '../../hooks/useModalScroll';

function BarcodeLabels() {
  const { showConfirm } = useAlert();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const wasInputFocusedRef = useRef(false);
  const [selectedLabels, setSelectedLabels] = useState([]); // Toplu baskı için seçilenler
  const [labelSettings, setLabelSettings] = useState({
    labelHeaderFontSize: 16,
    labelPriceFontSize: 46,
    labelPriceCurrencyFontSize: 24,
    labelSkuFontSize: 11,
    labelHeight: '40mm',
    labelHeaderMinHeight: '18mm',
    labelBorderColor: '#059669',
    barcodeType: 'auto',
  });
  
  // Modal scroll yönetimi - her modal için
  useModalScroll(showModal);
  useModalScroll(showSettingsModal);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [customItemsPerPage, setCustomItemsPerPage] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    unit: '',
    barcode: '',
  });

  // Debounce search query
  useEffect(() => {
    // Önceki timeout'u temizle
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Yeni timeout ayarla (500ms debounce)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    
    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Verileri yükle
  useEffect(() => {
    loadLabels();
    loadLabelSettings();
  }, [debouncedSearchQuery, currentPage, itemsPerPage]);

  const loadLabels = async () => {
    // İlk yükleme değilse (arama yapılıyorsa) loading state'ini değiştirme
    const shouldShowLoading = isInitialLoad;
    
    if (shouldShowLoading) {
      setLoading(true);
    }
    
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;

      const response = await barcodeLabelService.getAllBarcodeLabels(params);
      setLabels(response.data.labels || []);
      
      // Pagination bilgilerini güncelle
      if (response.data.pagination) {
        setTotal(response.data.pagination.total || 0);
        setTotalPages(response.data.pagination.totalPages || 0);
      }
      
      // Sayfa değiştiğinde seçimleri temizle
      setSelectedLabels([]);
      
      // İlk yükleme tamamlandı
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      toast.error('Barcode-Etiketten konnten nicht geladen werden');
      console.error('Etiket yükleme hatası:', error);
    } finally {
      if (shouldShowLoading) {
        setLoading(false);
      }
      // Focus'u koru - eğer input daha önce focus'taysa geri ver
      if (searchInputRef.current && wasInputFocusedRef.current) {
        // Bir sonraki render cycle'da focus'u geri ver
        requestAnimationFrame(() => {
          if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
            searchInputRef.current.focus();
          }
        });
      }
    }
  };

  // Etiket ayarlarını yükle
  const loadLabelSettings = async () => {
    try {
      const response = await settingsService.getSettings();
      if (response.data?.settings?.barcodeLabelSettings) {
        setLabelSettings(response.data.settings.barcodeLabelSettings);
      }
    } catch (error) {
      console.error('Etiket ayarları yükleme hatası:', error);
    }
  };

  // Etiket şablonları
  const labelTemplates = {
    '30mm': {
      labelHeight: '30mm',
      labelHeaderFontSize: 12,
      labelPriceFontSize: 32,
      labelPriceCurrencyFontSize: 18,
      labelSkuFontSize: 9,
      labelHeaderMinHeight: '10mm',
      labelBorderColor: '#059669',
      barcodeType: 'auto',
    },
    '40mm': {
      labelHeight: '40mm',
      labelHeaderFontSize: 16,
      labelPriceFontSize: 40,
      labelPriceCurrencyFontSize: 24,
      labelSkuFontSize: 11,
      labelHeaderMinHeight: '18mm',
      labelBorderColor: '#059669',
      barcodeType: 'auto',
    },
    '50mm': {
      labelHeight: '50mm',
      labelHeaderFontSize: 20,
      labelPriceFontSize: 58,
      labelPriceCurrencyFontSize: 30,
      labelSkuFontSize: 13,
      labelHeaderMinHeight: '22mm',
      labelBorderColor: '#059669',
      barcodeType: 'auto',
    },
    '60mm': {
      labelHeight: '60mm',
      labelHeaderFontSize: 24,
      labelPriceFontSize: 70,
      labelPriceCurrencyFontSize: 36,
      labelSkuFontSize: 15,
      labelHeaderMinHeight: '26mm',
      labelBorderColor: '#059669',
      barcodeType: 'auto',
    },
  };

  // Şablon seçildiğinde ayarları uygula
  const handleApplyTemplate = (templateKey) => {
    const template = labelTemplates[templateKey];
    if (template) {
      setLabelSettings({
        ...labelSettings,
        ...template,
      });
    }
  };

  // Etiket ayarlarını varsayılan değerlere sıfırla
  const handleResetLabelSettings = () => {
    setLabelSettings({
      labelHeaderFontSize: 16,
      labelPriceFontSize: 46,
      labelPriceCurrencyFontSize: 24,
      labelSkuFontSize: 11,
      labelHeight: '40mm',
      labelHeaderMinHeight: '18mm',
      labelBorderColor: '#059669',
      barcodeType: 'auto',
    });
    toast.info('Einstellungen wurden auf Standardwerte zurückgesetzt');
  };

  // Etiket ayarlarını kaydet
  const handleSaveLabelSettings = async () => {
    try {
      // Boş string değerleri varsayılan değerlerle değiştir
      const settingsToSave = {
        labelHeaderFontSize: labelSettings.labelHeaderFontSize === '' ? 16 : labelSettings.labelHeaderFontSize,
        labelPriceFontSize: labelSettings.labelPriceFontSize === '' ? 46 : labelSettings.labelPriceFontSize,
        labelPriceCurrencyFontSize: labelSettings.labelPriceCurrencyFontSize === '' ? 24 : labelSettings.labelPriceCurrencyFontSize,
        labelSkuFontSize: labelSettings.labelSkuFontSize === '' ? 11 : labelSettings.labelSkuFontSize,
        labelHeight: labelSettings.labelHeight === '' ? '40mm' : labelSettings.labelHeight,
        labelHeaderMinHeight: labelSettings.labelHeaderMinHeight === '' ? '18mm' : labelSettings.labelHeaderMinHeight,
        labelBorderColor: labelSettings.labelBorderColor === '' ? '#059669' : labelSettings.labelBorderColor,
        barcodeType: labelSettings.barcodeType || 'auto',
      };
      
      await settingsService.updateSettings({
        barcodeLabelSettings: settingsToSave,
      });
      
      // State'i de güncelle
      setLabelSettings(settingsToSave);
      
      toast.success('Etikett-Einstellungen wurden gespeichert');
      setShowSettingsModal(false);
    } catch (error) {
      toast.error('Einstellungen konnten nicht gespeichert werden');
      console.error('Ayarlar kaydetme hatası:', error);
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
      toast.error('Produktname ist erforderlich');
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      toast.error('Bitte geben Sie einen gültigen Preis ein');
      return;
    }
    if (!formData.barcode.trim()) {
      toast.error('Barcode-Nummer ist erforderlich');
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
        toast.success('Barcode-Etikett wurde aktualisiert');
      } else {
        await barcodeLabelService.createBarcodeLabel(data);
        toast.success('Barcode-Etikett wurde erstellt');
      }

      loadLabels();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ein Fehler ist aufgetreten');
      console.error('Form submit hatası:', error);
    }
  };

  // Etiket silme
  const handleDelete = async (id) => {
    const confirmed = await showConfirm(
      'Sind Sie sicher, dass Sie dieses Barcode-Etikett löschen möchten?',
      {
        title: 'Etikett löschen',
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
        type: 'danger',
      }
    );

    if (confirmed) {
      try {
        await barcodeLabelService.deleteBarcodeLabel(id);
        toast.success('Barcode-Etikett wurde gelöscht');
        loadLabels();
      } catch (error) {
        toast.error('Löschvorgang fehlgeschlagen');
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
      toast.warning('Bitte wählen Sie Etiketten zum Drucken aus');
      return;
    }

    // Print sayfasına yönlendir
    const selectedIds = selectedLabels.join(',');
    window.open(`/admin/barcode-labels/print?ids=${selectedIds}`, '_blank');
  };

  // Toplu silme
  const handleBulkDelete = async () => {
    if (selectedLabels.length === 0) {
      toast.warning('Bitte wählen Sie Etiketten zum Löschen aus');
      return;
    }

    const confirmed = await showConfirm(
      `Sind Sie sicher, dass Sie ${selectedLabels.length} Barcode-Etiketten löschen möchten?`,
      {
        title: 'Massenlöschung',
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
        type: 'danger',
      }
    );

    if (confirmed) {
      try {
        await barcodeLabelService.bulkDeleteBarcodeLabels(selectedLabels);
        toast.success('Barcode-Etiketten wurden gelöscht');
        setSelectedLabels([]);
        loadLabels();
      } catch (error) {
        toast.error('Löschvorgang fehlgeschlagen');
        console.error('Toplu silme hatası:', error);
      }
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleItemsPerPageChange = (value) => {
    const numValue = parseInt(value);
    if (numValue > 0) {
      setItemsPerPage(numValue);
      setCurrentPage(1); // Sayfa başına öğe değiştiğinde ilk sayfaya dön
      setCustomItemsPerPage(''); // Custom input'u temizle
    }
  };

  const handleCustomItemsPerPageSubmit = (e) => {
    e.preventDefault();
    const numValue = parseInt(customItemsPerPage);
    if (numValue > 0) {
      setItemsPerPage(numValue);
      setCurrentPage(1);
      setCustomItemsPerPage('');
    } else {
      toast.error('Bitte geben Sie eine gültige Zahl ein');
    }
  };

  // Sayfa numaralarını hesapla (maksimum 7 sayfa göster)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      // Tüm sayfaları göster
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // İlk sayfa
      pages.push(1);
      
      if (currentPage <= 4) {
        // Başta göster
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Sonda göster
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Ortada göster
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading) return <Loading />;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          Barcode-Etiketten
          <HelpTooltip content="Erstellen und drucken Sie Barcode-Etiketten für Ihre Produkte. Ideal für Lagerbestandsverwaltung und Kassensysteme." />
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Verwalten und drucken Sie Ihre Produktetiketten</p>
      </div>

      {/* Toolbar */}
      <div className="mb-4 md:mb-6 space-y-3">
        {/* Arama */}
        <div className="w-full">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Produktname oder Barcode suchen..."
              value={searchQuery}
              onFocus={() => {
                wasInputFocusedRef.current = true;
              }}
              onBlur={() => {
                // Sadece başka bir input'a geçilmediyse blur'u işaretle
                setTimeout(() => {
                  if (document.activeElement !== searchInputRef.current) {
                    wasInputFocusedRef.current = false;
                  }
                }, 0);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Arama yapıldığında ilk sayfaya dön
              }}
              onKeyDown={(e) => {
                // Enter'a basıldığında form submit'ini engelle
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Butonlar */}
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs md:text-sm md:px-4 md:py-2 md:text-base bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Etikettdruckeinstellungen"
          >
            <FiSettings className="w-3.5 h-3.5 md:w-5 md:h-5 flex-shrink-0" />
            <span className="ml-1 hidden sm:inline">Einstellungen</span>
            <span className="ml-1 sm:hidden">Einst.</span>
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm whitespace-nowrap"
          >
            <FiPlus className="w-4 h-4" />
            <span>Neues Etikett</span>
          </button>

          {selectedLabels.length > 0 && (
            <>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs md:text-sm md:px-4 md:py-2 md:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiPrinter className="w-3.5 h-3.5 md:w-5 md:h-5 flex-shrink-0" />
                <span className="ml-1 hidden sm:inline">Drucken ({selectedLabels.length})</span>
                <span className="ml-1 sm:hidden">Druck ({selectedLabels.length})</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs md:text-sm md:px-4 md:py-2 md:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <FiTrash2 className="w-3.5 h-3.5 md:w-5 md:h-5 flex-shrink-0" />
                <span className="ml-1 hidden sm:inline">Löschen ({selectedLabels.length})</span>
                <span className="ml-1 sm:hidden">Lösch ({selectedLabels.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Items Per Page Selector */}
      <div className="mb-4 space-y-2 md:space-y-0 md:flex md:items-center md:gap-4 md:flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs md:text-sm text-gray-700 font-medium whitespace-nowrap">Pro Seite:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(e.target.value)}
            className="px-2 md:px-3 py-1.5 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>
        
        <form onSubmit={handleCustomItemsPerPageSubmit} className="flex items-center gap-2">
          <label className="text-xs md:text-sm text-gray-700 font-medium whitespace-nowrap">Benutzerdefiniert:</label>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={customItemsPerPage}
            onChange={(e) => setCustomItemsPerPage(e.target.value)}
            placeholder="Zahl"
            className="w-20 md:w-24 px-2 md:px-3 py-1.5 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-2 md:px-3 py-1.5 text-xs md:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            Anwenden
          </button>
        </form>

        {total > 0 && (
          <div className="text-xs md:text-sm text-gray-600">
            Insgesamt {total} Produkte werden angezeigt
          </div>
        )}
      </div>

      {/* Etiket Listesi */}
      {labels.length === 0 ? (
        <EmptyState
          title="Noch keine Barcode-Etiketten vorhanden"
          description="Beginnen Sie mit der Erstellung eines neuen Barcode-Etiketts"
          actionLabel="Neues Etikett"
          onAction={() => openModal()}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Produktname</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Preis</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Einheit</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700">Barcode</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Aktionen</th>
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
                      <SwitchListItem
                        id={`label-${label.id}`}
                        checked={selectedLabels.includes(label.id)}
                        onChange={() => toggleSelectLabel(label.id)}
                        color="green"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{label.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">€{parseFloat(label.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{label.unit || '-'}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-sm font-mono text-gray-900">{label.barcode}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(label)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <FiEdit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(label.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {/* Select All Button */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900"
              >
                {selectedLabels.length === labels.length ? (
                  <FiCheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <FiSquare className="w-4 h-4" />
                )}
                <span>Alle auswählen</span>
              </button>
            </div>

            {/* Cards */}
            {labels.map((label) => (
              <motion.div
                key={label.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-lg shadow-sm p-2.5 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  {/* Checkbox */}
                  <SwitchListItem
                    id={`label-mobile-${label.id}`}
                    checked={selectedLabels.includes(label.id)}
                    onChange={() => toggleSelectLabel(label.id)}
                    color="green"
                    className="flex-shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-gray-900 mb-0.5 line-clamp-2">
                      {label.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                      <span className="text-xs font-semibold text-gray-900">€{parseFloat(label.price).toFixed(2)}</span>
                      {label.unit && (
                        <span className="text-xs text-gray-500">• {label.unit}</span>
                      )}
                      <span className="text-xs text-gray-400 font-mono">{label.barcode}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => openModal(label)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Bearbeiten"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(label.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Löschen"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 md:mt-6 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:flex-wrap md:gap-4">
          <div className="text-xs md:text-sm text-gray-600 text-center md:text-left">
            Seite {currentPage} / {totalPages} <span className="hidden sm:inline">(Insgesamt {total} Produkte)</span>
          </div>
          
          <div className="flex items-center justify-center gap-1 md:gap-2">
            {/* İlk Sayfa */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-xs md:text-sm"
            >
              <span className="hidden sm:inline">Erste</span>
              <span className="sm:hidden">«</span>
            </button>

            {/* Önceki Sayfa */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 md:p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <FiChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Sayfa Numaraları */}
            <div className="flex items-center gap-0.5 md:gap-1">
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-1 md:px-2 text-gray-400 text-xs md:text-sm">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-2 md:px-3 py-1.5 md:py-2 min-w-[32px] md:min-w-[40px] border rounded-lg transition-colors text-xs md:text-sm ${
                      currentPage === page
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Sonraki Sayfa */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 md:p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <FiChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Son Sayfa */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-xs md:text-sm"
            >
              <span className="hidden sm:inline">Letzte</span>
              <span className="sm:hidden">»</span>
            </button>
          </div>
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
              className="fixed inset-0 bg-black/50 z-[9998]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingLabel ? 'Etikett bearbeiten' : 'Neues Etikett'}
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
                      Produktname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Produktname eingeben"
                      required
                    />
                  </div>

                  {/* Fiyat */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preis (€) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  {/* Birim */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Einheitstyp (Optional)
                    </label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="z.B.: kg, Stück, Liter"
                    />
                  </div>

                  {/* Barkod */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barcode-Nummer <span className="text-red-500">*</span>
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
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      {editingLabel ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Ayarlar Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="fixed inset-0 bg-black/50 z-[9998]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    Etikettdruckeinstellungen
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetLabelSettings}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Auf Standardwerte zurücksetzen"
                    >
                      <FiRotateCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowSettingsModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  {/* Şablon Seçici */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etiket Vorlagen
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(labelTemplates).map((templateKey) => {
                        const template = labelTemplates[templateKey];
                        const isActive = labelSettings.labelHeight === template.labelHeight;
                        return (
                          <button
                            key={templateKey}
                            type="button"
                            onClick={() => handleApplyTemplate(templateKey)}
                            className={`px-6 py-3 border-2 rounded-lg transition-all text-sm font-medium ${
                              isActive
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
                            }`}
                          >
                            <div className="font-semibold">{templateKey}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {template.labelHeaderFontSize}pt / {template.labelPriceFontSize}pt
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Wählen Sie eine Vorlage aus, um alle Einstellungen automatisch anzupassen
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Manuelle Einstellungen</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Ürün Adı Font Boyutu */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Produktname Schriftgröße (pt)
                      </label>
                      <input
                        type="number"
                        min="8"
                        max="32"
                        inputMode="numeric"
                        value={labelSettings.labelHeaderFontSize}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setLabelSettings({
                              ...labelSettings,
                              labelHeaderFontSize: '',
                            });
                          } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue)) {
                              setLabelSettings({
                                ...labelSettings,
                                labelHeaderFontSize: numValue,
                              });
                            }
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    {/* Fiyat Font Boyutu */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preis Schriftgröße (pt)
                      </label>
                      <input
                        type="number"
                        min="20"
                        max="80"
                        inputMode="numeric"
                        value={labelSettings.labelPriceFontSize}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setLabelSettings({
                              ...labelSettings,
                              labelPriceFontSize: '',
                            });
                          } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue)) {
                              setLabelSettings({
                                ...labelSettings,
                                labelPriceFontSize: numValue,
                              });
                            }
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    {/* Para Birimi Font Boyutu */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Währung (€) Schriftgröße (pt)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="40"
                        inputMode="numeric"
                        value={labelSettings.labelPriceCurrencyFontSize}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setLabelSettings({
                              ...labelSettings,
                              labelPriceCurrencyFontSize: '',
                            });
                          } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue)) {
                              setLabelSettings({
                                ...labelSettings,
                                labelPriceCurrencyFontSize: numValue,
                              });
                            }
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    {/* SKU/Barkod Font Boyutu */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SKU/Barcode Schriftgröße (pt)
                      </label>
                      <input
                        type="number"
                        min="8"
                        max="20"
                        inputMode="numeric"
                        value={labelSettings.labelSkuFontSize}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setLabelSettings({
                              ...labelSettings,
                              labelSkuFontSize: '',
                            });
                          } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue)) {
                              setLabelSettings({
                                ...labelSettings,
                                labelSkuFontSize: numValue,
                              });
                            }
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    {/* Etiket Yüksekliği */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Etiket Höhe (mm)
                      </label>
                      <input
                        type="text"
                        value={labelSettings.labelHeight}
                        onChange={(e) => {
                          setLabelSettings({
                            ...labelSettings,
                            labelHeight: e.target.value,
                          });
                        }}
                        placeholder="z.B.: 40mm"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Format: Zahl + Einheit</p>
                    </div>

                    {/* Ürün Adı Minimum Yüksekliği */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Produktname Mindesthöhe (mm)
                      </label>
                      <input
                        type="text"
                        value={labelSettings.labelHeaderMinHeight}
                        onChange={(e) => {
                          setLabelSettings({
                            ...labelSettings,
                            labelHeaderMinHeight: e.target.value,
                          });
                        }}
                        placeholder="z.B.: 18mm"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Wird von Vorlagen gesetzt</p>
                    </div>
                  </div>

                  {/* Etiket Kenarlık Rengi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etiket Rahmenfarbe
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={labelSettings.labelBorderColor}
                        onChange={(e) => {
                          setLabelSettings({
                            ...labelSettings,
                            labelBorderColor: e.target.value,
                          });
                        }}
                        className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={labelSettings.labelBorderColor}
                        onChange={(e) => {
                          setLabelSettings({
                            ...labelSettings,
                            labelBorderColor: e.target.value,
                          });
                        }}
                        placeholder="#059669"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Hex-Farbcode (z.B.: #059669)</p>
                  </div>

                  {/* Barkod Türü */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barcode-Typ
                    </label>
                    <select
                      value={labelSettings.barcodeType || 'auto'}
                      onChange={(e) => {
                        setLabelSettings({
                          ...labelSettings,
                          barcodeType: e.target.value,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="auto">Automatisch (empfohlen)</option>
                      <option value="EAN13">EAN-13 (13 Ziffern)</option>
                      <option value="EAN8">EAN-8 (8 Ziffern)</option>
                      <option value="CODE128">CODE128 (beliebig)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatisch erkennt den Barcode-Typ basierend auf der Anzahl der Ziffern
                    </p>
                  </div>

                  {/* Butonlar */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLabelSettings}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BarcodeLabels;
