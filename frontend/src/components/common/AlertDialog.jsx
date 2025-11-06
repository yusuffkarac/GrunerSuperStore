import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiX, FiCheck, FiInfo } from 'react-icons/fi';

function AlertDialog({ isOpen, onClose, title, message, type = 'confirm', onConfirm, onCancel, confirmText = 'OK', cancelText = 'Abbrechen' }) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const isAlert = type === 'alert';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isAlert ? handleConfirm : undefined}
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    isAlert ? 'bg-blue-100' : 'bg-amber-100'
                  }`}>
                    {isAlert ? (
                      <FiInfo className="text-blue-600 text-xl" />
                    ) : (
                      <FiAlertCircle className="text-amber-600 text-xl" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={`px-6 pb-6 flex gap-3 ${isAlert ? 'justify-end' : 'justify-end'}`}>
                {!isAlert && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex-1"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2.5 rounded-lg font-medium text-white transition-colors flex-1 flex items-center justify-center gap-2 ${
                    isAlert 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isAlert ? (
                    <>
                      <FiCheck size={18} />
                      {confirmText}
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AlertDialog;

