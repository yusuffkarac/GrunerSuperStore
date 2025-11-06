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

