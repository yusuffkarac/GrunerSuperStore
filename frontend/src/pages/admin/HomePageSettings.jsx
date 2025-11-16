import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { FiSave, FiRefreshCw } from 'react-icons/fi';
import { HiDownload, HiUpload } from 'react-icons/hi';
import settingsService from '../../services/settingsService';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import HelpTooltip from '../../components/common/HelpTooltip';
import { useModalScroll } from '../../hooks/useModalScroll';

// Default homepage settings
const defaultHomepageSettings = {
  hero: {
    title: 'Willkommen bei Grüner SuperStore',
    titleHighlight: 'Grüner SuperStore',
    subtitle: 'Ihr vertrauenswürdiger Online-Supermarkt für frische Produkte',
    registerButton: 'Jetzt registrieren',
    loginButton: 'Anmelden',
  },
  features: {
    title: 'Warum Grüner SuperStore?',
    subtitle: 'Wir bieten Ihnen die beste Einkaufserfahrung mit frischen Produkten und schnellem Service',
    items: [
      {
        title: 'Schnelle Lieferung',
        description: 'Lieferung am selben Tag verfügbar. Ihre Bestellung kommt frisch und schnell zu Ihnen nach Hause.',
      },
      {
        title: 'Frische Garantie',
        description: '100% frische Produkte garantiert. Wir wählen nur die besten Produkte für Sie aus.',
      },
      {
        title: 'Sichere Zahlung',
        description: 'Alle gängigen Zahlungsmethoden werden akzeptiert. Ihre Daten sind bei uns sicher.',
      },
    ],
  },
  howItWorks: {
    title: "So funktioniert's",
    subtitle: 'In nur 4 einfachen Schritten zu Ihren frischen Produkten',
    steps: [
      {
        title: 'Registrieren',
        description: 'Erstellen Sie Ihr kostenloses Konto in wenigen Sekunden',
      },
      {
        title: 'Produkte wählen',
        description: 'Durchsuchen Sie unsere große Auswahl an frischen Produkten',
      },
      {
        title: 'Bestellen',
        description: 'Legen Sie Produkte in den Warenkorb und bestellen Sie',
      },
      {
        title: 'Genießen',
        description: 'Erhalten Sie Ihre Bestellung schnell und bequem zu Hause',
      },
    ],
  },
  cta: {
    title: 'Bereit, mit dem Einkaufen zu beginnen?',
    subtitle: 'Registrieren Sie sich jetzt und entdecken Sie unsere große Auswahl an frischen Produkten',
    registerButton: 'Jetzt registrieren',
    loginButton: 'Bereits Mitglied? Anmelden',
  },
};

function HomePageSettings() {
  const [settings, setSettings] = useState(null);
  const [homepageSettings, setHomepageSettings] = useState(defaultHomepageSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
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
      const appSettings = response.data.settings;
      setSettings(appSettings);
      
      // Eğer homepageSettings varsa kullan, yoksa default
      if (appSettings.homepageSettings) {
        setHomepageSettings({
          ...defaultHomepageSettings,
          ...appSettings.homepageSettings,
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
        homepageSettings,
      });
      toast.success('Homepage-Einstellungen erfolgreich gespeichert');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Möchten Sie wirklich auf die Standardwerte zurücksetzen?')) {
      setHomepageSettings(defaultHomepageSettings);
    }
  };

  // Export Homepage Settings to JSON
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(homepageSettings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `homepage_settings_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Homepage-Einstellungen erfolgreich exportiert');
    } catch (error) {
      console.error('Export-Fehler:', error);
      toast.error('Fehler beim Exportieren der Homepage-Einstellungen');
    }
  };

  // Import Homepage Settings from JSON file
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

      if (!importedData || typeof importedData !== 'object') {
        toast.error('Ungültiges Dateiformat. Erwartet wird ein Homepage-Einstellungen-Objekt.');
        return;
      }

      setImportData(importedData);
      setShowImportModal(true);
      e.target.value = '';
    } catch (error) {
      console.error('Import-Fehler:', error);
      toast.error('Fehler beim Lesen der Datei. Bitte überprüfen Sie das Format.');
    }
  };

  const handleImportConfirm = async () => {
    if (!importData) return;

    try {
      setImporting(true);
      setHomepageSettings({
        ...defaultHomepageSettings,
        ...importData,
      });

      await settingsService.updateSettings({
        homepageSettings: {
          ...defaultHomepageSettings,
          ...importData,
        },
      });

      toast.success('Homepage-Einstellungen erfolgreich importiert und gespeichert');
      setShowImportModal(false);
      setImportData(null);
    } catch (error) {
      console.error('Import-Fehler:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Importieren der Homepage-Einstellungen');
    } finally {
      setImporting(false);
    }
  };

  const updateField = (path, value) => {
    const keys = path.split('.');
    setHomepageSettings((prev) => {
      const newSettings = JSON.parse(JSON.stringify(prev));
      let current = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Homepage-Einstellungen
              <HelpTooltip content="Passen Sie Ihre Startseite an: Slider-Bilder, Willkommenstexte, Slogan und hervorgehobene Kategorien bearbeiten." />
            </h1>
            <p className="text-gray-600 mt-1">
              Verwalten Sie die Texte und Inhalte der Startseite
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 md:justify-end">
            <button
              onClick={handleExport}
              className="w-full sm:w-auto px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm"
              title="Homepage-Einstellungen exportieren"
            >
              <HiDownload className="w-4 h-4" />
              <span className="hidden sm:inline">Exportieren</span>
              <span className="sm:hidden">Export</span>
            </button>
            <label className="w-full sm:w-auto px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer">
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
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              Zurücksetzen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {saving ? 'Wird gespeichert...' : 'Speichern'}
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Hero-Bereich</h2>
          </div>
          <div className="p-4 md:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Haupttitel
              </label>
              <input
                type="text"
                value={homepageSettings.hero.title}
                onChange={(e) => updateField('hero.title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hervorhebung (Highlight)
              </label>
              <input
                type="text"
                value={homepageSettings.hero.titleHighlight}
                onChange={(e) => updateField('hero.titleHighlight', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Untertitel
              </label>
              <textarea
                value={homepageSettings.hero.subtitle}
                onChange={(e) => updateField('hero.subtitle', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registrieren-Button
                </label>
                <input
                  type="text"
                  value={homepageSettings.hero.registerButton}
                  onChange={(e) => updateField('hero.registerButton', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anmelden-Button
                </label>
                <input
                  type="text"
                  value={homepageSettings.hero.loginButton}
                  onChange={(e) => updateField('hero.loginButton', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Özellikler-Bereich</h2>
          </div>
          <div className="p-4 md:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel
              </label>
              <input
                type="text"
                value={homepageSettings.features.title}
                onChange={(e) => updateField('features.title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Untertitel
              </label>
              <textarea
                value={homepageSettings.features.subtitle}
                onChange={(e) => updateField('features.subtitle', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            {homepageSettings.features.items.map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Özellik {index + 1}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titel
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const newItems = [...homepageSettings.features.items];
                        newItems[index].title = e.target.value;
                        setHomepageSettings((prev) => ({
                          ...prev,
                          features: { ...prev.features, items: newItems },
                        }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschreibung
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...homepageSettings.features.items];
                        newItems[index].description = e.target.value;
                        setHomepageSettings((prev) => ({
                          ...prev,
                          features: { ...prev.features, items: newItems },
                        }));
                      }}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">"So funktioniert's"-Bereich</h2>
          </div>
          <div className="p-4 md:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel
              </label>
              <input
                type="text"
                value={homepageSettings.howItWorks.title}
                onChange={(e) => updateField('howItWorks.title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Untertitel
              </label>
              <textarea
                value={homepageSettings.howItWorks.subtitle}
                onChange={(e) => updateField('howItWorks.subtitle', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homepageSettings.howItWorks.steps.map((step, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Schritt {index + 1}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Titel
                      </label>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const newSteps = [...homepageSettings.howItWorks.steps];
                          newSteps[index].title = e.target.value;
                          setHomepageSettings((prev) => ({
                            ...prev,
                            howItWorks: { ...prev.howItWorks, steps: newSteps },
                          }));
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Beschreibung
                      </label>
                      <textarea
                        value={step.description}
                        onChange={(e) => {
                          const newSteps = [...homepageSettings.howItWorks.steps];
                          newSteps[index].description = e.target.value;
                          setHomepageSettings((prev) => ({
                            ...prev,
                            howItWorks: { ...prev.howItWorks, steps: newSteps },
                          }));
                        }}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">CTA-Bereich</h2>
          </div>
          <div className="p-4 md:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel
              </label>
              <input
                type="text"
                value={homepageSettings.cta.title}
                onChange={(e) => updateField('cta.title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Untertitel
              </label>
              <textarea
                value={homepageSettings.cta.subtitle}
                onChange={(e) => updateField('cta.subtitle', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registrieren-Button
                </label>
                <input
                  type="text"
                  value={homepageSettings.cta.registerButton}
                  onChange={(e) => updateField('cta.registerButton', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anmelden-Button
                </label>
                <input
                  type="text"
                  value={homepageSettings.cta.loginButton}
                  onChange={(e) => updateField('cta.loginButton', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Hinweis:</strong> Diese Änderungen wirken sich sofort auf die
                Homepage aus. Benutzer müssen die Seite möglicherweise neu laden, um die
                Änderungen zu sehen.
              </p>
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
            <h3 className="text-xl font-bold text-gray-900">Homepage-Einstellungen importieren</h3>
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
              Die Homepage-Einstellungen werden importiert und automatisch gespeichert.
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

export default HomePageSettings;

