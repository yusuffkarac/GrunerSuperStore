/**
 * Cookie Consent Yönetim Utility
 * GDPR uyumlu çerez onay yönetimi
 */

const CONSENT_KEY = 'cookieConsent';
const CONSENT_DURATION = 365 * 24 * 60 * 60 * 1000; // 1 yıl (milisaniye)

/**
 * Çerez kategorileri
 */
export const COOKIE_CATEGORIES = {
  NECESSARY: 'necessary',
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
};

/**
 * Çerez tercihlerini localStorage'dan al
 * @returns {Object|null} Tercihler objesi veya null
 */
export const getConsent = () => {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;

    const consent = JSON.parse(stored);
    
    // Geçerlilik süresini kontrol et
    const now = Date.now();
    if (consent.timestamp && (now - consent.timestamp) > CONSENT_DURATION) {
      // Süresi dolmuş, temizle
      clearConsent();
      return null;
    }

    return consent;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
};

/**
 * Çerez tercihlerini kaydet
 * @param {Object} preferences - Tercih objesi { necessary: boolean, analytics: boolean, marketing: boolean }
 */
export const setConsent = (preferences) => {
  try {
    const consent = {
      ...preferences,
      timestamp: Date.now(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch (error) {
    console.error('Error saving cookie consent:', error);
  }
};

/**
 * Çerez tercihlerini temizle
 */
export const clearConsent = () => {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch (error) {
    console.error('Error clearing cookie consent:', error);
  }
};

/**
 * Belirli bir kategori için onay kontrolü
 * @param {string} category - Kategori (COOKIE_CATEGORIES)
 * @returns {boolean} Onay var mı?
 */
export const hasConsent = (category) => {
  const consent = getConsent();
  if (!consent) return false;

  // Gerekli çerezler her zaman true
  if (category === COOKIE_CATEGORIES.NECESSARY) {
    return true;
  }

  return consent[category] === true;
};

/**
 * Çerez tercihi var mı kontrolü (herhangi bir tercih yapılmış mı?)
 * @returns {boolean}
 */
export const hasAnyConsent = () => {
  return getConsent() !== null;
};

/**
 * Tüm çerezleri kabul et
 */
export const acceptAll = () => {
  setConsent({
    necessary: true,
    analytics: true,
    marketing: true,
  });
};

/**
 * Sadece gerekli çerezleri kabul et
 */
export const acceptNecessaryOnly = () => {
  setConsent({
    necessary: true,
    analytics: false,
    marketing: false,
  });
};

