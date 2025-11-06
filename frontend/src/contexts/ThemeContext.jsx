import { createContext, useContext, useState, useEffect } from 'react';
import { defaultThemeColors, normalizeThemeColors, getThemeCSSVariables } from '../config/themeColors';
import settingsService from '../services/settingsService';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [themeColors, setThemeColors] = useState(defaultThemeColors);
  const [loading, setLoading] = useState(true);

  // Tema renklerini yükle
  useEffect(() => {
    const loadThemeColors = async () => {
      try {
        const response = await settingsService.getSettings();
        const settings = response.data.settings;

        // Backend'den tema renkleri geliyorsa kullan
        if (settings?.themeColors) {
          const normalizedColors = normalizeThemeColors(settings.themeColors);
          setThemeColors(normalizedColors);
        } else {
          // Varsayılan renkleri kullan
          setThemeColors(defaultThemeColors);
        }
      } catch (error) {
        console.error('Tema renkleri yüklenirken hata:', error);
        // Hata durumunda varsayılan renkleri kullan
        setThemeColors(defaultThemeColors);
      } finally {
        setLoading(false);
      }
    };

    loadThemeColors();
  }, []);

  // CSS değişkenlerini document root'a uygula
  useEffect(() => {
    const cssVariables = getThemeCSSVariables(themeColors);
    const root = document.documentElement;

    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeColors]);

  // Tema renklerini güncelle (admin panelinden kullanılacak)
  const updateThemeColors = (newColors) => {
    const normalizedColors = normalizeThemeColors(newColors);
    setThemeColors(normalizedColors);
  };

  const value = {
    themeColors,
    updateThemeColors,
    loading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

