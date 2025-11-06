/**
 * API isteklerinde gönderilecek verileri temizler
 * Boş string'leri, null değerleri ve undefined değerleri kaldırır
 * 
 * @param {Object} data - Temizlenecek veri objesi
 * @param {Object} options - Seçenekler
 * @param {boolean} options.removeEmptyStrings - Boş string'leri kaldır (default: true)
 * @param {boolean} options.removeNull - Null değerleri kaldır (default: true)
 * @param {boolean} options.removeUndefined - Undefined değerleri kaldır (default: true)
 * @param {boolean} options.deep - Nested objeleri de temizle (default: true)
 * @returns {Object} Temizlenmiş veri objesi
 */
export const cleanRequestData = (data, options = {}) => {
  const {
    removeEmptyStrings = true,
    removeNull = true,
    removeUndefined = true,
    deep = true,
  } = options;

  if (data === null || data === undefined) {
    return data;
  }

  // Array ise
  if (Array.isArray(data)) {
    return data
      .map((item) => (deep ? cleanRequestData(item, options) : item))
      .filter((item) => {
        if (removeNull && item === null) return false;
        if (removeUndefined && item === undefined) return false;
        return true;
      });
  }

  // Object ise
  if (typeof data === 'object') {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Boş string kontrolü
      if (removeEmptyStrings && value === '') {
        continue;
      }

      // Null kontrolü
      if (removeNull && value === null) {
        continue;
      }

      // Undefined kontrolü
      if (removeUndefined && value === undefined) {
        continue;
      }

      // Nested objeleri temizle
      if (deep && (typeof value === 'object' || Array.isArray(value))) {
        const cleanedValue = cleanRequestData(value, options);
        // Eğer temizlenmiş değer boş bir obje veya array ise, onu da atla
        if (
          (typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0) ||
          (Array.isArray(cleanedValue) && cleanedValue.length === 0)
        ) {
          continue;
        }
        cleaned[key] = cleanedValue;
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  // Primitive değerler
  return data;
};

/**
 * Objeden sadece belirtilen alanları seçer
 * 
 * @param {Object} data - Kaynak obje
 * @param {string[]} fields - Seçilecek alan isimleri
 * @returns {Object} Sadece seçilen alanları içeren obje
 */
export const pickFields = (data, fields) => {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const picked = {};
  for (const field of fields) {
    if (field in data) {
      picked[field] = data[field];
    }
  }

  return picked;
};

/**
 * Objeden belirtilen alanları çıkarır
 * 
 * @param {Object} data - Kaynak obje
 * @param {string[]} fields - Çıkarılacak alan isimleri
 * @returns {Object} Belirtilen alanlar çıkarılmış obje
 */
export const omitFields = (data, fields) => {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const omitted = { ...data };
  for (const field of fields) {
    delete omitted[field];
  }

  return omitted;
};

