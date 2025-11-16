import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { HiDownload, HiUpload } from 'react-icons/hi';
import settingsService from '../../services/settingsService';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import HelpTooltip from '../../components/common/HelpTooltip';
import { useModalScroll } from '../../hooks/useModalScroll';

// Varsayılan cookie ayarları
const defaultCookieSettings = {
  title: 'Cookie-Einstellungen',
  description: 'Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten. Einige Cookies sind für den Betrieb der Website erforderlich, während andere uns helfen, diese Website und die Nutzererfahrung zu verbessern (Tracking-Cookies). Sie können selbst entscheiden, ob Sie die Cookies zulassen möchten.',
  privacyPolicyText: 'Weitere Informationen finden Sie in unserer',
  privacyPolicyLink: 'Datenschutzerklärung',
  buttonAcceptAll: 'Alle akzeptieren',
  buttonNecessaryOnly: 'Nur notwendige',
  buttonSettings: 'Einstellungen',
  buttonSave: 'Auswahl speichern',
  buttonCancel: 'Abbrechen',
  settingsTitle: 'Cookie-Einstellungen',
  settingsDescription: 'Wählen Sie aus, welche Cookies Sie zulassen möchten. Sie können Ihre Einstellungen jederzeit ändern.',
  necessaryTitle: 'Notwendige Cookies',
  necessaryDescription: 'Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden. Sie werden normalerweise nur als Reaktion auf Ihre Aktionen gesetzt, z. B. beim Festlegen Ihrer Datenschutzeinstellungen, beim Anmelden oder beim Ausfüllen von Formularen.',
  analyticsTitle: 'Analyse-Cookies',
  analyticsDescription: 'Diese Cookies ermöglichen es uns, die Besucherzahlen und die Herkunft der Besucher zu zählen, damit wir die Leistung unserer Website messen können. Sie helfen uns zu wissen, welche Seiten am beliebtesten sind und wie sich Besucher auf der Website bewegen.',
  marketingTitle: 'Marketing-Cookies',
  marketingDescription: 'Diese Cookies werden verwendet, um Besuchern auf Websites relevante Anzeigen und Marketingkampagnen bereitzustellen. Diese Cookies verfolgen Besucher über Websites hinweg und sammeln Informationen, um angepasste Anzeigen bereitzustellen.',
};

function CookieSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [cookieSettings, setCookieSettings] = useState(defaultCookieSettings);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsService.getSettings();
      const loadedSettings = response.data.settings;
      
      if (loadedSettings?.cookieSettings) {
        setCookieSettings({
          ...defaultCookieSettings,
          ...loadedSettings.cookieSettings,
        });
      }
    } catch (err) {
      setError(err.message || 'Fehler beim Laden der Einstellungen');
      toast.error(err.message || 'Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await settingsService.updateSettings({
        cookieSettings,
      });

      toast.success('Cookie-Einstellungen erfolgreich gespeichert');
    } catch (err) {
      console.error('Kaydetme hatası:', err);
      toast.error(err.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Möchten Sie wirklich auf die Standardwerte zurücksetzen?')) {
      setCookieSettings(defaultCookieSettings);
    }
  };

  // Export Cookie Settings to JSON
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(cookieSettings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cookie_settings_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Cookie-Einstellungen erfolgreich exportiert');
    } catch (error) {
      console.error('Export-Fehler:', error);
      toast.error('Fehler beim Exportieren der Cookie-Einstellungen');
    }
  };

  // Import Cookie Settings from JSON file
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

      // Validierung - temel alanları kontrol et
      if (!importedData || typeof importedData !== 'object') {
        toast.error('Ungültiges Dateiformat. Erwartet wird ein Cookie-Einstellungen-Objekt.');
        return;
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

      // Import edilen verileri ayarlara uygula
      setCookieSettings({
        ...defaultCookieSettings,
        ...importData,
      });

      // Otomatik olarak kaydet
      await settingsService.updateSettings({
        cookieSettings: {
          ...defaultCookieSettings,
          ...importData,
        },
      });

      toast.success('Cookie-Einstellungen erfolgreich importiert und gespeichert');
      setShowImportModal(false);
      setImportData(null);
    } catch (error) {
      console.error('Import-Fehler:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Importieren der Cookie-Einstellungen');
    } finally {
      setImporting(false);
    }
  };

  const updateField = (field, value) => {
    setCookieSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Cookie-Einstellungen
          <HelpTooltip content="Verwalten Sie die Texte und Beschreibungen für die Cookie-Einwilligung. Diese Texte werden den Benutzern angezeigt, wenn sie die Website zum ersten Mal besuchen." />
        </h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie die Cookie-Einwilligungstexte Ihrer Website
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-2 sm:gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 sm:px-6 sm:py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="hidden sm:inline">Speichern...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="hidden sm:inline">Speichern</span>
              <span className="sm:hidden">Save</span>
            </>
          )}
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-2 sm:px-4 sm:py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5 text-xs sm:text-sm"
          title="Cookie-Einstellungen exportieren"
        >
          <HiDownload className="w-4 h-4" />
          <span className="hidden sm:inline">Exportieren</span>
          <span className="sm:hidden">Export</span>
        </button>
        <label className="px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer">
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
          onClick={handleReset}
          className="px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Auf Standardwerte zurücksetzen</span>
          <span className="sm:hidden">Reset</span>
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Banner Ayarları */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Banner-Einstellungen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel
              </label>
              <input
                type="text"
                value={cookieSettings.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Cookie-Einstellungen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <textarea
                value={cookieSettings.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Beschreibung der Cookie-Verwendung..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datenschutzerklärung Text
                </label>
                <input
                  type="text"
                  value={cookieSettings.privacyPolicyText}
                  onChange={(e) => updateField('privacyPolicyText', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datenschutzerklärung Link Text
                </label>
                <input
                  type="text"
                  value={cookieSettings.privacyPolicyLink}
                  onChange={(e) => updateField('privacyPolicyLink', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buton Metinleri */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Button-Texte</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alle akzeptieren
              </label>
              <input
                type="text"
                value={cookieSettings.buttonAcceptAll}
                onChange={(e) => updateField('buttonAcceptAll', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nur notwendige
              </label>
              <input
                type="text"
                value={cookieSettings.buttonNecessaryOnly}
                onChange={(e) => updateField('buttonNecessaryOnly', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Einstellungen
              </label>
              <input
                type="text"
                value={cookieSettings.buttonSettings}
                onChange={(e) => updateField('buttonSettings', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auswahl speichern
              </label>
              <input
                type="text"
                value={cookieSettings.buttonSave}
                onChange={(e) => updateField('buttonSave', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Abbrechen
              </label>
              <input
                type="text"
                value={cookieSettings.buttonCancel}
                onChange={(e) => updateField('buttonCancel', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Settings Modal Ayarları */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Einstellungen-Modal</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel
              </label>
              <input
                type="text"
                value={cookieSettings.settingsTitle}
                onChange={(e) => updateField('settingsTitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <textarea
                value={cookieSettings.settingsDescription}
                onChange={(e) => updateField('settingsDescription', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Cookie Kategorileri */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cookie-Kategorien</h2>
          
          <div className="space-y-6">
            {/* Gerekli Çerezler */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Notwendige Cookies</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={cookieSettings.necessaryTitle}
                    onChange={(e) => updateField('necessaryTitle', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={cookieSettings.necessaryDescription}
                    onChange={(e) => updateField('necessaryDescription', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Analitik Çerezler */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Analyse-Cookies</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={cookieSettings.analyticsTitle}
                    onChange={(e) => updateField('analyticsTitle', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={cookieSettings.analyticsDescription}
                    onChange={(e) => updateField('analyticsDescription', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Pazarlama Çerezleri */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Marketing-Cookies</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={cookieSettings.marketingTitle}
                    onChange={(e) => updateField('marketingTitle', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={cookieSettings.marketingDescription}
                    onChange={(e) => updateField('marketingDescription', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && importData && (
        <ImportModal
          importData={importData}
          importing={importing}
          onConfirm={handleImportConfirm}
          onClose={() => {
            setShowImportModal(false);
            setImportData(null);
          }}
          isOpen={showImportModal}
        />
      )}
    </div>
  );
}

// Import Modal Component
function ImportModal({ importData, importing, onConfirm, onClose, isOpen }) {
  useModalScroll(isOpen);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Cookie-Einstellungen importieren</h3>
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
              Die Cookie-Einstellungen werden importiert und automatisch gespeichert.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Vorschau der zu importierenden Einstellungen:</h4>
            <div className="space-y-2 text-sm">
              {Object.keys(importData).slice(0, 15).map((key) => (
                <div key={key} className="border-b border-gray-100 pb-2 last:border-0">
                  <p className="font-medium text-gray-900">{key}:</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {typeof importData[key] === 'string' 
                      ? importData[key].substring(0, 100) + (importData[key].length > 100 ? '...' : '')
                      : JSON.stringify(importData[key]).substring(0, 100)}
                  </p>
                </div>
              ))}
              {Object.keys(importData).length > 15 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  ... und {Object.keys(importData).length - 15} weitere Einstellungen
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
                'Importieren & Speichern'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookieSettings;

