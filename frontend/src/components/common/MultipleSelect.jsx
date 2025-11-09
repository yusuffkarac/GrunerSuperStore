import React, { useState, useMemo } from 'react';
import { FiSearch, FiCheck, FiX } from 'react-icons/fi';

/**
 * MultipleSelect Component
 * Checkbox'lı ve arama özellikli çoklu seçim bileşeni
 * 
 * @param {Array} options - Seçenekler dizisi [{id, name, ...}, ...]
 * @param {Array} value - Seçili değerler dizisi (id'ler)
 * @param {function} onChange - Değişiklik olduğunda çağrılacak fonksiyon (seçili id'ler dizisini döndürür)
 * @param {string} label - Bileşenin üst etiketi
 * @param {string} placeholder - Arama kutusu placeholder metni
 * @param {string} searchPlaceholder - Arama kutusu placeholder metni (opsiyonel)
 * @param {boolean} optional - Etiketin yanında "(Optional)" gösterilsin mi
 * @param {number} maxHeight - Liste maksimum yüksekliği (px)
 * @param {string} className - Ek CSS sınıfları
 * @param {function} getOptionLabel - Özel label fonksiyonu (opsiyonel)
 * @param {function} getOptionValue - Özel value fonksiyonu (opsiyonel)
 */
const MultipleSelect = ({
  options = [],
  value = [],
  onChange,
  label,
  placeholder = 'Suchen...',
  searchPlaceholder,
  optional = false,
  maxHeight = 200,
  className = '',
  getOptionLabel = (option) => option.name || option.label || String(option),
  getOptionValue = (option) => option.id || option.value || option,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrelenmiş seçenekler
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }
    const query = searchQuery.toLowerCase();
    return options.filter((option) => {
      const label = getOptionLabel(option);
      const labelMatch = label.toLowerCase().includes(query);
      
      // Barcode'a göre de arama yap (eğer varsa)
      const barcodeMatch = option.barcode 
        ? String(option.barcode).toLowerCase().includes(query)
        : false;
      
      return labelMatch || barcodeMatch;
    });
  }, [options, searchQuery, getOptionLabel]);

  // Helper: Değerleri normalize et (string'e çevir)
  const normalizeValue = (val) => String(val);

  // Tüm seçenekler seçili mi?
  const allSelected = useMemo(() => {
    if (filteredOptions.length === 0) return false;
    const normalizedValue = value.map(normalizeValue);
    return filteredOptions.every((option) => {
      const optionValue = normalizeValue(getOptionValue(option));
      return normalizedValue.includes(optionValue);
    });
  }, [filteredOptions, value, getOptionValue]);

  // Bazı seçenekler seçili mi?
  const someSelected = useMemo(() => {
    if (filteredOptions.length === 0) return false;
    const normalizedValue = value.map(normalizeValue);
    const selectedCount = filteredOptions.filter((option) => {
      const optionValue = normalizeValue(getOptionValue(option));
      return normalizedValue.includes(optionValue);
    }).length;
    return selectedCount > 0 && selectedCount < filteredOptions.length;
  }, [filteredOptions, value, getOptionValue]);

  // Tekil seçim değiştir
  const handleToggle = (optionValue) => {
    const normalizedOptionValue = normalizeValue(optionValue);
    const normalizedValue = value.map(normalizeValue);
    const newValue = normalizedValue.includes(normalizedOptionValue)
      ? value.filter((v) => normalizeValue(v) !== normalizedOptionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  };

  // Tümünü seç/seçimi kaldır
  const handleToggleAll = () => {
    if (allSelected) {
      // Filtrelenmiş seçenekleri kaldır
      const filteredValues = filteredOptions.map((option) => normalizeValue(getOptionValue(option)));
      const newValue = value.filter((v) => !filteredValues.includes(normalizeValue(v)));
      onChange?.(newValue);
    } else {
      // Filtrelenmiş seçenekleri ekle
      const filteredOptionValues = filteredOptions.map((option) => getOptionValue(option));
      
      // Orijinal tipleri korumak için: önce mevcut değerleri ekle, sonra yeni olanları
      const newValue = [
        ...value, // Mevcut değerleri koru
        ...filteredOptionValues.filter((optionValue) => {
          // Sadece henüz eklenmemiş olanları ekle
          return !value.some((v) => normalizeValue(v) === normalizeValue(optionValue));
        })
      ];
      
      onChange?.(newValue);
    }
  };

  // Seçimi temizle
  const handleClear = () => {
    onChange?.([]);
    setSearchQuery('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {optional && <span className="text-gray-500 ml-1">(Optional)</span>}
          </label>
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <FiX className="w-3 h-3" />
              Alle entfernen
            </button>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={searchPlaceholder || placeholder}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Selection Info */}
      {value.length > 0 && (
        <div className="text-xs text-gray-600">
          {value.length} {value.length === 1 ? 'Element ausgewählt' : 'Elemente ausgewählt'}
        </div>
      )}

      {/* Options List */}
      <div
        className="border border-gray-300 rounded-lg overflow-hidden bg-white"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
          {/* Select All Option */}
          {filteredOptions.length > 0 && (
            <div
              className="px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={handleToggleAll}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleAll}
                    className="sr-only"
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = someSelected && !allSelected;
                      }
                    }}
                  />
                  <div
                    className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      allSelected
                        ? 'bg-green-600 border-green-600'
                        : someSelected
                        ? 'bg-green-100 border-green-600'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {allSelected && <FiCheck className="w-3 h-3 text-white" />}
                    {someSelected && !allSelected && (
                      <div className="w-2 h-0.5 bg-green-600" />
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {allSelected ? 'Alle abwählen' : 'Alle auswählen'}
                </span>
              </label>
            </div>
          )}

          {/* Options */}
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              {searchQuery ? 'Keine Ergebnisse gefunden' : 'Keine Optionen verfügbar'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredOptions.map((option, index) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const normalizedValue = value.map(normalizeValue);
                const normalizedOptionValue = normalizeValue(optionValue);
                const isSelected = normalizedValue.includes(normalizedOptionValue);

                return (
                  <label
                    key={optionValue || index}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative flex items-center flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggle(optionValue)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-green-600 border-green-600'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <span className="text-sm text-gray-700 flex-1">{optionLabel}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultipleSelect;

