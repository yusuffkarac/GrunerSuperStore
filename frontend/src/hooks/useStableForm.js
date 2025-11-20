import { useState, useCallback } from 'react';

/**
 * Form state yönetimi için stable hook
 * Input focus kaybını önler
 * 
 * @param {Object} initialData - Form'un başlangıç verileri
 * @returns {Array} [formData, updateField, setFormData]
 * 
 * @example
 * const [formData, updateField, setFormData] = useStableForm({
 *   name: '',
 *   email: ''
 * });
 * 
 * // Input'ta kullanım:
 * <input
 *   value={formData.name}
 *   onChange={(e) => updateField('name', e.target.value)}
 * />
 */
export function useStableForm(initialData) {
  const [formData, setFormData] = useState(initialData);

  // Stable update function - functional update pattern kullanır
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Multiple fields update
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  return [formData, updateField, setFormData, updateFields, resetForm];
}

