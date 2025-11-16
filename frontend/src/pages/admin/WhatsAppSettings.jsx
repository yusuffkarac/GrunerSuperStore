import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiSave } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import settingsService from '../../services/settingsService';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import HelpTooltip from '../../components/common/HelpTooltip';
import { useModalScroll } from '../../hooks/useModalScroll';

// Varsayılan WhatsApp ayarları
const defaultWhatsAppSettings = {
  enabled: false,
  link: '',
  showStartTime: '09:00',
  showEndTime: '18:00',
};

// WhatsApp link'inden telefon numarası ve mesajı parse et
const parseWhatsAppLink = (link) => {
  if (!link) return { phoneNumber: '', message: '' };
  
  try {
    const url = new URL(link);
    // Pathname'den telefon numarasını al (örn: /491234567890)
    let phoneNumber = url.pathname.replace(/^\//, '').replace(/\/$/, '');
    // Eğer wa.me formatındaysa
    if (phoneNumber.startsWith('wa.me/')) {
      phoneNumber = phoneNumber.replace('wa.me/', '');
    }
    const message = url.searchParams.get('text') || '';
    return { phoneNumber, message };
  } catch {
    // Eğer link formatı geçersizse
    return { phoneNumber: '', message: '' };
  }
};

// Telefon numarası ve mesajdan WhatsApp link'i oluştur
const buildWhatsAppLink = (phoneNumber, message) => {
  if (!phoneNumber.trim()) return '';
  
  // Telefon numarasından sadece rakamları al
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  if (!cleanPhone) return '';
  
  let link = `https://wa.me/${cleanPhone}`;
  if (message.trim()) {
    link += `?text=${encodeURIComponent(message.trim())}`;
  }
  
  return link;
};

function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [whatsappSettings, setWhatsappSettings] = useState(defaultWhatsAppSettings);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [anyModalOpen] = useState(false);
  useModalScroll(anyModalOpen);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsService.getSettings();
      const loadedSettings = response.data.settings;
      
      if (loadedSettings?.whatsappSettings) {
        const settings = {
          ...defaultWhatsAppSettings,
          ...loadedSettings.whatsappSettings,
        };
        setWhatsappSettings(settings);
        
        // Link'ten telefon numarası ve mesajı parse et
        const { phoneNumber: parsedPhone, message: parsedMessage } = parseWhatsAppLink(settings.link);
        setPhoneNumber(parsedPhone);
        setMessage(parsedMessage);
      }
    } catch (err) {
      setError(err.message || 'Fehler beim Laden der Einstellungen');
      toast.error(err.message || 'Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  // Telefon numarası veya mesaj değiştiğinde link'i otomatik oluştur
  useEffect(() => {
    const newLink = buildWhatsAppLink(phoneNumber, message);
    setWhatsappSettings(prev => ({ ...prev, link: newLink }));
  }, [phoneNumber, message]);

  const handleSave = async () => {
    // Validierung
    if (whatsappSettings.enabled && !phoneNumber.trim()) {
      toast.error('Bitte geben Sie eine Telefonnummer ein');
      return;
    }

    if (whatsappSettings.enabled && !whatsappSettings.showStartTime) {
      toast.error('Bitte geben Sie eine Startzeit ein');
      return;
    }

    if (whatsappSettings.enabled && !whatsappSettings.showEndTime) {
      toast.error('Bitte geben Sie eine Endzeit ein');
      return;
    }

    // Link'i son kez oluştur
    const finalLink = buildWhatsAppLink(phoneNumber, message);
    const settingsToSave = {
      ...whatsappSettings,
      link: finalLink,
    };

    try {
      setSaving(true);
      
      await settingsService.updateSettings({
        whatsappSettings: settingsToSave,
      });

      toast.success('WhatsApp-Einstellungen erfolgreich gespeichert');
    } catch (err) {
      console.error('Kaydetme hatası:', err);
      toast.error(err.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Möchten Sie wirklich auf die Standardwerte zurücksetzen?')) {
      setWhatsappSettings(defaultWhatsAppSettings);
      setPhoneNumber('');
      setMessage('');
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FaWhatsapp className="w-6 h-6 text-green-500" />
              WhatsApp-Einstellungen
              <HelpTooltip content="Konfigurieren Sie den WhatsApp-Button, der in der linken unteren Ecke der Website angezeigt wird. Sie können den Link und die Zeiten festlegen, zu denen der Button angezeigt werden soll." />
            </h2>
            <p className="text-gray-600 mt-1 text-sm">
              Konfigurieren Sie den WhatsApp-Button für Ihre Website
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Enabled Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-sm font-medium text-gray-900">
              WhatsApp-Button aktivieren
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Aktivieren Sie den WhatsApp-Button auf der Website
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappSettings.enabled}
              onChange={(e) =>
                setWhatsappSettings({ ...whatsappSettings, enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* Telefon Nummer */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Telefonnummer <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="491234567890 oder +49 123 4567890"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={!whatsappSettings.enabled}
          />
          <p className="text-xs text-gray-500 mt-1">
            Geben Sie die Telefonnummer mit Ländercode ein (z.B. 491234567890 oder +49 123 4567890)
          </p>
        </div>

        {/* Nachricht */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Vordefinierte Nachricht (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hallo, ich habe eine Frage..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            disabled={!whatsappSettings.enabled}
          />
          <p className="text-xs text-gray-500 mt-1">
            Diese Nachricht wird automatisch im WhatsApp-Chat vorausgefüllt (optional)
          </p>
        </div>

        {/* Generated Link Preview */}
        {whatsappSettings.enabled && phoneNumber && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Generierter WhatsApp-Link:
            </label>
            <code className="text-xs text-gray-600 break-all">
              {buildWhatsAppLink(phoneNumber, message) || 'Bitte geben Sie eine Telefonnummer ein'}
            </code>
          </div>
        )}

        {/* Time Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Startzeit <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={whatsappSettings.showStartTime}
              onChange={(e) =>
                setWhatsappSettings({ ...whatsappSettings, showStartTime: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={!whatsappSettings.enabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ab welcher Uhrzeit soll der Button angezeigt werden?
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Endzeit <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={whatsappSettings.showEndTime}
              onChange={(e) =>
                setWhatsappSettings({ ...whatsappSettings, showEndTime: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={!whatsappSettings.enabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              Bis zu welcher Uhrzeit soll der Button angezeigt werden?
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Hinweis:</p>
              <p>
                Der WhatsApp-Button wird nur in dem angegebenen Zeitraum angezeigt. 
                Außerhalb dieses Zeitraums ist der Button ausgeblendet. Die Zeiten basieren auf der lokalen Zeit des Benutzers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Zurücksetzen
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

export default WhatsAppSettings;

