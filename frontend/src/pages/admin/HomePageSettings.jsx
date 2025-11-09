import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiSave, FiRefreshCw } from 'react-icons/fi';
import settingsService from '../../services/settingsService';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import HelpTooltip from '../../components/common/HelpTooltip';

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
    <div className="container mx-auto px-0 py-6">
      <div className="max-w-5xl mx-auto w-full">
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
      </div>
    </div>
  );
}

export default HomePageSettings;

