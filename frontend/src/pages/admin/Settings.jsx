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
  const [orderIdFormat, setOrderIdFormat] = useState({
    prefix: 'GS',
    separator: '-',
    dateFormat: 'YYYYMMDD',
    numberFormat: 'sequential', // sequential veya random
    numberPadding: 4,
    resetPeriod: 'daily',
    caseTransform: 'uppercase',
    startFrom: 1,
  });

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

      // OrderIdFormat'ı ayarla
      if (response.data.settings.orderIdFormat) {
        setOrderIdFormat(response.data.settings.orderIdFormat);
      }
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
        orderIdFormat: orderIdFormat,
      });
      setSettings(response.data.settings);
      if (response.data.settings.orderIdFormat) {
        setOrderIdFormat(response.data.settings.orderIdFormat);
      }
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

  // Sipariş ID önizlemesi oluştur
  const generatePreview = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    let dateStr = '';
    if (orderIdFormat.dateFormat && orderIdFormat.dateFormat !== 'none') {
      switch (orderIdFormat.dateFormat) {
        case 'YYYYMMDD':
          dateStr = `${year}${month}${day}`;
          break;
        case 'YYMMDD':
          dateStr = `${String(year).slice(-2)}${month}${day}`;
          break;
        case 'DDMMYYYY':
          dateStr = `${day}${month}${year}`;
          break;
        case 'DDMMYY':
          dateStr = `${day}${month}${String(year).slice(-2)}`;
          break;
        case 'YYYYMM':
          dateStr = `${year}${month}`;
          break;
        case 'YYMM':
          dateStr = `${String(year).slice(-2)}${month}`;
          break;
        default:
          dateStr = `${year}${month}${day}`;
      }
    }

    const prefix = orderIdFormat.prefix || '';
    const separator = orderIdFormat.separator || '';

    let sequenceStr = '';
    if (orderIdFormat.numberFormat === 'random') {
      // Random numara üret (örnek)
      const randomNum = Math.floor(Math.random() * Math.pow(10, orderIdFormat.numberPadding || 4));
      sequenceStr = randomNum.toString().padStart(orderIdFormat.numberPadding || 4, '0');
    } else {
      // Sequential numara
      const start = parseInt(orderIdFormat.startFrom ?? 1) || 1;
      sequenceStr = start.toString().padStart(orderIdFormat.numberPadding || 4, '0');
    }

    let preview = '';
    if (dateStr) {
      preview = `${prefix}${separator}${dateStr}${separator}${sequenceStr}`;
    } else {
      preview = `${prefix}${separator}${sequenceStr}`;
    }

    // Case transform
    if (orderIdFormat.caseTransform === 'uppercase') {
      preview = preview.toUpperCase();
    } else if (orderIdFormat.caseTransform === 'lowercase') {
      preview = preview.toLowerCase();
    }

    return preview;
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

        {/* Sipariş ID Format Ayarları */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Bestellungs-ID Format
            </h2>

            {/* Önizleme */}
            <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Vorschau</p>
                  <p className="text-2xl font-mono font-bold text-primary-700">
                    {generatePreview()}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <svg
                    className="w-8 h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Prefix */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Präfix
                </label>
                <input
                  type="text"
                  value={orderIdFormat.prefix}
                  onChange={(e) =>
                    setOrderIdFormat({ ...orderIdFormat, prefix: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="z.B. GS, BEST, ORD"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Text am Anfang der Bestellungs-ID
                </p>
              </div>

              {/* Separator */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trennzeichen
                </label>
                <select
                  value={orderIdFormat.separator}
                  onChange={(e) =>
                    setOrderIdFormat({ ...orderIdFormat, separator: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="-">Bindestrich (-)</option>
                  <option value="_">Unterstrich (_)</option>
                  <option value=".">Punkt (.)</option>
                  <option value="">Kein Trennzeichen</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Zeichen zwischen den Teilen der ID
                </p>
              </div>

              {/* Datumsformat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datumsformat
                </label>
                <select
                  value={orderIdFormat.dateFormat}
                  onChange={(e) =>
                    setOrderIdFormat({ ...orderIdFormat, dateFormat: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="YYYYMMDD">JJJJMMTT (z.B. 20250106)</option>
                  <option value="YYMMDD">JJMMTT (z.B. 250106)</option>
                  <option value="DDMMYYYY">TTMMJJJJ (z.B. 06012025)</option>
                  <option value="DDMMYY">TTMMJJ (z.B. 060125)</option>
                  <option value="YYYYMM">JJJJMM (z.B. 202501)</option>
                  <option value="YYMM">JJMM (z.B. 2501)</option>
                  <option value="none">Kein Datum</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Datumsformat in der Bestellungs-ID
                </p>
              </div>

              {/* Nummernformat - Sequential oder Random */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nummernformat
                </label>
                <select
                  value={orderIdFormat.numberFormat}
                  onChange={(e) =>
                    setOrderIdFormat({ ...orderIdFormat, numberFormat: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="sequential">Fortlaufend (1, 2, 3...)</option>
                  <option value="random">Zufällig (7283, 1924, 5617...)</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Fortlaufende Nummerierung oder zufällige Nummern
                </p>
              </div>

              {/* Zahlenformat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zahlenlänge (Auffüllung)
                </label>
                <select
                  value={orderIdFormat.numberPadding}
                  onChange={(e) =>
                    setOrderIdFormat({
                      ...orderIdFormat,
                      numberPadding: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="1">1 Stelle (1, 2, 3...)</option>
                  <option value="2">2 Stellen (01, 02, 03...)</option>
                  <option value="3">3 Stellen (001, 002, 003...)</option>
                  <option value="4">4 Stellen (0001, 0002, 0003...)</option>
                  <option value="5">5 Stellen (00001, 00002...)</option>
                  <option value="6">6 Stellen (000001, 000002...)</option>
                  <option value="7">7 Stellen (0000001, 0000002...)</option>
                  <option value="8">8 Stellen (00000001, 00000002...)</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Anzahl der Ziffern für die laufende Nummer
                </p>
              </div>

              {/* Reset Period - sadece sequential seçiliyse göster */}
              {orderIdFormat.numberFormat === 'sequential' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zähler zurücksetzen
                    </label>
                    <select
                      value={orderIdFormat.resetPeriod}
                      onChange={(e) =>
                        setOrderIdFormat({ ...orderIdFormat, resetPeriod: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="daily">Täglich</option>
                      <option value="monthly">Monatlich</option>
                      <option value="yearly">Jährlich</option>
                      <option value="never">Niemals (fortlaufend)</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Wann die Nummerierung wieder bei 1 beginnt
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Startnummer
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={orderIdFormat.startFrom ?? 1}
                      onChange={(e) =>
                        setOrderIdFormat({
                          ...orderIdFormat,
                          startFrom: Math.max(1, parseInt(e.target.value || '1')),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="z.B. 1"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Erste laufende Nummer (mind. 1)
                    </p>
                  </div>
                </div>
              )}

              {/* Case Transform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Großschreibung
                </label>
                <select
                  value={orderIdFormat.caseTransform}
                  onChange={(e) =>
                    setOrderIdFormat({
                      ...orderIdFormat,
                      caseTransform: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="uppercase">GROSSBUCHSTABEN</option>
                  <option value="lowercase">kleinbuchstaben</option>
                  <option value="none">Keine Änderung</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Groß-/Kleinschreibung der Bestellungs-ID
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
                <strong>Hinweis:</strong> Diese Einstellungen wirken sich auf alle neuen
                Bestellungen aus. Bereits vorhandene Bestellungen behalten ihre
                ursprüngliche ID. Die Änderungen werden sofort nach dem Speichern
                angewendet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
