import { useState, useEffect } from 'react';
import { FiHome, FiEdit3, FiShield, FiHelpCircle, FiMessageCircle } from 'react-icons/fi';
import HomePageSettings from './HomePageSettings';
import FooterSettings from './FooterSettings';
import CookieSettings from './CookieSettings';
import FAQs from './FAQs';
import WhatsAppSettings from './WhatsAppSettings';
import HelpTooltip from '../../components/common/HelpTooltip';
import { useModalScroll } from '../../hooks/useModalScroll';

// Seiteneinstellungen - Tüm sayfa ayarlarını tek bir yerde yönet
function Seiteneinstellungen() {
  // localStorage'dan aktif sekmeyi yükle, yoksa varsayılan olarak 'homepage'
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('seiteneinstellungen_activeTab');
    return savedTab || 'homepage';
  });

  // Sekme değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('seiteneinstellungen_activeTab', activeTab);
  }, [activeTab]);

  // Modal scroll yönetimi
  // Alt componentlerdeki modal'lar kendi useModalScroll'larını kullanıyor
  // Bu sayfada gelecekte bir modal eklendiğinde kullanılmak üzere hazır
  // Şimdilik false, çünkü bu sayfada doğrudan bir modal yok
  const [anyModalOpen] = useState(false);
  useModalScroll(anyModalOpen);

  const tabs = [
    {
      id: 'homepage',
      label: 'Startseite',
      icon: FiHome,
      component: <HomePageSettings />,
      description: 'Startseiten-Texte und Inhalte verwalten',
    },
    {
      id: 'footer',
      label: 'Footer-Einstellungen',
      icon: FiEdit3,
      component: <FooterSettings />,
      description: 'Footer-Struktur und Links verwalten',
    },
    {
      id: 'cookie',
      label: 'Cookie-Einstellungen',
      icon: FiShield,
      component: <CookieSettings />,
      description: 'Cookie-Einwilligungstexte verwalten',
    },
    {
      id: 'faqs',
      label: 'FAQ-Verwaltung',
      icon: FiHelpCircle,
      component: <FAQs />,
      description: 'Häufig gestellte Fragen verwalten',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp-Einstellungen',
      icon: FiMessageCircle,
      component: <WhatsAppSettings />,
      description: 'WhatsApp-Button und Zeiteinstellungen verwalten',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Seiteneinstellungen
          <HelpTooltip content="Verwalten Sie alle Seiten-Einstellungen an einem Ort: Startseite, Footer, Cookie-Einstellungen und FAQs." />
        </h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie alle Seiten-Einstellungen Ihrer Website zentral
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${
                      isActive
                        ? 'border-primary-600 text-primary-600 bg-primary-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            {tabs.find((tab) => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}

export default Seiteneinstellungen;

