/**
 * Date/Time utility functions for Germany timezone (Europe/Berlin)
 * Handles CET/CEST automatically
 */

/**
 * Almanya saatine göre bugünün tarihini al (saat bilgisi olmadan, sadece tarih)
 * Bu fonksiyon, saat dilimi farklılıklarından kaynaklanan sorunları önlemek için
 * Intl.DateTimeFormat kullanarak Almanya saat dilimine göre bugünün tarihini hesaplar
 * @returns {Date} Almanya saatine göre bugünün tarihi (saat 00:00:00)
 */
export function getTodayInGermany() {
  const now = new Date();
  
  // Almanya saat dilimine göre bugünün tarih parçalarını al
  const germanyParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  
  const year = parseInt(germanyParts.find(p => p.type === 'year').value);
  const month = parseInt(germanyParts.find(p => p.type === 'month').value) - 1; // Month 0-indexed
  const day = parseInt(germanyParts.find(p => p.type === 'day').value);
  
  // Almanya saat dilimine göre bugünün 00:00:00'ını oluştur
  // Tarayıcının local saat diliminde Date objesi oluştur, ama tarih değerleri Almanya'ya göre olacak
  const today = new Date(year, month, day, 0, 0, 0, 0);
  
  return today;
}

/**
 * Almanya saatine göre bugünün tarih string'ini al (karşılaştırmalar için)
 * @returns {string} YYYY-MM-DD formatında tarih string'i
 */
export function getTodayStringInGermany() {
  const today = getTodayInGermany();
  return today.toISOString().split('T')[0];
}

