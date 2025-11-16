export const defaultFooterBlocks = [
  {
    id: 'block-konto',
    title: 'Konto',
    items: [
      {
        id: 'item-profil',
        title: 'Profil',
        type: 'link',
        url: '/profil',
      },
      {
        id: 'item-anmelden',
        title: 'Anmelden',
        type: 'link',
        url: '/anmelden',
      },
      {
        id: 'item-registrieren',
        title: 'Registrieren',
        type: 'link',
        url: '/registrieren',
      },
      {
        id: 'item-produkte',
        title: 'Produkte',
        type: 'link',
        url: '/produkte',
      },
      {
        id: 'item-bestellungen',
        title: 'Bestellungen',
        type: 'link',
        url: '/meine-bestellungen',
      },
      {
        id: 'item-favoriten',
        title: 'Favoriten',
        type: 'link',
        url: '/favoriten',
      },
    ],
  },
  {
    id: 'block-support',
    title: 'Support',
    items: [
      {
        id: 'item-faq',
        title: 'FAQ',
        type: 'link',
        url: '/faq',
      },
      {
        id: 'item-kontakt',
        title: 'Kontakt',
        type: 'link',
        url: '/contact',
      },
      {
        id: 'item-offnungszeiten',
        title: 'Öffnungszeiten',
        type: 'popup',
        popupTitle: 'Öffnungszeiten',
        popupContent: 'Montag - Sonntag: 09:00 - 20:00 Uhr',
      },
    ],
  },
  {
    id: 'block-rechtliches',
    title: 'Rechtliches',
    items: [
      {
        id: 'item-impressum',
        title: 'Impressum',
        type: 'popup',
        popupTitle: 'Impressum',
        popupContent: 'Hier können Sie Ihre Impressum-Informationen eingeben.',
      },
      {
        id: 'item-datenschutz',
        title: 'Datenschutz',
        type: 'popup',
        popupTitle: 'Datenschutzerklärung',
        popupContent: 'Hier können Sie Ihre Datenschutzerklärung eingeben.',
      },
      {
        id: 'item-agb',
        title: 'AGB',
        type: 'popup',
        popupTitle: 'Allgemeine Geschäftsbedingungen',
        popupContent: 'Hier können Sie Ihre AGB eingeben.',
      },
      {
        id: 'item-cookie-richtlinie',
        title: 'Cookie-Richtlinie',
        type: 'popup',
        popupTitle: 'Cookie-Richtlinie',
        popupContent: 'Hier können Sie Ihre Cookie-Richtlinie eingeben.',
      },
    ],
  },
];

