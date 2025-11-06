import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import settingsService from '../../services/settingsService';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';

// Admin Ayarlar Sayfası
function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Ayarları yükle
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsService.getSettings();
      setSettings(response.data.settings);
    } catch (err) {
      setError(err.message || 'Fehler beim Laden der Einstellungen');
      toast.error(err.message || 'Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  // Ayarları kaydet
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await settingsService.updateSettings({
        guestCanViewProducts: settings.guestCanViewProducts,
      });
      setSettings(response.data.settings);
      toast.success('Einstellungen erfolgreich gespeichert');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  // Toggle switch
  const handleToggle = () => {
    setSettings({
      ...settings,
      guestCanViewProducts: !settings.guestCanViewProducts,
    });
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie die allgemeinen Einstellungen der Anwendung
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Produktansicht für Gäste
            </h2>

            {/* Toggle Option */}
            <div className="flex items-center justify-between py-4 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  Produkte und Kategorien für nicht angemeldete Benutzer anzeigen
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Wenn aktiviert, können nicht angemeldete Benutzer Kategorien und Produkte
                  durchsuchen. Wenn deaktiviert, müssen sich Benutzer anmelden, um
                  Produkte anzusehen.
                </p>
              </div>

              <div className="ml-6">
                <button
                  onClick={handleToggle}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    settings?.guestCanViewProducts ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={settings?.guestCanViewProducts}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings?.guestCanViewProducts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Current Status */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    settings?.guestCanViewProducts ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <p className="ml-3 text-sm text-gray-700">
                  Status:{' '}
                  <span className="font-medium">
                    {settings?.guestCanViewProducts
                      ? 'Gäste können Produkte sehen'
                      : 'Gäste können keine Produkte sehen'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
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
                <strong>Hinweis:</strong> Diese Einstellungen wirken sich sofort auf die
                Website aus. Benutzer müssen die Seite möglicherweise neu laden, um die
                Änderungen zu sehen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
