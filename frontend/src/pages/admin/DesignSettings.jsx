import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import settingsService from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import { defaultThemeColors, colorPresets } from '../../config/themeColors';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import HelpTooltip from '../../components/common/HelpTooltip';
import FileUpload from '../../components/common/FileUpload';

// Tasarım Ayarları Sayfası
function DesignSettings() {
  const { themeColors, updateThemeColors } = useTheme();
  const [colors, setColors] = useState(defaultThemeColors);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [logo, setLogo] = useState('');
  const [favicon, setFavicon] = useState('');
  const [settings, setSettings] = useState(null);

  // Ayarları yükle
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsService.getSettings();
      const loadedSettings = response.data.settings;
      setSettings(loadedSettings);

      if (loadedSettings?.themeColors) {
        setColors(loadedSettings.themeColors);
      } else {
        setColors(defaultThemeColors);
      }

      // Logo ve favicon'u yükle
      if (loadedSettings?.storeSettings?.logo) {
        const API_BASE = import.meta.env.VITE_API_URL 
          ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL.slice(0, -4) : import.meta.env.VITE_API_URL)
          : (import.meta.env.DEV ? 'http://localhost:5001' : '');
        const logoUrl = loadedSettings.storeSettings.logo.startsWith('http')
          ? loadedSettings.storeSettings.logo
          : `${API_BASE}${loadedSettings.storeSettings.logo}`;
        setLogo(logoUrl);
      } else {
        setLogo('');
      }

      if (loadedSettings?.storeSettings?.favicon) {
        const API_BASE = import.meta.env.VITE_API_URL 
          ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL.slice(0, -4) : import.meta.env.VITE_API_URL)
          : (import.meta.env.DEV ? 'http://localhost:5001' : '');
        const faviconUrl = loadedSettings.storeSettings.favicon.startsWith('http')
          ? loadedSettings.storeSettings.favicon
          : `${API_BASE}${loadedSettings.storeSettings.favicon}`;
        setFavicon(faviconUrl);
      } else {
        setFavicon('');
      }
    } catch (err) {
      setError(err.message || 'Fehler beim Laden der Einstellungen');
      toast.error(err.message || 'Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  // Renk değiştir
  const handleColorChange = (category, key, value) => {
    const newColors = {
      ...colors,
      [category]: {
        ...colors[category],
        [key]: value,
      },
    };
    setColors(newColors);

    // Önizleme modundaysa hemen uygula
    if (previewMode) {
      updateThemeColors(newColors);
    }
  };

  // Önizleme modu toggle
  const togglePreview = () => {
    const newPreviewMode = !previewMode;
    setPreviewMode(newPreviewMode);

    if (newPreviewMode) {
      // Önizleme moduna gir - mevcut renkleri uygula
      updateThemeColors(colors);
      toast.info('Vorschau-Modus aktiviert');
    } else {
      // Önizleme modundan çık - kaydedilmiş renkleri geri yükle
      fetchSettings().then(() => {
        toast.info('Vorschau-Modus deaktiviert');
      });
    }
  };

  // Kaydet
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Logo ve favicon URL'lerini normalize et (sadece path kısmını sakla)
      const logoPath = logo ? (logo.startsWith('http') ? logo.replace(/^https?:\/\/[^/]+/, '') : logo) : null;
      const faviconPath = favicon ? (favicon.startsWith('http') ? favicon.replace(/^https?:\/\/[^/]+/, '') : favicon) : null;

      // Mevcut storeSettings'i koru ve logo/favicon ekle
      const currentStoreSettings = settings?.storeSettings || {};
      const updatedStoreSettings = {
        ...currentStoreSettings,
        logo: logoPath || null,
        favicon: faviconPath || null,
      };

      await settingsService.updateSettings({
        themeColors: colors,
        storeSettings: updatedStoreSettings,
      });

      // Tema renklerini güncelle
      updateThemeColors(colors);

      toast.success('Design-Einstellungen erfolgreich gespeichert');
      setPreviewMode(false);
      
      // Ayarları yeniden yükle
      await fetchSettings();
    } catch (err) {
      toast.error(err.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  // Varsayılana sıfırla
  const handleReset = () => {
    if (window.confirm('Möchten Sie wirklich alle Farben auf die Standardwerte zurücksetzen?')) {
      setColors(defaultThemeColors);
      if (previewMode) {
        updateThemeColors(defaultThemeColors);
      }
      toast.info('Farben auf Standardwerte zurückgesetzt');
    }
  };

  // Vorgefertigte Kombination anwenden
  const applyPreset = (presetKey) => {
    const preset = colorPresets[presetKey];
    if (!preset) return;

    setColors(preset.colors);
    
    // Wenn Vorschau-Modus aktiv ist, sofort anwenden
    if (previewMode) {
      updateThemeColors(preset.colors);
    }
    
    toast.success(`Farbschema "${preset.name}" wurde angewendet`);
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  // Renk girişi komponenti
  const ColorInput = ({ label, value, onChange, description }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex-1 mr-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-14 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-primary-500 transition-colors"
          style={{ padding: '2px' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm uppercase"
          placeholder="#000000"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Design-Einstellungen
            <HelpTooltip content="Passen Sie das Farbschema Ihrer Website an: Primärfarben, Akzentfarben und mehr für ein einheitliches Markenerlebnis." />
          </h1>
          <p className="text-gray-600 mt-1">
            Passen Sie die Farben und das Design Ihrer Anwendung an
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={togglePreview}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              previewMode
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {previewMode ? 'Vorschau aktiv' : 'Vorschau aktivieren'}
          </button>

          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Zurücksetzen
          </button>

          <div className="ml-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
          </div>
        </div>

        {/* Önizleme Uyarısı */}
        {previewMode && (
          <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-orange-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Vorschau-Modus ist aktiv
                </p>
                <p className="text-sm text-orange-700">
                  Änderungen werden live angezeigt. Vergessen Sie nicht zu speichern!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Farbkombinationen-Bereich */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Vorgefertigte Farbkombinationen
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Wählen Sie eine vorgefertigte Farbkombination für schnelle Anwendung
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(colorPresets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="group relative p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 transition-all duration-200 hover:shadow-lg bg-white text-left"
                >
                  {/* Farbvorschau */}
                  <div className="flex gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: preset.colors.header.background }}
                    />
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: preset.colors.primary[600] }}
                    />
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: preset.colors.buttons.addToCart }}
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                    {preset.name}
                  </h3>
                  <p className="text-xs text-gray-500">{preset.description}</p>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-primary-600 font-medium group-hover:text-primary-700">
                      Anwenden →
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Hinweis:</strong> Nach der Auswahl einer Kombination können Sie die Farben auch manuell anpassen. 
                Vergessen Sie nicht, auf "Änderungen speichern" zu klicken, um die Änderungen zu speichern.
              </p>
            </div>
          </div>
        </div>

        {/* Logo & Favicon Section */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Logo & Favicon
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Laden Sie Ihr Logo und Favicon hoch, um Ihre Markenidentität zu stärken
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo
                  <HelpTooltip content="Das Logo wird im Header der Website angezeigt. Empfohlene Größe: Mindestens 200x50px, optimal 400x100px oder höher. Format: PNG, SVG (mit transparentem Hintergrund) oder JPG." />
                </label>
                <FileUpload
                  value={logo}
                  onChange={setLogo}
                  multiple={false}
                  folder="general"
                  maxSize={5 * 1024 * 1024} // 5MB
                  accept="image/*"
                  enableCrop={true}
                  aspectRatio={null}
                  className="mt-2"
                />
                {logo && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Vorschau:</p>
                    <div className="flex items-center justify-center p-4 bg-white rounded border border-gray-200">
                      <img
                        src={logo}
                        alt="Logo Vorschau"
                        className="max-h-20 max-w-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<p class="text-xs text-gray-500">Logo konnte nicht geladen werden</p>';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Favicon Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favicon
                  <HelpTooltip content="Das Favicon wird im Browser-Tab angezeigt. Empfohlene Größe: 32x32px oder 64x64px. Format: ICO, PNG (16x16, 32x32) oder SVG. Quadratisches Format wird empfohlen." />
                </label>
                <FileUpload
                  value={favicon}
                  onChange={setFavicon}
                  multiple={false}
                  folder="general"
                  maxSize={1 * 1024 * 1024} // 1MB
                  accept="image/*"
                  enableCrop={true}
                  aspectRatio={1} // Favicon genellikle kare olmalı
                  minWidth={32}
                  minHeight={32}
                  className="mt-2"
                />
                {favicon && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Vorschau:</p>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 bg-white rounded border border-gray-200 flex items-center justify-center p-2">
                          <img
                            src={favicon}
                            alt="Favicon Vorschau"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<p class="text-xs text-gray-500">Favicon konnte nicht geladen werden</p>';
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">64x64px</p>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded border border-gray-200 flex items-center justify-center p-1">
                          <img
                            src={favicon}
                            alt="Favicon Vorschau"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">32x32px</p>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-4 h-4 bg-white rounded border border-gray-200 flex items-center justify-center">
                          <img
                            src={favicon}
                            alt="Favicon Vorschau"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">16x16px</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Color Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Primary Colors */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary-600"></div>
                Primärfarben
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Hauptfarben für Buttons, Links und wichtige Elemente
              </p>
            </div>
            <div className="p-6">
              {Object.entries(colors.primary).map(([shade, value]) => (
                <ColorInput
                  key={shade}
                  label={`Primary ${shade}`}
                  value={value}
                  onChange={(newValue) => handleColorChange('primary', shade, newValue)}
                  description={shade === '600' ? 'Hauptfarbe (Standard)' : ''}
                />
              ))}
            </div>
          </div>

          {/* Right Column - Header, Button, Text Colors */}
          <div className="flex flex-col gap-6">
            {/* Header Colors */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200" style={{ backgroundColor: colors.header.background }}>
                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.header.text }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Header-Farben
                </h2>
                <p className="text-sm mt-1 opacity-90" style={{ color: colors.header.text }}>
                  Farben für den Kopfbereich der Anwendung
                </p>
              </div>
              <div className="p-4">
                <ColorInput
                  label="Header Hintergrund"
                  value={colors.header.background}
                  onChange={(newValue) => handleColorChange('header', 'background', newValue)}
                  description="Hintergrundfarbe des Headers"
                />
                <ColorInput
                  label="Header Text"
                  value={colors.header.text}
                  onChange={(newValue) => handleColorChange('header', 'text', newValue)}
                  description="Textfarbe im Header"
                />
              </div>
            </div>

            {/* Button Colors */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Button-Farben
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Farben für Aktions-Buttons
                </p>
              </div>
              <div className="p-6">
                <ColorInput
                  label="Warenkorb-Button"
                  value={colors.buttons.addToCart}
                  onChange={(newValue) => handleColorChange('buttons', 'addToCart', newValue)}
                  description="'In den Warenkorb' Button"
                />
                <ColorInput
                  label="Favoriten-Button"
                  value={colors.buttons.favorite}
                  onChange={(newValue) => handleColorChange('buttons', 'favorite', newValue)}
                  description="Favoriten-Icon (nicht aktiv)"
                />
                <ColorInput
                  label="Favoriten-Button Aktiv"
                  value={colors.buttons.favoriteActive}
                  onChange={(newValue) => handleColorChange('buttons', 'favoriteActive', newValue)}
                  description="Favoriten-Icon (aktiv)"
                />
              </div>
            </div>

            {/* Text Colors */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  Text-Farben
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Farben für Textelemente
                </p>
              </div>
              <div className="p-6">
                <ColorInput
                  label="Preis-Text"
                  value={colors.text.price}
                  onChange={(newValue) => handleColorChange('text', 'price', newValue)}
                  description="Produktpreise"
                />
                <ColorInput
                  label="Primärer Text"
                  value={colors.text.primary}
                  onChange={(newValue) => handleColorChange('text', 'primary', newValue)}
                  description="Haupttext"
                />
                <ColorInput
                  label="Sekundärer Text"
                  value={colors.text.secondary}
                  onChange={(newValue) => handleColorChange('text', 'secondary', newValue)}
                  description="Beschreibungen, Untertitel"
                />
              </div>
            </div>
          </div>

          {/* Background Colors */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
            <div className="p-6 border-b border-gray-200" style={{ backgroundColor: colors.background.page }}>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Hintergrund-Farben
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Hintergrundfarben für verschiedene Bereiche
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ColorInput
                  label="Karten-Hintergrund"
                  value={colors.background.card}
                  onChange={(newValue) => handleColorChange('background', 'card', newValue)}
                  description="Produktkarten, Info-Boxen"
                />
                <ColorInput
                  label="Seiten-Hintergrund"
                  value={colors.background.page}
                  onChange={(newValue) => handleColorChange('background', 'page', newValue)}
                  description="Haupthintergrund der Seite"
                />
              </div>
            </div>
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
                <strong>Tipp:</strong> Verwenden Sie den Vorschau-Modus, um Ihre Änderungen live zu sehen,
                bevor Sie sie speichern. Die Farben werden in Echtzeit auf die gesamte Anwendung angewendet.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}

export default DesignSettings;
