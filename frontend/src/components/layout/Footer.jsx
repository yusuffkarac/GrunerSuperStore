import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import settingsService from '../../services/settingsService';

// Footer Componenti
function Footer() {
  const [footerData, setFooterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFooterData();
  }, []);

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
          {/* Logo ve açıklama */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-primary-700 mb-2">Gruner SuperStore</h2>
            <p className="text-sm text-gray-600">
              Online-Bestellung für Ihre Lieblings-Lebensmittel
            </p>
          </div>

          {/* Linkler */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Schnelllinks</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/produkte" className="text-gray-600 hover:text-primary-700">
                    Produkte
                  </Link>
                </li>
                <li>
                  <Link to="/favoriten" className="text-gray-600 hover:text-primary-700">
                    Favoriten
                  </Link>
                </li>
                <li>
                  <Link to="/meine-bestellungen" className="text-gray-600 hover:text-primary-700">
                    Bestellungen
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Konto</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/profil" className="text-gray-600 hover:text-primary-700">
                    Profil
                  </Link>
                </li>
                <li>
                  <Link to="/anmelden" className="text-gray-600 hover:text-primary-700">
                    Anmelden
                  </Link>
                </li>
                <li>
                  <Link to="/registrieren" className="text-gray-600 hover:text-primary-700">
                    Registrieren
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
            <p>&copy; 2025 Gruner SuperStore. Alle Rechte vorbehalten.</p>
          </div>
        </div>

        {/* Bottom Nav için boşluk (mobil) */}
        <div className="h-16 md:hidden"></div>
      </footer>
    );
  }

  return (
    <>
      <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
        <div className="container-mobile py-8">
          {/* Footer Blöcke */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-6">
            {footerData.blocks.map((block) => (
              <div key={block.id}>
                <h3 className="font-semibold text-gray-900 mb-3">{block.title}</h3>
                <ul className="space-y-2 text-sm">
                  {block.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleLinkClick(item)}
                        className="text-gray-600 hover:text-primary-700 text-left"
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
            <p>&copy; 2025 Gruner SuperStore. Alle Rechte vorbehalten.</p>
          </div>
        </div>

        {/* Bottom Nav için boşluk (mobil) */}
        <div className="h-16 md:hidden"></div>
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
