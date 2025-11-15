import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import settingsService from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import HelpTooltip from '../../components/common/HelpTooltip';
import Switch from '../../components/common/Switch';

// Admin-Einstellungsseite
function Settings() {
  const { themeColors } = useTheme();
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
    siparisBaslangicSaati: '09:00',
    siparisKapanisSaati: '19:30',
    distanceLimits: {
      pickupMaxDistance: null,
      deliveryMaxDistance: null,
    },
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
  const [customerCancellationSettings, setCustomerCancellationSettings] = useState({
    allowedStatuses: ['pending', 'accepted'], // Status, in denen Kunden stornieren können
  });
  const [storeSettings, setStoreSettings] = useState({
    bakimModu: false,
    bakimModuMesaji: 'Unser Geschäft befindet sich derzeit im Wartungsmodus. Wir sind bald wieder für Sie da.',
    adminPanelTitle: '',
    storeLocation: {
      latitude: null,
      longitude: null,
    },
    defaultCities: ['Waiblingen'], // Adres araması için varsayılan şehirler (array)
    companyInfo: {
      name: '',
      address: '',
      phone: '',
      email: '',
      taxNumber: '',
      registrationNumber: '',
    },
  });
  const [newCityInput, setNewCityInput] = useState(''); // Yeni şehir ekleme input'u

  // E-Mail-Einstellungen
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
  const [pageReady, setPageReady] = useState(false);

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
          siparisBaslangicSaati: '09:00',
          siparisKapanisSaati: '19:30',
          distanceLimits: {
            pickupMaxDistance: null,
            deliveryMaxDistance: null,
          },
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
      setCustomerCancellationSettings(
        s.customerCancellationSettings ?? {
          allowedStatuses: ['pending', 'accepted'],
        }
      );
      setStoreSettings(s.storeSettings ?? {
        bakimModu: false,
        bakimModuMesaji: 'Unser Geschäft befindet sich derzeit im Wartungsmodus. Wir sind bald wieder für Sie da.',
        adminPanelTitle: '',
        storeLocation: {
          latitude: null,
          longitude: null,
        },
        defaultCities: ['Waiblingen'], // Adres araması için varsayılan şehirler (array)
        companyInfo: {
          name: '',
          address: '',
          phone: '',
          email: '',
          taxNumber: '',
          registrationNumber: '',
        },
      });
      
      // Eski defaultCity varsa defaultCities'e çevir (geriye dönük uyumluluk)
      if (s.storeSettings?.defaultCity && !s.storeSettings?.defaultCities) {
        setStoreSettings(prev => ({
          ...prev,
          defaultCities: [s.storeSettings.defaultCity],
        }));
      }

      // E-Mail-Einstellungen
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
      // Sayfanın tamamen render olması için kısa bir gecikme
      setTimeout(() => {
        setPageReady(true);
      }, 100);
    }
  };

  // Ayarları kaydet
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await settingsService.updateSettings({
        guestCanViewProducts: settings.guestCanViewProducts,
        showOutOfStockProducts: settings.showOutOfStockProducts !== false,
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
        customerCancellationSettings,
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
      setCustomerCancellationSettings(s2.customerCancellationSettings ?? customerCancellationSettings);
      // E-Mail-Einstellungen auch zurücklesen
      if (s2.smtpSettings) setSmtpSettings(s2.smtpSettings);
      if (s2.emailNotificationSettings) setEmailNotificationSettings(s2.emailNotificationSettings);
      toast.success('Einstellungen erfolgreich gespeichert');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  // Test-E-Mail senden
  const handleTestEmail = async () => {
    // Validierung
    if (!smtpSettings.host || !smtpSettings.user || !smtpSettings.pass || !smtpSettings.fromEmail) {
      toast.error('Bitte füllen Sie alle SMTP-Felder aus');
      return;
    }

    if (!emailNotificationSettings.adminEmail || !emailNotificationSettings.adminEmail.trim()) {
      toast.error('Bitte geben Sie mindestens eine Admin-E-Mail-Adresse ein');
      return;
    }

    // İlk email adresini al (virgülle ayrılmış ise)
    const emails = emailNotificationSettings.adminEmail.split(',').map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      toast.error('Bitte geben Sie mindestens eine gültige E-Mail-Adresse ein');
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
          to: emails[0], // Test için ilk email adresini kullan
          smtpSettings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Test-E-Mail erfolgreich an ${emails[0]} gesendet! Überprüfen Sie Ihren Posteingang.`);
      } else {
        toast.error(data.message || 'Fehler beim Senden der Test-E-Mail');
      }
    } catch (error) {
      console.error('Test-E-Mail-Fehler:', error);
      toast.error('Fehler beim Senden der Test-E-Mail');
    } finally {
      setTestingEmail(false);
    }
  };

  // Toggle switch - useCallback ile optimize edildi
  const handleToggle = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      guestCanViewProducts: !prev.guestCanViewProducts,
    }));
  }, []);

  // Toggle switch for out of stock products - useCallback ile optimize edildi
  const handleToggleOutOfStock = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      showOutOfStockProducts: prev.showOutOfStockProducts === false ? true : false,
    }));
  }, []);

  // Bestellungs-ID Vorschau erstellen - useMemo ile optimize edildi
  const preview = useMemo(() => {
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
      // Zufällige Nummer generieren (Beispiel)
      const randomNum = Math.floor(Math.random() * Math.pow(10, orderIdFormat.numberPadding || 4));
      sequenceStr = randomNum.toString().padStart(orderIdFormat.numberPadding || 4, '0');
    } else {
      // Sequenzielle Nummer
      const start = parseInt(orderIdFormat.startFrom ?? 1) || 1;
      sequenceStr = start.toString().padStart(orderIdFormat.numberPadding || 4, '0');
    }

    let previewStr = '';
    if (dateStr) {
      previewStr = `${prefix}${separator}${dateStr}${separator}${sequenceStr}`;
    } else {
      previewStr = `${prefix}${separator}${sequenceStr}`;
    }

    // Case transform
    if (orderIdFormat.caseTransform === 'uppercase') {
      previewStr = previewStr.toUpperCase();
    } else if (orderIdFormat.caseTransform === 'lowercase') {
      previewStr = previewStr.toLowerCase();
    }

    return previewStr;
  }, [orderIdFormat]);

  if (loading || !pageReady) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="w-full" style={{ minHeight: '100%' }}>
      <div className="max-w-7xl mx-auto" style={{ contain: 'layout style paint' }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Einstellungen
            <HelpTooltip content="Konfigurieren Sie allgemeine Systemeinstellungen: Shop-Informationen, Bestelleinstellungen und Benachrichtigungen." />
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie die allgemeinen Einstellungen der Anwendung
          </p>
        </div>

        {/* 2-Spalten-Grid-Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Linke Spalte */}
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

            {/* Toggle Option - Out of Stock Products */}
            <div className="flex items-center justify-between py-4 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  Nicht vorrätige Produkte anzeigen
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Wenn aktiviert, werden Produkte mit Stückzahl 0 oder weniger auch
                  Kunden angezeigt. Wenn deaktiviert, werden nur Produkte mit verfügbarem
                  Bestand angezeigt.
                </p>
              </div>

              <div className="ml-6">
                <button
                  onClick={handleToggleOutOfStock}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    settings?.showOutOfStockProducts !== false ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={settings?.showOutOfStockProducts !== false}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings?.showOutOfStockProducts !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Current Status */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
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
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    settings?.showOutOfStockProducts !== false ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <p className="ml-3 text-sm text-gray-700">
                  Bestandsstatus:{' '}
                  <span className="font-medium">
                    {settings?.showOutOfStockProducts !== false
                      ? 'Nicht vorrätige Produkte werden angezeigt'
                      : 'Nur vorrätige Produkte werden angezeigt'}
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

            {/* Bestellungs-ID Format-Einstellungen */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Bestellungs-ID Format
                </h2>

            {/* Önizleme */}
            <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 mb-1">Vorschau</p>
                  <p className="text-2xl font-mono font-bold text-primary-700 break-all">
                    {preview}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm flex-shrink-0">
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
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Präfix
                  <HelpTooltip content="Text am Anfang der Bestellungs-ID. Beispiel: 'GS' ergibt Bestellungen wie GS-20250106-0001" />
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
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Trennzeichen
                  <HelpTooltip content="Zeichen zwischen den Teilen der Bestellungs-ID. Beispiel: '-' ergibt GS-20250106-0001" />
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
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Datumsformat
                  <HelpTooltip content="Wie das Datum in der Bestellungs-ID formatiert wird. JJJJMMTT zeigt das vollständige Datum, JJMMTT nur die letzten beiden Ziffern des Jahres." />
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
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Nummernformat
                  <HelpTooltip content="Fortlaufend: Nummern werden sequenziell erhöht (1, 2, 3...). Zufällig: Jede Bestellung erhält eine zufällige Nummer." />
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
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Zahlenlänge (Auffüllung)
                  <HelpTooltip content="Anzahl der Ziffern für die laufende Nummer. Beispiel: 4 Stellen ergibt 0001, 0002, 0003..." />
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

              {/* Reset Period - nur anzeigen wenn sequential ausgewählt */}
              {orderIdFormat.numberFormat === 'sequential' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Zähler zurücksetzen
                      <HelpTooltip content="Wann die Nummerierung wieder bei 1 beginnt. Täglich: Jeden Tag neu. Monatlich: Am ersten Tag des Monats. Jährlich: Am ersten Tag des Jahres. Niemals: Fortlaufend ohne Zurücksetzung." />
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
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Startnummer
                      <HelpTooltip content="Die Nummer, mit der die Zählung beginnt. Standard ist 1. Wenn Sie bei 100 starten möchten, geben Sie 100 ein." />
                    </label>
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
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

          {/* Rechte Spalte */}
          <div className="space-y-6">
            {/* Geschäftsregeln: Min./Kostenloser Versand und Versandregeln */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Versand und Limits</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Mindestbestellbetrag
                  <HelpTooltip content="Der Mindestbetrag, den Kunden bestellen müssen, um eine Bestellung aufgeben zu können. Beispiel: 20.00 bedeutet, dass Bestellungen unter 20€ nicht möglich sind." />
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="z.B. 20.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Kostenloser Versand-Schwellenwert
                  <HelpTooltip content="Ab diesem Bestellbetrag wird der Versand kostenlos. Beispiel: 100.00 bedeutet, dass Bestellungen ab 100€ kostenlosen Versand erhalten." />
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="z.B. 100.00"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Versandregeln</h3>
                <button
                  type="button"
                  onClick={() => setShippingRules([...(shippingRules || []), { min: 0, max: null, fee: 0, type: 'flat' }])}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded"
                >Regel hinzufügen</button>
              </div>
              <div className="space-y-3">
                {(shippingRules || []).map((r, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min</label>
                      <input type="number" step="0.01" inputMode="decimal" value={r.min ?? ''} onChange={(e)=>{
                        const v = e.target.value === '' ? null : parseFloat(e.target.value);
                        const copy = [...shippingRules]; copy[idx] = { ...copy[idx], min: v }; setShippingRules(copy);
                      }} className="w-full px-2 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max</label>
                      <input type="number" step="0.01" inputMode="decimal" value={r.max ?? ''} onChange={(e)=>{
                        const v = e.target.value === '' ? null : parseFloat(e.target.value);
                        const copy = [...shippingRules]; copy[idx] = { ...copy[idx], max: v }; setShippingRules(copy);
                      }} className="w-full px-2 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Typ</label>
                      <select value={r.type || 'flat'} onChange={(e)=>{
                        const copy = [...shippingRules]; copy[idx] = { ...copy[idx], type: e.target.value };
                        setShippingRules(copy);
                      }} className="w-full px-2 py-2 border rounded">
                        <option value="flat">Fest</option>
                        <option value="percent">Prozent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Wert</label>
                      <input type="number" step="0.01" inputMode="decimal" value={r.type==='percent' ? (r.percent ?? r.value ?? 0) : (r.fee ?? r.value ?? 0)} onChange={(e)=>{
                        const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        const copy = [...shippingRules];
                        copy[idx] = r.type==='percent' ? { ...copy[idx], percent: v, fee: undefined } : { ...copy[idx], fee: v, percent: undefined };
                        setShippingRules(copy);
                      }} className="w-full px-2 py-2 border rounded" />
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={()=>{
                        const copy = [...shippingRules]; copy.splice(idx,1); setShippingRules(copy);
                      }} className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded">Löschen</button>
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

            {/* Lieferung und Zahlung */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Lieferung und Zahlung</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Lieferung Bölümü */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                        Lieferung
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Toggle: Lieferung aktiviert */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">Lieferung aktiviert</span>
                          </div>
                          <button
                            onClick={() =>
                              setDeliverySettings({
                                ...deliverySettings,
                                teslimatAcik: !deliverySettings.teslimatAcik,
                              })
                            }
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                              deliverySettings.teslimatAcik
                                ? 'bg-primary-600'
                                : 'bg-gray-200'
                            }`}
                            role="switch"
                            aria-checked={deliverySettings.teslimatAcik}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                deliverySettings.teslimatAcik
                                  ? 'translate-x-5'
                                  : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Toggle: Abholung im Geschäft aktiviert */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              Abholung im Geschäft aktiviert
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setDeliverySettings({
                                ...deliverySettings,
                                magazadanTeslimAcik:
                                  !deliverySettings.magazadanTeslimAcik,
                              })
                            }
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                              deliverySettings.magazadanTeslimAcik
                                ? 'bg-primary-600'
                                : 'bg-gray-200'
                            }`}
                            role="switch"
                            aria-checked={deliverySettings.magazadanTeslimAcik}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                deliverySettings.magazadanTeslimAcik
                                  ? 'translate-x-5'
                                  : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Bestellzeiten */}
                        <div className="pt-2 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                Bestellbeginn
                                <HelpTooltip content="Die Uhrzeit, ab der neue Bestellungen angenommen werden. Beispiel: 09:00 bedeutet, dass Bestellungen ab 09:00 Uhr möglich sind." />
                              </label>
                              <input
                                type="time"
                                value={deliverySettings.siparisBaslangicSaati || ''}
                                onChange={(e) =>
                                  setDeliverySettings({
                                    ...deliverySettings,
                                    siparisBaslangicSaati: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                Bestellschluss
                                <HelpTooltip content="Die Uhrzeit, nach der keine neuen Bestellungen mehr angenommen werden. Beispiel: 19:30 bedeutet, dass Bestellungen nach 19:30 Uhr nicht mehr möglich sind." />
                              </label>
                              <input
                                type="time"
                                value={deliverySettings.siparisKapanisSaati || ''}
                                onChange={(e) =>
                                  setDeliverySettings({
                                    ...deliverySettings,
                                    siparisKapanisSaati: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Mesafe Sınırları */}
                        <div className="pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Entfernungsgrenzen</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                Max. Entfernung für Abholung (km)
                                <HelpTooltip content="Die maximale Entfernung in Kilometern für Abholbestellungen. Leer lassen für unbegrenzt." />
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                inputMode="decimal"
                                value={deliverySettings.distanceLimits?.pickupMaxDistance ?? ''}
                                onChange={(e) =>
                                  setDeliverySettings({
                                    ...deliverySettings,
                                    distanceLimits: {
                                      ...deliverySettings.distanceLimits,
                                      pickupMaxDistance: e.target.value === '' ? null : parseFloat(e.target.value),
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="z.B. 10"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                Max. Entfernung für Lieferung (km)
                                <HelpTooltip content="Die maximale Entfernung in Kilometern für Lieferbestellungen. Leer lassen für unbegrenzt." />
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                inputMode="decimal"
                                value={deliverySettings.distanceLimits?.deliveryMaxDistance ?? ''}
                                onChange={(e) =>
                                  setDeliverySettings({
                                    ...deliverySettings,
                                    distanceLimits: {
                                      ...deliverySettings.distanceLimits,
                                      deliveryMaxDistance: e.target.value === '' ? null : parseFloat(e.target.value),
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="z.B. 15"
                              />
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Bestellungen außerhalb dieser Entfernungen werden nicht akzeptiert. Die Entfernung wird zwischen dem Marktstandort und der Lieferadresse berechnet.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Zahlung Bölümü */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                        Zahlung
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Toggle: Karte bei Lieferung */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              Karte bei Lieferung
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setPaymentOptions({
                                ...paymentOptions,
                                kartKapida: !paymentOptions.kartKapida,
                              })
                            }
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                              paymentOptions.kartKapida
                                ? 'bg-primary-600'
                                : 'bg-gray-200'
                            }`}
                            role="switch"
                            aria-checked={paymentOptions.kartKapida}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                paymentOptions.kartKapida
                                  ? 'translate-x-5'
                                  : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Toggle: Barzahlung */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              Barzahlung
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setPaymentOptions({
                                ...paymentOptions,
                                nakit: !paymentOptions.nakit,
                              })
                            }
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                              paymentOptions.nakit
                                ? 'bg-primary-600'
                                : 'bg-gray-200'
                            }`}
                            role="switch"
                            aria-checked={paymentOptions.nakit}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                paymentOptions.nakit
                                  ? 'translate-x-5'
                                  : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Toggle: Online */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              Online (deaktivierbar)
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setPaymentOptions({
                                ...paymentOptions,
                                online: !paymentOptions.online,
                              })
                            }
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                              paymentOptions.online
                                ? 'bg-primary-600'
                                : 'bg-gray-200'
                            }`}
                            role="switch"
                            aria-checked={paymentOptions.online}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                paymentOptions.online
                                  ? 'translate-x-5'
                                  : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Kapıda Ödeme Ayarları */}
                        <div className="pt-2 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                Zahlungsart an der Tür
                                <HelpTooltip content="Typ der zusätzlichen Gebühr für Zahlung an der Tür. Fest: Fester Betrag (z.B. 2€). Prozent: Prozentsatz vom Bestellbetrag (z.B. 2%)." />
                              </label>
                              <select
                                value={
                                  paymentOptions.kapidaOdemeUcreti?.type || 'flat'
                                }
                                onChange={(e) =>
                                  setPaymentOptions({
                                    ...paymentOptions,
                                    kapidaOdemeUcreti: {
                                      ...(paymentOptions.kapidaOdemeUcreti || {}),
                                      type: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              >
                                <option value="flat">Fest</option>
                                <option value="percent">Prozent</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                Zahlungsbetrag an der Tür
                                <HelpTooltip content="Der Betrag oder Prozentsatz, der für Zahlung an der Tür zusätzlich berechnet wird. Beispiel: Bei 'Fest' und 2.00 werden 2€ zusätzlich berechnet." />
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                value={paymentOptions.kapidaOdemeUcreti?.value ?? 0}
                                onChange={(e) =>
                                  setPaymentOptions({
                                    ...paymentOptions,
                                    kapidaOdemeUcreti: {
                                      ...(paymentOptions.kapidaOdemeUcreti || {}),
                                      value: parseFloat(e.target.value || '0'),
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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

            {/* Kunden Stornierung Einstellungen */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  Kundenbestellung Stornierung
                  <HelpTooltip content="Bestimmen Sie, in welchen Bestellstatus Kunden ihre Bestellungen stornieren können. Beispiel: 'pending' und 'accepted' Status können storniert werden, aber 'preparing' oder 'shipped' Status nicht." />
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Stornierbare Bestellstatus
                    </label>
                    <div className="space-y-3">
                      {[
                        { value: 'pending', label: 'Ausstehend' },
                        { value: 'accepted', label: 'Akzeptiert' },
                        { value: 'preparing', label: 'In Vorbereitung' },
                        { value: 'shipped', label: 'Versandt' },
                        { value: 'delivered', label: 'Zugestellt' },
                        { value: 'cancelled', label: 'Storniert' },
                      ].map((status) => (
                        <Switch
                          key={status.value}
                          id={`customerCancellation-${status.value}`}
                          checked={customerCancellationSettings.allowedStatuses.includes(status.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomerCancellationSettings({
                                ...customerCancellationSettings,
                                allowedStatuses: [...customerCancellationSettings.allowedStatuses, status.value],
                              });
                            } else {
                              setCustomerCancellationSettings({
                                ...customerCancellationSettings,
                                allowedStatuses: customerCancellationSettings.allowedStatuses.filter(
                                  (s) => s !== status.value
                                ),
                              });
                            }
                          }}
                          label={status.label}
                          color="primary"
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Kunden können nur Bestellungen in den ausgewählten Status stornieren.
                    </p>
                  </div>
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

            {/* Limits und Geschäft */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Limits und Geschäft</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Max. Bestellbetrag
                  <HelpTooltip content="Die maximale Summe, die ein Kunde in einer einzigen Bestellung bestellen kann. Leer lassen für unbegrenzt." />
                </label>
                <input type="number" step="0.01" inputMode="decimal" value={orderLimits.maxSiparisTutari ?? ''} onChange={(e)=>setOrderLimits({ ...orderLimits, maxSiparisTutari: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Max. Produktanzahl
                  <HelpTooltip content="Die maximale Anzahl derselben Produkteinheit, die ein Kunde in einer Bestellung bestellen kann. Beispiel: 10 bedeutet maximal 10 Stück eines Produkts." />
                </label>
                <input type="number" inputMode="numeric" value={orderLimits.maxUrunAdedi ?? ''} onChange={(e)=>setOrderLimits({ ...orderLimits, maxUrunAdedi: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Max. Warenkorbartikel
                  <HelpTooltip content="Die maximale Anzahl unterschiedlicher Produkte, die ein Kunde in den Warenkorb legen kann. Beispiel: 50 bedeutet maximal 50 verschiedene Produkte." />
                </label>
                <input type="number" inputMode="numeric" value={orderLimits.maxSepetKalemi ?? ''} onChange={(e)=>setOrderLimits({ ...orderLimits, maxSepetKalemi: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Geschäft</h3>
              
              {/* Firma Bilgileri */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  📄 Firmeninformationen (für Rechnung)
                  <HelpTooltip content="Diese Informationen werden auf Rechnungen und Lieferscheinen angezeigt. Füllen Sie alle Felder aus, die auf Ihren Dokumenten erscheinen sollen." />
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Firmenname *
                    </label>
                    <input
                      type="text"
                      value={storeSettings.companyInfo?.name || ''}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          companyInfo: {
                            ...storeSettings.companyInfo,
                            name: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="z.B. Gruner SuperStore"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={storeSettings.companyInfo?.address || ''}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          companyInfo: {
                            ...storeSettings.companyInfo,
                            address: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="z.B. Musterstraße 123, 71332 Waiblingen"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon
                    </label>
                    <input
                      type="text"
                      value={storeSettings.companyInfo?.phone || ''}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          companyInfo: {
                            ...storeSettings.companyInfo,
                            phone: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="z.B. +49 7151 123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-Mail
                    </label>
                    <input
                      type="email"
                      value={storeSettings.companyInfo?.email || ''}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          companyInfo: {
                            ...storeSettings.companyInfo,
                            email: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="z.B. info@grunersuperstore.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      USt-IdNr. (MwSt-Nummer)
                      <HelpTooltip content="Ihre Umsatzsteuer-Identifikationsnummer. Wird auf Rechnungen angezeigt." />
                    </label>
                    <input
                      type="text"
                      value={storeSettings.companyInfo?.taxNumber || ''}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          companyInfo: {
                            ...storeSettings.companyInfo,
                            taxNumber: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="z.B. DE123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Handelsregisternummer (HRB)
                      <HelpTooltip content="Ihre Handelsregisternummer. Wird auf Rechnungen angezeigt." />
                    </label>
                    <input
                      type="text"
                      value={storeSettings.companyInfo?.registrationNumber || ''}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          companyInfo: {
                            ...storeSettings.companyInfo,
                            registrationNumber: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="z.B. HRB 12345"
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-600">
                  Diese Informationen werden auf allen Rechnungen und Lieferscheinen angezeigt. Stellen Sie sicher, dass alle Angaben korrekt sind.
                </p>
              </div>
              
              {/* Market Konumu */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Marktstandort</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Breitengrad (Latitude)
                      <HelpTooltip content="Die geografische Breite des Marktstandorts. Beispiel: 52.5200 für Berlin" />
                    </label>
                    <input
                      type="number"
                      step="0.00000001"
                      inputMode="decimal"
                      value={storeSettings.storeLocation?.latitude ?? ''}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          storeLocation: {
                            ...storeSettings.storeLocation,
                            latitude: e.target.value === '' ? null : parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="z.B. 52.5200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Längengrad (Longitude)
                      <HelpTooltip content="Die geografische Länge des Marktstandorts. Beispiel: 13.4050 für Berlin" />
                    </label>
                    <input
                      type="number"
                      step="0.00000001"
                      inputMode="decimal"
                      value={storeSettings.storeLocation?.longitude ?? ''}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          storeLocation: {
                            ...storeSettings.storeLocation,
                            longitude: e.target.value === '' ? null : parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="z.B. 13.4050"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Geben Sie die Koordinaten des Marktstandorts ein. Diese werden zur Entfernungsberechnung verwendet.
                </p>
              </div>

              {/* Varsayılan Şehirler */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Adresssuche</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Standardstädte
                    <HelpTooltip content="Adres araması için varsayılan olarak kullanılacak şehirler. Birden fazla şehir ekleyebilirsiniz. Yazım hatalarına toleranslı eşleştirme yapılır (örn: 'Waiblingn' → 'Waiblingen')." />
                  </label>
                  
                  {/* Şehir listesi (chips) */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(storeSettings.defaultCities || ['Waiblingen']).map((city, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {city}
                        <button
                          type="button"
                          onClick={() => {
                            const newCities = [...(storeSettings.defaultCities || ['Waiblingen'])];
                            newCities.splice(index, 1);
                            setStoreSettings({
                              ...storeSettings,
                              defaultCities: newCities.length > 0 ? newCities : ['Waiblingen'],
                            });
                          }}
                          className="text-green-600 hover:text-green-800 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Yeni şehir ekleme */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCityInput}
                      onChange={(e) => setNewCityInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const city = newCityInput.trim();
                          if (city && !(storeSettings.defaultCities || []).includes(city)) {
                            setStoreSettings({
                              ...storeSettings,
                              defaultCities: [...(storeSettings.defaultCities || ['Waiblingen']), city],
                            });
                            setNewCityInput('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Stadtname eingeben und Enter drücken (z.B. Stuttgart)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const city = newCityInput.trim();
                        if (city && !(storeSettings.defaultCities || []).includes(city)) {
                          setStoreSettings({
                            ...storeSettings,
                            defaultCities: [...(storeSettings.defaultCities || ['Waiblingen']), city],
                          });
                          setNewCityInput('');
                        }
                      }}
                      className="px-4 py-2 text-white rounded-lg transition-colors"
                      style={{
                        backgroundColor: themeColors?.primary?.[600] || '#16a34a'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = themeColors?.primary?.[700] || '#15803d';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = themeColors?.primary?.[600] || '#16a34a';
                      }}
                    >
                      Ekle
                    </button>
                  </div>
                  
                  <p className="mt-2 text-xs text-gray-500">
                    Birden fazla şehir ekleyebilirsiniz. Adres araması yapılırken bu şehirlerdeki sonuçlar öncelikli olarak gösterilir. Yazım hatalarına toleranslı eşleştirme yapılır (örn: 'Waiblingn' → 'Waiblingen').
                  </p>
                </div>
              </div>

              {/* Admin Panel Başlığı */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Admin-Panel Titel
                  <HelpTooltip content="Der Titel, der im oberen Bereich des Admin-Panels angezeigt wird. Bei leerem Feld wird kein Titel angezeigt." />
                </label>
                <input
                  type="text"
                  value={storeSettings.adminPanelTitle || ''}
                  onChange={(e) => setStoreSettings({ ...storeSettings, adminPanelTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="z.B. Gruner Admin Panel"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Der Titel erscheint im oberen Bereich des Admin-Panels. Bei leerem Feld wird kein Titel angezeigt.
                </p>
              </div>

              {/* Wartungsmodus */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Wartungsmodus</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Wartungsmodus-Nachricht
                    <HelpTooltip content="Diese Nachricht wird allen Besuchern angezeigt, wenn der Wartungsmodus aktiviert ist. Verwenden Sie dies für geplante Wartungsarbeiten oder Updates." />
                  </label>
                  <textarea
                    value={storeSettings.bakimModuMesaji || ''}
                    onChange={(e) => setStoreSettings({ ...storeSettings, bakimModuMesaji: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="Geben Sie hier Ihre Wartungsmodus-Nachricht ein..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Diese Nachricht wird Kunden angezeigt, wenn der Wartungsmodus aktiviert ist.
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    SMTP Host *
                    <HelpTooltip content="Der SMTP-Server Ihres E-Mail-Anbieters. Beispiel: smtp.gmail.com für Gmail, smtp.outlook.com für Outlook." />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Port *
                    <HelpTooltip content="Der Port für die SMTP-Verbindung. Standard: 587 für TLS, 465 für SSL. Verwenden Sie 587 für die meisten E-Mail-Anbieter." />
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={smtpSettings.port}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Benutzername (E-Mail) *
                    <HelpTooltip content="Ihre vollständige E-Mail-Adresse, die für die SMTP-Authentifizierung verwendet wird. Dies ist normalerweise dieselbe wie die Absender-E-Mail." />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Passwort / App-Passwort *
                    <HelpTooltip content="Ihr E-Mail-Passwort oder App-Passwort. Für Gmail müssen Sie möglicherweise ein App-Passwort erstellen, wenn die Zwei-Faktor-Authentifizierung aktiviert ist." />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Absender E-Mail *
                    <HelpTooltip content="Die E-Mail-Adresse, die als Absender in E-Mails angezeigt wird. Dies sollte eine gültige E-Mail-Adresse sein, die Sie besitzen." />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Absender Name
                    <HelpTooltip content="Der Name, der als Absender in E-Mails angezeigt wird. Beispiel: 'Gruner SuperStore' wird als Absendername angezeigt." />
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
                <Switch
                  id="secure"
                  checked={smtpSettings.secure}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, secure: e.target.checked })}
                  label="SSL/TLS verwenden (Port 465)"
                  color="primary"
                />
              </div>
            </div>

            {/* E-Mail Bildirimleri */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900">E-Mail-Benachrichtigungen</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Admin-E-Mail-Adressen
                  <HelpTooltip content="An diese E-Mail-Adressen werden Benachrichtigungen über neue Bestellungen gesendet. Mehrere Adressen durch Komma trennen. Beispiel: admin1@example.com, admin2@example.com" />
                </label>
                <textarea
                  value={emailNotificationSettings.adminEmail}
                  onChange={(e) => setEmailNotificationSettings({ ...emailNotificationSettings, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="admin1@grunersuperstore.com, admin2@grunersuperstore.com"
                  rows={3}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Mehrere E-Mail-Adressen durch Komma trennen. An diese Adressen werden neue Bestellungen gesendet.
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
                    <Switch
                      key={key}
                      id={`notifyOnOrderStatus-${key}`}
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
                      label={label}
                      color="primary"
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Wählen Sie, bei welchen Statusänderungen Kunden eine E-Mail erhalten sollen
                </p>
              </div>
            </div>

            {/* Test Mail Button */}
            <div className="pt-4 flex flex-col md:flex-row md:items-center gap-3">
              <button
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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
