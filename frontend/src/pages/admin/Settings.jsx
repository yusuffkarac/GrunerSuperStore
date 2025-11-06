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

  // Yeni iş ayarları state'leri
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [shippingRules, setShippingRules] = useState([]);
  const [deliverySettings, setDeliverySettings] = useState({
    teslimatAcik: true,
    magazadanTeslimAcik: true,
    teslimatSaatleri: [{ gun: 'Mon-Sun', baslangic: '09:00', bitis: '20:00' }],
    siparisKapanisSaati: '19:30',
  });
  const [paymentOptions, setPaymentOptions] = useState({
    kartKapida: true,
    nakit: true,
    online: false,
    kapidaOdemeUcreti: { type: 'flat', value: 0 },
  });
  const [orderLimits, setOrderLimits] = useState({
    maxSiparisTutari: '',
    maxUrunAdedi: '',
    maxSepetKalemi: '',
  });
  const [storeSettings, setStoreSettings] = useState({
    bakimModu: false,
    bakimModuMesaji: 'Unser Geschäft befindet sich derzeit im Wartungsmodus. Wir sind bald wieder für Sie da.',
  });

  // Mail ayarları
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromEmail: '',
    fromName: 'Gruner SuperStore',
  });
  const [emailNotificationSettings, setEmailNotificationSettings] = useState({
    adminEmail: '',
    notifyOnOrderStatus: {
      accepted: true,
      preparing: false,
      shipped: true,
      delivered: true,
      cancelled: true,
    },
  });
  const [testingEmail, setTestingEmail] = useState(false);

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

      // İş ayarları
      const s = response.data.settings;
      setMinOrderAmount(s.minOrderAmount ?? '');
      setFreeShippingThreshold(s.freeShippingThreshold ?? '');
      setShippingRules(Array.isArray(s.shippingRules) ? s.shippingRules : []);
      setDeliverySettings(
        s.deliverySettings ?? {
          teslimatAcik: true,
          magazadanTeslimAcik: true,
          teslimatSaatleri: [
            { gun: 'Mon-Sun', baslangic: '09:00', bitis: '20:00' },
          ],
          siparisKapanisSaati: '19:30',
        }
      );
      setPaymentOptions(
        s.paymentOptions ?? {
          kartKapida: true,
          nakit: true,
          online: false,
          kapidaOdemeUcreti: { type: 'flat', value: 0 },
        }
      );
      setOrderLimits(
        s.orderLimits ?? {
          maxSiparisTutari: '',
          maxUrunAdedi: '',
          maxSepetKalemi: '',
        }
      );
      setStoreSettings(s.storeSettings ?? {
        bakimModu: false,
        bakimModuMesaji: 'Mağazamız şu anda bakım modunda. Yakında tekrar hizmetinizde olacağız.'
      });

      // Mail ayarları
      if (s.smtpSettings) {
        setSmtpSettings(s.smtpSettings);
      }
      if (s.emailNotificationSettings) {
        setEmailNotificationSettings(s.emailNotificationSettings);
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
        minOrderAmount: minOrderAmount === '' ? null : parseFloat(minOrderAmount),
        freeShippingThreshold:
          freeShippingThreshold === ''
            ? null
            : parseFloat(freeShippingThreshold),
        shippingRules,
        deliverySettings,
        paymentOptions,
        orderLimits: {
          maxSiparisTutari:
            orderLimits.maxSiparisTutari === ''
              ? null
              : parseFloat(orderLimits.maxSiparisTutari),
          maxUrunAdedi:
            orderLimits.maxUrunAdedi === ''
              ? null
              : parseInt(orderLimits.maxUrunAdedi),
          maxSepetKalemi:
            orderLimits.maxSepetKalemi === ''
              ? null
              : parseInt(orderLimits.maxSepetKalemi),
        },
        storeSettings,
        smtpSettings,
        emailNotificationSettings,
      });
      setSettings(response.data.settings);
      if (response.data.settings.orderIdFormat) {
        setOrderIdFormat(response.data.settings.orderIdFormat);
      }
      // geri okuma
      const s2 = response.data.settings;
      setMinOrderAmount(s2.minOrderAmount ?? '');
      setFreeShippingThreshold(s2.freeShippingThreshold ?? '');
      setShippingRules(Array.isArray(s2.shippingRules) ? s2.shippingRules : []);
      setDeliverySettings(s2.deliverySettings ?? deliverySettings);
      setPaymentOptions(s2.paymentOptions ?? paymentOptions);
      setOrderLimits(s2.orderLimits ?? orderLimits);
      setStoreSettings(s2.storeSettings ?? storeSettings);
      // Mail ayarları da geri oku
      if (s2.smtpSettings) setSmtpSettings(s2.smtpSettings);
      if (s2.emailNotificationSettings) setEmailNotificationSettings(s2.emailNotificationSettings);
      toast.success('Einstellungen erfolgreich gespeichert');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  // Test mail gönder
  const handleTestEmail = async () => {
    // Validasyon
    if (!smtpSettings.host || !smtpSettings.user || !smtpSettings.pass || !smtpSettings.fromEmail) {
      toast.error('Bitte füllen Sie alle SMTP-Felder aus');
      return;
    }

    if (!emailNotificationSettings.adminEmail) {
      toast.error('Bitte geben Sie eine Admin-E-Mail-Adresse ein');
      return;
    }

    try {
      setTestingEmail(true);
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({
          to: emailNotificationSettings.adminEmail,
          smtpSettings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Test-E-Mail erfolgreich gesendet! Überprüfen Sie Ihren Posteingang.');
      } else {
        toast.error(data.message || 'Fehler beim Senden der Test-E-Mail');
      }
    } catch (error) {
      console.error('Test mail hatası:', error);
      toast.error('Fehler beim Senden der Test-E-Mail');
    } finally {
      setTestingEmail(false);
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie die allgemeinen Einstellungen der Anwendung
          </p>
        </div>

        {/* 2 Kolonlu Grid Yapısı */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sol Kolon */}
          <div className="space-y-6">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
          </div>

          {/* Sağ Kolon */}
          <div className="space-y-6">
            {/* İş Kuralları: Min/Ücretsiz Kargo ve Kargo Kuralları */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Kargo ve Limitler</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Sipariş Tutarı</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="örn. 20.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ücretsiz Kargo Eşiği</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="örn. 100.00"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Kargo Kuralları</h3>
                <button
                  type="button"
                  onClick={() => setShippingRules([...(shippingRules || []), { min: 0, max: null, fee: 0, type: 'flat' }])}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded"
                >Kural Ekle</button>
              </div>
              <div className="space-y-3">
                {(shippingRules || []).map((r, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min</label>
                      <input type="number" step="0.01" value={r.min ?? ''} onChange={(e)=>{
                        const v = e.target.value === '' ? null : parseFloat(e.target.value);
                        const copy = [...shippingRules]; copy[idx] = { ...copy[idx], min: v }; setShippingRules(copy);
                      }} className="w-full px-2 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max</label>
                      <input type="number" step="0.01" value={r.max ?? ''} onChange={(e)=>{
                        const v = e.target.value === '' ? null : parseFloat(e.target.value);
                        const copy = [...shippingRules]; copy[idx] = { ...copy[idx], max: v }; setShippingRules(copy);
                      }} className="w-full px-2 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Tip</label>
                      <select value={r.type || 'flat'} onChange={(e)=>{
                        const copy = [...shippingRules]; copy[idx] = { ...copy[idx], type: e.target.value };
                        setShippingRules(copy);
                      }} className="w-full px-2 py-2 border rounded">
                        <option value="flat">Sabit</option>
                        <option value="percent">Yüzde</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Değer</label>
                      <input type="number" step="0.01" value={r.type==='percent' ? (r.percent ?? r.value ?? 0) : (r.fee ?? r.value ?? 0)} onChange={(e)=>{
                        const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        const copy = [...shippingRules];
                        copy[idx] = r.type==='percent' ? { ...copy[idx], percent: v, fee: undefined } : { ...copy[idx], fee: v, percent: undefined };
                        setShippingRules(copy);
                      }} className="w-full px-2 py-2 border rounded" />
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={()=>{
                        const copy = [...shippingRules]; copy.splice(idx,1); setShippingRules(copy);
                      }} className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded">Sil</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
          </div>
        </div>

            {/* Teslimat ve Ödeme */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Teslimat ve Ödeme</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Teslimat</h3>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Teslimat Açık</span>
                  <button 
                    onClick={()=>setDeliverySettings({ ...deliverySettings, teslimatAcik: !deliverySettings.teslimatAcik })} 
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      deliverySettings.teslimatAcik ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={deliverySettings.teslimatAcik}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      deliverySettings.teslimatAcik ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Mağazadan Teslim Açık</span>
                  <button 
                    onClick={()=>setDeliverySettings({ ...deliverySettings, magazadanTeslimAcik: !deliverySettings.magazadanTeslimAcik })} 
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      deliverySettings.magazadanTeslimAcik ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={deliverySettings.magazadanTeslimAcik}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      deliverySettings.magazadanTeslimAcik ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sipariş Kapanış Saati</label>
                  <input type="time" value={deliverySettings.siparisKapanisSaati || ''} onChange={(e)=>setDeliverySettings({ ...deliverySettings, siparisKapanisSaati: e.target.value })} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Ödeme</h3>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Kart Kapıda</span>
                  <button 
                    onClick={()=>setPaymentOptions({ ...paymentOptions, kartKapida: !paymentOptions.kartKapida })} 
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      paymentOptions.kartKapida ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={paymentOptions.kartKapida}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      paymentOptions.kartKapida ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Nakit</span>
                  <button 
                    onClick={()=>setPaymentOptions({ ...paymentOptions, nakit: !paymentOptions.nakit })} 
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      paymentOptions.nakit ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={paymentOptions.nakit}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      paymentOptions.nakit ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Online (devre dışı bırakılabilir)</span>
                  <button 
                    onClick={()=>setPaymentOptions({ ...paymentOptions, online: !paymentOptions.online })} 
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      paymentOptions.online ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={paymentOptions.online}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      paymentOptions.online ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kapıda Ücret Tipi</label>
                    <select value={paymentOptions.kapidaOdemeUcreti?.type || 'flat'} onChange={(e)=>setPaymentOptions({ ...paymentOptions, kapidaOdemeUcreti: { ...(paymentOptions.kapidaOdemeUcreti||{}), type: e.target.value } })} className="w-full px-3 py-2 border rounded">
                      <option value="flat">Sabit</option>
                      <option value="percent">Yüzde</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kapıda Ücret Değeri</label>
                    <input type="number" step="0.01" value={paymentOptions.kapidaOdemeUcreti?.value ?? 0} onChange={(e)=>setPaymentOptions({ ...paymentOptions, kapidaOdemeUcreti: { ...(paymentOptions.kapidaOdemeUcreti||{}), value: parseFloat(e.target.value||'0') } })} className="w-full px-3 py-2 border rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
          </div>
        </div>

            {/* Limitler ve Mağaza */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Limitler ve Mağaza</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maks. Sipariş Tutarı</label>
                <input type="number" step="0.01" value={orderLimits.maxSiparisTutari ?? ''} onChange={(e)=>setOrderLimits({ ...orderLimits, maxSiparisTutari: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maks. Ürün Adedi</label>
                <input type="number" value={orderLimits.maxUrunAdedi ?? ''} onChange={(e)=>setOrderLimits({ ...orderLimits, maxUrunAdedi: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maks. Sepet Kalemi</label>
                <input type="number" value={orderLimits.maxSepetKalemi ?? ''} onChange={(e)=>setOrderLimits({ ...orderLimits, maxSepetKalemi: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Mağaza</h3>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Bakım Modu</span>
                <button 
                  onClick={()=>setStoreSettings({ ...storeSettings, bakimModu: !storeSettings.bakimModu })} 
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    storeSettings.bakimModu ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={storeSettings.bakimModu}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    storeSettings.bakimModu ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              {storeSettings.bakimModu && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bakım Modu Mesajı
                  </label>
                  <textarea
                    value={storeSettings.bakimModuMesaji || ''}
                    onChange={(e) => setStoreSettings({ ...storeSettings, bakimModuMesaji: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="Bakım modu mesajınızı buraya yazın..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Bu mesaj bakım modu açıkken müşterilere gösterilecektir.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
          </div>
        </div>
          </div>
        </div>

        {/* E-Mail Ayarları */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">📧 E-Mail Einstellungen</h3>
            <p className="text-sm text-gray-500 mt-1">
              SMTP-Einstellungen und E-Mail-Benachrichtigungen
            </p>
          </div>
          <div className="p-6 space-y-6">
            {/* SMTP Ayarları */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">SMTP-Konfiguration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    value={smtpSettings.host}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port *
                  </label>
                  <input
                    type="number"
                    value={smtpSettings.port}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Benutzername (E-Mail) *
                  </label>
                  <input
                    type="email"
                    value={smtpSettings.user}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passwort / App-Passwort *
                  </label>
                  <input
                    type="password"
                    value={smtpSettings.pass}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, pass: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Absender E-Mail *
                  </label>
                  <input
                    type="email"
                    value={smtpSettings.fromEmail}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="noreply@grunersuperstore.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Absender Name
                  </label>
                  <input
                    type="text"
                    value={smtpSettings.fromName}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Gruner SuperStore"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtpSettings.secure}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, secure: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">SSL/TLS verwenden (Port 465)</span>
                </label>
              </div>
            </div>

            {/* E-Mail Bildirimleri */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900">E-Mail-Benachrichtigungen</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin-E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={emailNotificationSettings.adminEmail}
                  onChange={(e) => setEmailNotificationSettings({ ...emailNotificationSettings, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="admin@grunersuperstore.com"
                />
                <p className="mt-1 text-sm text-gray-500">
                  An diese Adresse werden neue Bestellungen gesendet
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Kunden-Benachrichtigungen bei Statusänderung
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'accepted', label: 'Bestellung akzeptiert' },
                    { key: 'preparing', label: 'In Vorbereitung' },
                    { key: 'shipped', label: 'Versandt' },
                    { key: 'delivered', label: 'Zugestellt' },
                    { key: 'cancelled', label: 'Storniert' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotificationSettings.notifyOnOrderStatus[key]}
                        onChange={(e) =>
                          setEmailNotificationSettings({
                            ...emailNotificationSettings,
                            notifyOnOrderStatus: {
                              ...emailNotificationSettings.notifyOnOrderStatus,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Wählen Sie, bei welchen Statusänderungen Kunden eine E-Mail erhalten sollen
                </p>
              </div>
            </div>

            {/* Test Mail Button */}
            <div className="pt-4 flex items-center space-x-3">
              <button
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {testingEmail ? 'Wird gesendet...' : '📧 Test-E-Mail senden'}
              </button>
              <p className="text-sm text-gray-500">
                Sendet eine Test-E-Mail an die Admin-Adresse
              </p>
            </div>
          </div>
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
