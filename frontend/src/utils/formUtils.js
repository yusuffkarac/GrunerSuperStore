/**
 * Form state güncellemeleri için utility fonksiyonlar
 * Input focus kaybını önlemek için functional update pattern kullanır
 */

/**
 * Tek bir field'ı güncellemek için stable handler
 * @param {Function} setFormData - setState function
 * @param {string} field - Güncellenecek field adı
 * @returns {Function} onChange handler
 * 
 * @example
 * const handleNameChange = createFieldHandler(setFormData, 'name');
 * <input onChange={handleNameChange} />
 */
export function createFieldHandler(setFormData, field) {
  return (e) => {
    const value = e?.target?.value !== undefined ? e.target.value : e;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
}

/**
 * Checkbox için stable handler
 * @param {Function} setFormData - setState function
 * @param {string} field - Güncellenecek field adı
 * @returns {Function} onChange handler
 */
export function createCheckboxHandler(setFormData, field) {
  return (e) => {
    const checked = e?.target?.checked !== undefined ? e.target.checked : e;
    setFormData(prev => ({
      ...prev,
      [field]: checked
    }));
  };
}

/**
 * Date picker için stable handler
 * @param {Function} setFormData - setState function
 * @param {string} field - Güncellenecek field adı
 * @returns {Function} onChange handler
 */
export function createDateHandler(setFormData, field) {
  return (date) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
  };
}

/**
 * Generic field update - functional update pattern kullanır
 * Mevcut kodlarda minimal değişiklikle kullanılabilir
 * 
 * @param {Function} setFormData - setState function
 * @param {string} field - Güncellenecek field adı
 * @param {any} value - Yeni değer
 * 
 * @example
 * // Eski kullanım:
 * onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 * 
 * // Yeni kullanım:
 * onChange={(e) => updateField(setFormData, 'name', e.target.value)}
 */
export function updateField(setFormData, field, value) {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
}

/**
 * Multiple fields update
 * @param {Function} setFormData - setState function
 * @param {Object} updates - Güncellenecek field'lar
 */
export function updateFields(setFormData, updates) {
  setFormData(prev => ({
    ...prev,
    ...updates
  }));
}

