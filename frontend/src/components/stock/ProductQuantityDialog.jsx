import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';

function ProductQuantityDialog({ open, product, onClose, onSave }) {
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('adet'); // karton/adet/kilo/palet

  const units = [
    { value: 'karton', label: 'Karton' },
    { value: 'adet', label: 'Stück' },
    { value: 'kilo', label: 'Kilo' },
    { value: 'palet', label: 'Palet' },
  ];

  const handleSave = () => {
    if (!quantity || parseInt(quantity) <= 0) {
      return;
    }

    onSave({
      productId: product.id,
      orderQuantity: parseInt(quantity),
      orderUnit: unit,
    });

    // Reset form
    setQuantity('');
    setUnit('adet');
    onClose();
  };

  const handleClose = () => {
    setQuantity('');
    setUnit('adet');
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                  Menge und Einheit eingeben
                </h3>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
              <div className="px-4 md:px-6 py-3 md:py-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>{product?.name || '-'}</strong>
                  </p>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                    Menge *
                  </label>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Menge eingeben"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                    Einheit *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {units.map((u) => (
                      <label
                        key={u.value}
                        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                          unit === u.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="unit"
                          value={u.value}
                          checked={unit === u.value}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{u.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  onClick={handleClose}
                  className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={!quantity || parseInt(quantity) <= 0}
                  className={`px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg transition-colors whitespace-nowrap ${
                    !quantity || parseInt(quantity) <= 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-blue-700'
                  }`}
                >
                  Speichern
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ProductQuantityDialog;

