import { createContext, useContext, useState } from 'react';
import AlertDialog from '../components/common/AlertDialog';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Abbrechen',
  });

  const showAlert = (message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title: options.title || 'Information',
        message,
        type: 'alert',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Abbrechen',
      });
    });
  };

  const showConfirm = (message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title: options.title || 'Bestätigung',
        message,
        type: 'confirm',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
        confirmText: options.confirmText || 'Bestätigen',
        cancelText: options.cancelText || 'Abbrechen',
      });
    });
  };

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}

