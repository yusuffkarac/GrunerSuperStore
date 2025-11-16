import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import settingsService from '../../services/settingsService';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

// Footer Componenti
function Footer() {
  const [footerData, setFooterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(null);
  const [logo, setLogo] = useState('/logo.png');
  const navigate = useNavigate();
  const { openSettings } = useCookieConsent();

  useEffect(() => {
    fetchFooterData();
    loadLogo();
  }, []);

  const loadLogo = async () => {
    try {
      const response = await settingsService.getSettings();
      const settings = response.data?.settings;

      if (settings?.storeSettings?.logo) {
        const API_BASE = import.meta.env.VITE_API_URL
          ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL.slice(0, -4) : import.meta.env.VITE_API_URL)
          : (import.meta.env.DEV ? 'http://localhost:5001' : '');
        const logoUrl = settings.storeSettings.logo.startsWith('http')
          ? settings.storeSettings.logo
          : `${API_BASE}${settings.storeSettings.logo}`;
        setLogo(logoUrl);
      } else {
        setLogo('/logo.png');
      }
    } catch (error) {
      console.error('Logo yüklenirken hata:', error);
      setLogo('/logo.png');
    }
  };

  const fetchFooterData = async () => {
    try {
      const response = await settingsService.getSettings();
      const footerSettings = response.data.settings?.footerSettings;
      if (footerSettings?.blocks) {
        setFooterData(footerSettings);
      }
    } catch (error) {
      console.error('Footer verileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClick = (item) => {
    if (item.type === 'popup') {
      setShowPopup(item);
    } else if (item.url) {
      // External link kontrolü
      if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      } else {
        // Internal link
        navigate(item.url);
      }
    }
  };

  if (loading) {
    return (
      <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
        <div className="container-mobile py-8">
          <div className="text-center text-gray-500">Laden...</div>
        </div>
      </footer>
    );
  }

  // Eğer footer ayarları yoksa veya boşsa, varsayılan footer'ı göster
  if (!footerData || !footerData.blocks || footerData.blocks.length === 0) {
    return (
      <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
        <div className="container-mobile py-8">
          {/* Logo ve Linkler - Yan yana */}
          <div className="flex flex-col md:flex-row gap-8 md:gap-24 mb-8 items-start">
            {/* Logo */}
            <div className="flex-shrink-0 md:pt-2">
              <Link
                to="/"
                className="flex items-center"
                aria-label="Ana Sayfa"
              >
                <img
                  src={logo}
                  alt="Gruner SuperStore"
                  className="h-24 md:h-28 w-auto object-contain"
                  onError={(e) => { e.target.src = '/logo.png'; }}
                />
              </Link>
            </div>

            {/* Açıklama ve Linkler */}
            <div className="flex-1 w-full">
              {/* Açıklama */}
              <div className="mb-6 text-center md:text-left">
            <p className="text-sm text-gray-600">
              Online-Bestellung für Ihre Lieblings-Lebensmittel
            </p>
          </div>

          {/* Linkler */}
              <div className="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-8 justify-items-center md:justify-items-start">
                <div className="min-w-0 text-center md:text-left">
                  <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 text-sm md:text-base">Schnelllinks</h3>
                  <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm">
                <li>
                    <Link to="/produkte" className="text-gray-600 hover:text-primary-700 transition-colors duration-200">
                    Produkte
                  </Link>
                </li>
                <li>
                    <Link to="/favoriten" className="text-gray-600 hover:text-primary-700 transition-colors duration-200">
                    Favoriten
                  </Link>
                </li>
                <li>
                    <Link to="/meine-bestellungen" className="text-gray-600 hover:text-primary-700 transition-colors duration-200">
                    Bestellungen
                  </Link>
                </li>
              </ul>
            </div>

                <div className="min-w-0 text-center md:text-left">
                  <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 text-sm md:text-base">Konto</h3>
                  <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm">
                <li>
                    <Link to="/profil" className="text-gray-600 hover:text-primary-700 transition-colors duration-200">
                    Profil
                  </Link>
                </li>
                <li>
                    <Link to="/anmelden" className="text-gray-600 hover:text-primary-700 transition-colors duration-200">
                    Anmelden
                  </Link>
                </li>
                <li>
                    <Link to="/registrieren" className="text-gray-600 hover:text-primary-700 transition-colors duration-200">
                    Registrieren
                  </Link>
                </li>
              </ul>
            </div>

                <div className="min-w-0 text-center md:text-left">
                  <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 text-sm md:text-base">Hilfe</h3>
                  <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm">
                <li>
                    <Link to="/faq" className="text-gray-600 hover:text-primary-700 transition-colors duration-200">
                    FAQ
                  </Link>
                </li>
                <li>
                    <Link to="/kontakt" className="text-gray-600 hover:text-primary-700 transition-colors duration-200">
                    Kontakt
                  </Link>
                </li>
              </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright ve Cookie Link */}
          <div className="pt-6 border-t border-gray-300">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600">
              <p>&copy; 2025 Gruner SuperStore. Alle Rechte vorbehalten.</p>
              <button
                onClick={openSettings}
                className="text-primary-600 hover:text-primary-700 hover:underline"
              >
                Cookie-Einstellungen
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Nav için boşluk (mobil) */}
        <div className="h-20 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}></div>
      </footer>
    );
  }

  return (
    <>
      <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
        <div className="container-mobile py-8">
          {/* Logo ve Footer Blöcke - Yan yana */}
          <div className="flex flex-col md:flex-row gap-8 md:gap-24 mb-8 items-start">
            {/* Logo */}
            <div className="flex-shrink-0 md:pt-2" style={{ alignSelf: 'center' }}>
              <Link
                to="/"
                className="flex items-center"
                aria-label="Ana Sayfa"
              >
                <img
                  src={logo}
                  alt="Gruner SuperStore"
                  className="h-24 md:h-28 w-auto object-contain"
                  onError={(e) => { e.target.src = '/logo.png'; }}
                />
              </Link>
            </div>

          {/* Footer Blöcke */}
            <div className="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-8 flex-1 w-full justify-items-center md:justify-items-start">
            {footerData.blocks.map((block) => (
              <div key={block.id} className="min-w-0 text-center md:text-left">
                <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 text-sm md:text-base">{block.title}</h3>
                <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm">
                  {block.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleLinkClick(item)}
                        className="text-gray-600 hover:text-primary-700 text-center md:text-left transition-colors duration-200"
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            </div>
          </div>

          {/* Copyright ve Cookie Link */}
          <div className="pt-6 border-t border-gray-300">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600">
              <p>&copy; 2025 Gruner SuperStore. Alle Rechte vorbehalten.</p>
              <button
                onClick={openSettings}
                className="text-primary-600 hover:text-primary-700 hover:underline"
              >
                Cookie-Einstellungen
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Nav için boşluk (mobil) */}
        <div className="h-20 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}></div>
      </footer>

      {/* Popup Modal */}
      {showPopup && (
        <PopupModal
          title={showPopup.popupTitle}
          content={showPopup.popupContent}
          onClose={() => setShowPopup(null)}
        />
      )}
    </>
  );
}

// Popup Modal Component
function PopupModal({ title, content, onClose }) {
  useEffect(() => {
    // ESC tuşu ile kapat
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    // Body scroll'u engelle
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            aria-label="Schließen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

export default Footer;
