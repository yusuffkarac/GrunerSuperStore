import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiX, FiCheck } from 'react-icons/fi';
import {
  getConsent,
  setConsent,
  acceptAll,
  acceptNecessaryOnly,
  hasAnyConsent,
  COOKIE_CATEGORIES,
} from '../../utils/cookieManager';
import { useCookieConsent } from '../../contexts/CookieConsentContext';
import settingsService from '../../services/settingsService';

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

function CookieConsent() {
  const { showSettings, openSettings, closeSettings } = useCookieConsent();
  const [showBanner, setShowBanner] = useState(false);
  const [cookieSettings, setCookieSettings] = useState(defaultCookieSettings);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  // Ayarları yükle
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsService.getSettings();
        const loadedSettings = response.data.settings;
        if (loadedSettings?.cookieSettings) {
          setCookieSettings({
            ...defaultCookieSettings,
            ...loadedSettings.cookieSettings,
          });
        }
      } catch (error) {
        console.error('Error loading cookie settings:', error);
        // Hata durumunda varsayılan ayarları kullan
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    // Tercih yoksa banner'ı göster
    if (!hasAnyConsent()) {
      setShowBanner(true);
    }
  }, []);

  // Footer'dan açıldığında banner'ı da göster ve mevcut tercihleri yükle
  useEffect(() => {
    if (showSettings) {
      const currentConsent = getConsent();
      if (currentConsent) {
        setPreferences({
          necessary: true,
          analytics: currentConsent.analytics || false,
          marketing: currentConsent.marketing || false,
        });
      }
      if (!showBanner) {
        setShowBanner(true);
      }
    }
  }, [showSettings, showBanner]);

  const handleAcceptAll = () => {
    acceptAll();
    setShowBanner(false);
    closeSettings();
  };

  const handleAcceptNecessary = () => {
    acceptNecessaryOnly();
    setShowBanner(false);
    closeSettings();
  };

  const handleOpenSettings = () => {
    const currentConsent = getConsent();
    if (currentConsent) {
      setPreferences({
        necessary: true,
        analytics: currentConsent.analytics || false,
        marketing: currentConsent.marketing || false,
      });
    }
    openSettings();
  };

  const handleSaveSettings = () => {
    setConsent(preferences);
    setShowBanner(false);
    closeSettings();
  };

  const handleTogglePreference = (category) => {
    // Gerekli çerezler değiştirilemez
    if (category === COOKIE_CATEGORIES.NECESSARY) return;

    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Banner açık değilse ve settings de açık değilse render etme
  if (!showBanner && !showSettings) return null;

  return (
    <>
      {/* Banner */}
      <AnimatePresence>
        {showBanner && !showSettings && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] px-3 pb-[20%] md:px-4 md:pb-6"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-4xl mx-auto p-3 md:p-6 max-h-[85vh] md:max-h-none overflow-y-auto">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                {/* İçerik */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1.5 md:mb-2 text-base md:text-lg">
                    {cookieSettings.title}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                    {cookieSettings.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5 md:mt-2">
                    {cookieSettings.privacyPolicyText}{' '}
                    <a
                      href="#"
                      className="text-primary-600 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        // Privacy policy sayfasına yönlendirme eklenebilir
                      }}
                    >
                      {cookieSettings.privacyPolicyLink}
                    </a>
                    .
                  </p>
                </div>

                {/* Butonlar */}
                <div className="flex flex-row gap-2 md:flex-row md:flex-shrink-0 flex-wrap">
                  <button
                    onClick={handleAcceptNecessary}
                    className="flex-1 min-w-[120px] md:w-auto md:flex-none px-3 md:px-4 py-2 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-xs md:text-sm whitespace-nowrap"
                  >
                    {cookieSettings.buttonNecessaryOnly}
                  </button>
                  <button
                    onClick={handleOpenSettings}
                    className="flex-1 min-w-[120px] md:w-auto md:flex-none px-3 md:px-4 py-2 md:py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap"
                  >
                    <FiSettings size={14} className="md:w-4 md:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{cookieSettings.buttonSettings}</span>
                    <span className="sm:hidden">Einst.</span>
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 min-w-[120px] md:w-auto md:flex-none px-3 md:px-4 py-2 md:py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors text-xs md:text-sm whitespace-nowrap"
                  >
                    {cookieSettings.buttonAcceptAll}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSettings}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4"
              onClick={(e) => {
                // Sadece backdrop'a (modal dışına) tıklandığında kapat
                if (e.target === e.currentTarget) {
                  closeSettings();
                }
              }}
            >
              <div 
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">
                    {cookieSettings.settingsTitle}
                  </h3>
                  <button
                    onClick={closeSettings}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    aria-label="Schließen"
                  >
                    <FiX size={20} className="md:w-6 md:h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 md:p-6 overflow-y-auto flex-1">
                  <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
                    {cookieSettings.settingsDescription}
                  </p>

                  <div className="space-y-3 md:space-y-4">
                    {/* Gerekli Çerezler */}
                    <div className="border border-gray-200 rounded-lg p-3 md:p-4">
                      <div className="flex items-start justify-between gap-3 md:gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">
                            {cookieSettings.necessaryTitle}
                          </h4>
                          <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                            {cookieSettings.necessaryDescription}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-11 h-6 md:w-12 md:h-6 bg-primary-600 rounded-full flex items-center justify-end px-1 cursor-not-allowed">
                            <div className="w-4 h-4 md:w-5 md:h-5 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Analitik Çerezler */}
                    <div className="border border-gray-200 rounded-lg p-3 md:p-4">
                      <div className="flex items-start justify-between gap-3 md:gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">
                            {cookieSettings.analyticsTitle}
                          </h4>
                          <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                            {cookieSettings.analyticsDescription}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleTogglePreference(COOKIE_CATEGORIES.ANALYTICS)}
                            className={`relative w-11 h-6 md:w-12 md:h-6 rounded-full transition-colors ${
                              preferences.analytics ? 'bg-primary-600' : 'bg-gray-300'
                            }`}
                          >
                            <motion.div
                              animate={{
                                x: preferences.analytics ? 20 : 0,
                              }}
                              className="absolute top-0.5 left-0.5 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-md"
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Pazarlama Çerezleri */}
                    <div className="border border-gray-200 rounded-lg p-3 md:p-4">
                      <div className="flex items-start justify-between gap-3 md:gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">
                            {cookieSettings.marketingTitle}
                          </h4>
                          <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                            {cookieSettings.marketingDescription}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleTogglePreference(COOKIE_CATEGORIES.MARKETING)}
                            className={`relative w-11 h-6 md:w-12 md:h-6 rounded-full transition-colors ${
                              preferences.marketing ? 'bg-primary-600' : 'bg-gray-300'
                            }`}
                          >
                            <motion.div
                              animate={{
                                x: preferences.marketing ? 20 : 0,
                              }}
                              className="absolute top-0.5 left-0.5 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-md"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-2 md:gap-3 justify-end">
                  <button
                    onClick={closeSettings}
                    className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm md:text-base"
                  >
                    {cookieSettings.buttonCancel}
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <FiCheck size={16} className="md:w-[18px] md:h-[18px]" />
                    {cookieSettings.buttonSave}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default CookieConsent;

