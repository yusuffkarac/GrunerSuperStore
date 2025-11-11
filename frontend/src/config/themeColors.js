// Varsayılan tema renkleri
// Bu renkler backend'den gelmediğinde kullanılacak
export const defaultThemeColors = {
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a', // Ana yeşil renk (görüntüdeki parlak yeşil)
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  // Görüntüdeki parlak yeşil tonuna yakın
  header: {
    background: '#16a34a', // primary-600
    text: '#ffffff',
  },
  buttons: {
    addToCart: '#16a34a', // primary-600
    favorite: '#ffffff',
    favoriteActive: '#ef4444', // kırmızı
  },
  text: {
    price: '#16a34a', // primary-600
    primary: '#111827', // gray-900
    secondary: '#6b7280', // gray-500
  },
  background: {
    card: '#ffffff',
    page: '#ffffff',
  },
};

// CSS değişkenlerine dönüştür
export const getThemeCSSVariables = (colors = defaultThemeColors) => {
  return {
    '--color-primary-50': colors.primary[50],
    '--color-primary-100': colors.primary[100],
    '--color-primary-200': colors.primary[200],
    '--color-primary-300': colors.primary[300],
    '--color-primary-400': colors.primary[400],
    '--color-primary-500': colors.primary[500],
    '--color-primary-600': colors.primary[600],
    '--color-primary-700': colors.primary[700],
    '--color-primary-800': colors.primary[800],
    '--color-primary-900': colors.primary[900],
    '--color-header-bg': colors.header.background,
    '--color-header-text': colors.header.text,
    '--color-button-cart': colors.buttons.addToCart,
    '--color-button-favorite': colors.buttons.favorite,
    '--color-button-favorite-active': colors.buttons.favoriteActive,
    '--color-text-price': colors.text.price,
    '--color-text-primary': colors.text.primary,
    '--color-text-secondary': colors.text.secondary,
    '--color-bg-card': colors.background.card,
    '--color-bg-page': colors.background.page,
  };
};

// Backend'den gelen renk ayarlarını normalize et
export const normalizeThemeColors = (backendColors) => {
  if (!backendColors) {
    return defaultThemeColors;
  }

  // Backend'den gelen renkleri varsayılanlarla birleştir
  return {
    primary: {
      ...defaultThemeColors.primary,
      ...(backendColors.primary || {}),
    },
    header: {
      ...defaultThemeColors.header,
      ...(backendColors.header || {}),
    },
    buttons: {
      ...defaultThemeColors.buttons,
      ...(backendColors.buttons || {}),
    },
    text: {
      ...defaultThemeColors.text,
      ...(backendColors.text || {}),
    },
    background: {
      ...defaultThemeColors.background,
      ...(backendColors.background || {}),
    },
  };
};

// Vorgefertigte Farbkombinationen (Presets)
export const colorPresets = {
  'yeşil-beyaz': {
    name: 'Grün-Weiß',
    description: 'Klassisches grünes Design (Standard)',
    colors: {
      primary: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#047857',
        800: '#065f46',
        900: '#064e3b',
      },
      header: {
        background: '#16a34a',
        text: '#ffffff',
      },
      buttons: {
        addToCart: '#16a34a',
        favorite: '#ffffff',
        favoriteActive: '#ef4444',
      },
      text: {
        price: '#16a34a',
        primary: '#111827',
        secondary: '#6b7280',
      },
      background: {
        card: '#ffffff',
        page: '#ffffff',
      },
    },
  },
  'sarı-siyah': {
    name: 'Gelb-Schwarz',
    description: 'Mercedes-Design - Luxuriös und elegant',
    colors: {
      primary: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#eab308',
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
        900: '#713f12',
      },
      header: {
        background: '#000000',
        text: '#facc15',
      },
      buttons: {
        addToCart: '#facc15',
        favorite: '#ffffff',
        favoriteActive: '#ef4444',
      },
      text: {
        price: '#ca8a04',
        primary: '#111827',
        secondary: '#6b7280',
      },
      background: {
        card: '#ffffff',
        page: '#ffffff',
      },
    },
  },
  'mavi-beyaz': {
    name: 'Blau-Weiß',
    description: 'Professionell und vertrauenswürdig',
    colors: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
      header: {
        background: '#2563eb',
        text: '#ffffff',
      },
      buttons: {
        addToCart: '#2563eb',
        favorite: '#ffffff',
        favoriteActive: '#ef4444',
      },
      text: {
        price: '#2563eb',
        primary: '#111827',
        secondary: '#6b7280',
      },
      background: {
        card: '#ffffff',
        page: '#ffffff',
      },
    },
  },
  'kırmızı-beyaz': {
    name: 'Rot-Weiß',
    description: 'Energisch und auffällig',
    colors: {
      primary: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
      header: {
        background: '#dc2626',
        text: '#ffffff',
      },
      buttons: {
        addToCart: '#dc2626',
        favorite: '#ffffff',
        favoriteActive: '#ef4444',
      },
      text: {
        price: '#dc2626',
        primary: '#111827',
        secondary: '#6b7280',
      },
      background: {
        card: '#ffffff',
        page: '#ffffff',
      },
    },
  },
  'mor-beyaz': {
    name: 'Lila-Weiß',
    description: 'Kreativ und modern',
    colors: {
      primary: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7e22ce',
        800: '#6b21a8',
        900: '#581c87',
      },
      header: {
        background: '#9333ea',
        text: '#ffffff',
      },
      buttons: {
        addToCart: '#9333ea',
        favorite: '#ffffff',
        favoriteActive: '#ef4444',
      },
      text: {
        price: '#9333ea',
        primary: '#111827',
        secondary: '#6b7280',
      },
      background: {
        card: '#ffffff',
        page: '#ffffff',
      },
    },
  },
  'turuncu-beyaz': {
    name: 'Orange-Weiß',
    description: 'Warm und einladend',
    colors: {
      primary: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12',
      },
      header: {
        background: '#ea580c',
        text: '#ffffff',
      },
      buttons: {
        addToCart: '#ea580c',
        favorite: '#ffffff',
        favoriteActive: '#ef4444',
      },
      text: {
        price: '#ea580c',
        primary: '#111827',
        secondary: '#6b7280',
      },
      background: {
        card: '#ffffff',
        page: '#ffffff',
      },
    },
  },
  'lacivert-altın': {
    name: 'Navy-Gold',
    description: 'Premium und luxuriös',
    colors: {
      primary: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#eab308',
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
        900: '#713f12',
      },
      header: {
        background: '#1e3a8a',
        text: '#facc15',
      },
      buttons: {
        addToCart: '#facc15',
        favorite: '#ffffff',
        favoriteActive: '#ef4444',
      },
      text: {
        price: '#ca8a04',
        primary: '#111827',
        secondary: '#6b7280',
      },
      background: {
        card: '#ffffff',
        page: '#ffffff',
      },
    },
  },
  'siyah-beyaz': {
    name: 'Schwarz-Weiß',
    description: 'Minimalistisch und elegant',
    colors: {
      primary: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },
      header: {
        background: '#111827',
        text: '#ffffff',
      },
      buttons: {
        addToCart: '#111827',
        favorite: '#ffffff',
        favoriteActive: '#ef4444',
      },
      text: {
        price: '#111827',
        primary: '#111827',
        secondary: '#6b7280',
      },
      background: {
        card: '#ffffff',
        page: '#ffffff',
      },
    },
  },
};

