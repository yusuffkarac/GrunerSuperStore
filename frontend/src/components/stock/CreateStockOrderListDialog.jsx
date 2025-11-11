import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMail } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';

function CreateStockOrderListDialog({ open, selectedProducts, onClose, onSuccess }) {
  const [listName, setListName] = useState('');
  const [note, setNote] = useState('');
  const [sendToAdmins, setSendToAdmins] = useState(false);
  const [sendToSupplier, setSendToSupplier] = useState(false);
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierEmails, setSupplierEmails] = useState([]);
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadSupplierEmails();
    }
  }, [open]);

  const loadSupplierEmails = async () => {
    try {
      const response = await adminService.getSupplierEmails();
      setSupplierEmails(response.data || []);
    } catch (error) {
      console.error('Supplier email yükleme hatası:', error);
    }
  };

  const handleSave = async () => {
    if (!listName || listName.trim().length === 0) {
      toast.error('Bitte geben Sie einen Listenamen ein');
      return;
    }

    if (!selectedProducts || selectedProducts.length === 0) {
      toast.error('Bitte wählen Sie mindestens ein Produkt aus');
      return;
    }

    if (sendToSupplier && !supplierEmail && !newSupplierEmail) {
      toast.error('Bitte geben Sie eine Supplier-E-Mail-Adresse ein');
      return;
    }

    setLoading(true);
    try {
      // Yeni supplier email varsa ekle
      let finalSupplierEmail = supplierEmail;
      if (sendToSupplier && newSupplierEmail && !supplierEmail) {
        try {
          const emailResponse = await adminService.addSupplierEmail(newSupplierEmail);
          finalSupplierEmail = emailResponse.data.email;
          await loadSupplierEmails(); // Listeyi yenile
        } catch (error) {
          // Email zaten varsa veya başka bir hata varsa devam et
          finalSupplierEmail = newSupplierEmail;
        }
      }

      const orders = selectedProducts.map((item) => ({
        productId: item.productId,
        orderQuantity: item.orderQuantity,
        orderUnit: item.orderUnit,
      }));

      await adminService.createStockOrderList({
        name: listName.trim(),
        note: note.trim() || null,
        supplierEmail: finalSupplierEmail || null,
        sendToAdmins,
        sendToSupplier,
        orders,
      });

      toast.success('Bestellliste erfolgreich erstellt');
      
      // Reset form
      setListName('');
      setNote('');
      setSendToAdmins(false);
      setSendToSupplier(false);
      setSupplierEmail('');
      setNewSupplierEmail('');
      
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Fehler beim Erstellen der Liste';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setListName('');
    setNote('');
    setSendToAdmins(false);
    setSendToSupplier(false);
    setSupplierEmail('');
    setNewSupplierEmail('');
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
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                  Bestellliste erstellen
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
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                    Listenname *
                  </label>
                  <input
                    type="text"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Listenname eingeben"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                    Notiz (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Notiz eingeben (optional)"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiMail className="w-4 h-4" />
                    E-Mail-Benachrichtigungen
                  </h4>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendToAdmins}
                        onChange={(e) => setSendToAdmins(e.target.checked)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        An Administratoren senden (aus Settings)
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendToSupplier}
                        onChange={(e) => {
                          setSendToSupplier(e.target.checked);
                          if (!e.target.checked) {
                            setSupplierEmail('');
                            setNewSupplierEmail('');
                          }
                        }}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        An Lieferanten senden
                      </span>
                    </label>

                    {sendToSupplier && (
                      <div className="ml-7 space-y-2">
                        {supplierEmails.length > 0 && (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Vorhandene E-Mail auswählen:
                            </label>
                            <select
                              value={supplierEmail}
                              onChange={(e) => {
                                setSupplierEmail(e.target.value);
                                setNewSupplierEmail('');
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">-- Auswählen --</option>
                              {supplierEmails.map((email) => (
                                <option key={email.id} value={email.email}>
                                  {email.email}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            {supplierEmails.length > 0 ? 'Oder neue E-Mail eingeben:' : 'E-Mail-Adresse:'}
                          </label>
                          <input
                            type="email"
                            value={newSupplierEmail}
                            onChange={(e) => {
                              setNewSupplierEmail(e.target.value);
                              if (e.target.value) {
                                setSupplierEmail('');
                              }
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="lieferant@example.com"
                            disabled={!!supplierEmail}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>{selectedProducts?.length || 0}</strong> Produkt(e) werden zur Liste hinzugefügt.
                  </p>
                </div>
              </div>
              <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sticky bottom-0 bg-white">
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !listName || !selectedProducts || selectedProducts.length === 0}
                  className={`px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg transition-colors whitespace-nowrap ${
                    loading || !listName || !selectedProducts || selectedProducts.length === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Wird erstellt...' : 'Liste erstellen'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CreateStockOrderListDialog;

