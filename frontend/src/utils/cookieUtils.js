/**
 * Basit Cookie Utility Fonksiyonları
 */

/**
 * Cookie'den değer oku
 * @param {string} name - Cookie adı
 * @returns {string|null} Cookie değeri veya null
 */
export const getCookie = (name) => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

/**
 * Cookie'ye değer yaz
 * @param {string} name - Cookie adı
 * @param {string} value - Cookie değeri
 * @param {number} days - Kaç gün geçerli olacak (varsayılan: 1 gün)
 */
export const setCookie = (name, value, days = 1) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
};

/**
 * Cookie'yi sil
 * @param {string} name - Cookie adı
 */
export const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

