import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import settingsService from '../../services/settingsService';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import HelpTooltip from '../../components/common/HelpTooltip';

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
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Speichern...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Speichern
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Auf Standardwerte zurücksetzen
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
    </div>
  );
}

export default CookieSettings;

