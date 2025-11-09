import React, { useRef } from 'react';

/**
 * Switch Component
 * Tek boolean değer için kullanılan ortak switch bileşeni
 * 
 * @param {boolean} checked - Switch'in aktif/pasif durumu
 * @param {function} onChange - Değişiklik olduğunda çağrılacak fonksiyon (event parametresi alır)
 * @param {string} label - Switch'in yanında gösterilecek etiket
 * @param {string} id - Switch için benzersiz ID (label ile bağlantı için)
 * @param {string} name - Input'un name attribute'u (form handling için)
 * @param {boolean} disabled - Switch'in devre dışı olup olmadığı
 * @param {string} className - Ek CSS sınıfları
 * @param {string} color - Switch rengi ('green' veya 'primary'), varsayılan 'green'
 */
const Switch = ({
  checked = false,
  onChange,
  label,
  id,
  name,
  disabled = false,
  className = '',
  color = 'green',
}) => {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(e);
    }
  };

  const handleSwitchClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const colorClasses = {
    green: checked ? 'bg-green-600' : 'bg-gray-300',
    primary: checked ? 'bg-primary-600' : 'bg-gray-200',
  };

  const focusRingClasses = {
    green: 'focus:ring-green-500',
    primary: 'focus:ring-primary-500',
  };

  return (
    <label
      className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      htmlFor={id}
    >
      <input
        ref={inputRef}
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
          colorClasses[color]
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} focus-within:outline-none focus-within:ring-2 ${focusRingClasses[color]} focus-within:ring-offset-2`}
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        onClick={handleSwitchClick}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
      {label && (
        <span className="text-sm text-gray-700">{label}</span>
      )}
    </label>
  );
};

export default Switch;

