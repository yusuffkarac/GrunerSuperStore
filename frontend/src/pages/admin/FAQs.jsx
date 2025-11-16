import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { FiRefreshCw } from 'react-icons/fi';
import { HiPlus, HiPencil, HiTrash, HiCheck, HiX, HiDownload, HiUpload, HiRefresh } from 'react-icons/hi';
import faqService from '../../services/faqService';
import Loading from '../../components/common/Loading';
import HelpTooltip from '../../components/common/HelpTooltip';
import { useModalScroll } from '../../hooks/useModalScroll';
import { useAlert } from '../../contexts/AlertContext';

const FAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const [importData, setImportData] = useState(null);
  const fileInputRef = useRef(null);
  const { showConfirm } = useAlert();

  // Form state
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    sortOrder: 0,
    isActive: true,
  });

  // Modal scroll yönetimi
  useModalScroll(showModal || showImportModal);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const response = await faqService.getAllFAQs();
      setFaqs(response.data.faqs || []);
    } catch (error) {
      console.error('Fehler beim Laden der FAQs:', error);
      toast.error('Fehler beim Laden der FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.question || !formData.answer) {
      toast.error('Bitte füllen Sie Frage und Antwort aus');
      return;
    }

    try {
      if (editingFAQ) {
        await faqService.updateFAQ(editingFAQ.id, formData);
        toast.success('FAQ erfolgreich aktualisiert');
      } else {
        await faqService.createFAQ(formData);
        toast.success('FAQ erfolgreich erstellt');
      }

      setShowModal(false);
      resetForm();
      loadFAQs();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error(error.response?.data?.message || 'Ein Fehler ist aufgetreten');
    }
  };

  const handleEdit = (faq) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || '',
      sortOrder: faq.sortOrder || 0,
      isActive: faq.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm(
      'Möchten Sie diese FAQ wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      {
        title: 'FAQ löschen?',
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
      }
    );

    if (!confirmed) return;

    try {
      await faqService.deleteFAQ(id);
      toast.success('FAQ erfolgreich gelöscht');
      loadFAQs();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Fehler beim Löschen der FAQ');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await faqService.toggleActive(id);
      toast.success('Status erfolgreich geändert');
      loadFAQs();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Fehler beim Ändern des Status');
    }
  };

  const handleResetToDefaults = async () => {
    const confirmed = await showConfirm(
      'Alle aktuellen FAQs werden gelöscht und durch Standard-FAQs ersetzt. Diese Aktion kann nicht rückgängig gemacht werden.',
      {
        title: 'Auf Standardeinstellungen zurücksetzen?',
        confirmText: 'Zurücksetzen',
        cancelText: 'Abbrechen',
      }
    );

    if (!confirmed) return;

    try {
      setResetting(true);
      const response = await faqService.resetToDefaults();
      toast.success(response.message || 'Standard-FAQs erfolgreich geladen');
      loadFAQs();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Zurücksetzen auf Standardeinstellungen');
    } finally {
      setResetting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      category: '',
      sortOrder: 0,
      isActive: true,
    });
    setEditingFAQ(null);
  };

  // Export FAQs to JSON
  const handleExport = () => {
    try {
      const exportData = faqs.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
        category: faq.category || '',
        sortOrder: faq.sortOrder || 0,
        isActive: faq.isActive !== undefined ? faq.isActive : true,
      }));

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `faqs_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${faqs.length} FAQ(s) erfolgreich exportiert`);
    } catch (error) {
      console.error('Export-Fehler:', error);
      toast.error('Fehler beim Exportieren der FAQs');
    }
  };

  // Import FAQs from JSON file
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Bitte wählen Sie eine JSON-Datei aus');
      return;
    }

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      if (!Array.isArray(importedData)) {
        toast.error('Ungültiges Dateiformat. Erwartet wird ein Array von FAQs.');
        return;
      }

      // Validierung
      for (const faq of importedData) {
        if (!faq.question || !faq.answer) {
          toast.error('Jede FAQ muss Frage und Antwort haben');
          return;
        }
      }

      // Dosya verilerini sakla ve modal'ı aç
      setImportData(importedData);
      setShowImportModal(true);
      e.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Import-Fehler:', error);
      toast.error('Fehler beim Lesen der Datei. Bitte überprüfen Sie das Format.');
    }
  };

  const handleImportConfirm = async () => {
    if (!importData) return;

    try {
      setImporting(true);

      const response = await faqService.bulkImport(importData, replaceAll);

      if (response.data.errors && response.data.errors.length > 0) {
        toast.warning(
          `${response.data.created} FAQ(s) importiert, ${response.data.errors.length} Fehler aufgetreten`
        );
      } else {
        toast.success(`${response.data.created} FAQ(s) erfolgreich importiert`);
      }

      setShowImportModal(false);
      setReplaceAll(false);
      setImportData(null);
      loadFAQs();
    } catch (error) {
      console.error('Import-Fehler:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Importieren der FAQs');
    } finally {
      setImporting(false);
    }
  };

  // Kategorileri topla
  const categories = [...new Set(faqs.map((faq) => faq.category || 'Allgemein').filter(Boolean))];

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          FAQ-Verwaltung
          <HelpTooltip content="Verwalten Sie häufig gestellte Fragen. Sie können Fragen und Antworten erstellen, bearbeiten und kategorisieren." />
        </h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie die häufig gestellten Fragen Ihrer Kunden
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-2 sm:gap-3">
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-3 py-2 sm:px-4 sm:py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-1.5 text-xs sm:text-sm"
        >
          <HiPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Neue FAQ hinzufügen</span>
          <span className="sm:hidden">Hinzufügen</span>
        </button>
        <button
          onClick={handleExport}
          disabled={faqs.length === 0}
          className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-xs sm:text-sm"
          title="FAQs exportieren"
        >
          <HiDownload className="w-4 h-4" />
          <span className="hidden sm:inline">Exportieren</span>
          <span className="sm:hidden">Export</span>
        </button>
        <label className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer">
          <HiUpload className="w-4 h-4" />
          <span className="hidden sm:inline">Importieren</span>
          <span className="sm:hidden">Import</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        <button
          onClick={handleResetToDefaults}
          disabled={resetting}
          className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-xs sm:text-sm"
        >
          <FiRefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Zurücksetzen</span>
          <span className="sm:hidden">Reset</span>
        </button>
      </div>

      {/* FAQs Liste */}
      {faqs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 mb-2 text-lg font-medium">Noch keine FAQs vorhanden</p>
          <p className="text-gray-500 mb-6 text-sm">
            Sie können Standard-FAQs laden oder eigene erstellen
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleResetToDefaults}
              disabled={resetting}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <HiRefresh className={`w-5 h-5 ${resetting ? 'animate-spin' : ''}`} />
              {resetting ? 'Wird geladen...' : 'Standard-FAQs laden'}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Eigene FAQ erstellen
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sortierung
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategorie
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {faqs.map((faq) => (
                    <tr key={faq.id} className={!faq.isActive ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {faq.sortOrder}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{faq.question}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {faq.category || 'Allgemein'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(faq.id)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            faq.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {faq.isActive ? (
                            <>
                              <HiCheck className="w-4 h-4 mr-1" />
                              Aktiv
                            </>
                          ) : (
                            <>
                              <HiX className="w-4 h-4 mr-1" />
                              Inaktiv
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(faq)}
                            className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                            title="Bearbeiten"
                          >
                            <HiPencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(faq.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <HiTrash className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${!faq.isActive ? 'bg-gray-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500">#{faq.sortOrder}</span>
                      <button
                        onClick={() => handleToggleActive(faq.id)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          faq.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {faq.isActive ? (
                          <>
                            <HiCheck className="w-3 h-3 mr-1" />
                            Aktiv
                          </>
                        ) : (
                          <>
                            <HiX className="w-3 h-3 mr-1" />
                            Inaktiv
                          </>
                        )}
                      </button>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{faq.question}</h3>
                    {faq.category && (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        {faq.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="p-1.5 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                      title="Bearbeiten"
                    >
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Löschen"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: faq.answer }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAQ Modal */}
      {showModal && (
        <FAQModal
          formData={formData}
          setFormData={setFormData}
          editingFAQ={editingFAQ}
          categories={categories}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          isOpen={showModal}
        />
      )}

      {/* Import Modal */}
      {showImportModal && importData && (
        <ImportModal
          importData={importData}
          replaceAll={replaceAll}
          setReplaceAll={setReplaceAll}
          importing={importing}
          onConfirm={handleImportConfirm}
          onClose={() => {
            setShowImportModal(false);
            setImportData(null);
            setReplaceAll(false);
          }}
          isOpen={showImportModal}
        />
      )}
    </div>
  );
};

// FAQ Modal Component
function FAQModal({ formData, setFormData, editingFAQ, categories, onSubmit, onClose, isOpen }) {
  useModalScroll(isOpen);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              {editingFAQ ? 'FAQ bearbeiten' : 'Neue FAQ hinzufügen'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Frage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frage <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="z.B. Wie kann ich bestellen?"
              required
            />
          </div>

          {/* Antwort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Antwort <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={8}
              placeholder="Geben Sie hier die Antwort ein..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              HTML ist erlaubt (z.B. &lt;strong&gt;, &lt;br&gt;, &lt;a&gt;)
            </p>
          </div>

          {/* Kategorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorie
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="z.B. Bestellung, Lieferung, Zahlung"
              list="categories"
            />
            <datalist id="categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            <p className="text-xs text-gray-500 mt-1">
              Optional: Kategorisieren Sie die FAQ für bessere Übersicht
            </p>
          </div>

          {/* Sortierung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sortierung
            </label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Niedrigere Zahlen werden zuerst angezeigt
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
              Aktiv
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              {editingFAQ ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Import Modal Component
function ImportModal({ importData, replaceAll, setReplaceAll, importing, onConfirm, onClose, isOpen }) {
  useModalScroll(isOpen);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">FAQs importieren</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{importData.length} FAQ(s)</strong> werden importiert.
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={replaceAll}
                onChange={(e) => setReplaceAll(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Alle bestehenden FAQs löschen und durch importierte ersetzen
              </span>
            </label>
            {replaceAll && (
              <p className="text-xs text-red-600 ml-6">
                ⚠️ Warnung: Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Vorschau der zu importierenden FAQs:</h4>
            <div className="space-y-2">
              {importData.slice(0, 10).map((faq, index) => (
                <div key={index} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                  <p className="font-medium text-gray-900">{faq.question}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{faq.answer}</p>
                </div>
              ))}
              {importData.length > 10 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  ... und {importData.length - 10} weitere FAQ(s)
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={importing}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Importiere...
                </>
              ) : (
                'Importieren'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FAQs;

