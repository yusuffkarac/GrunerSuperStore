/**
 * Mesafe hesaplama utility fonksiyonları (Frontend)
 * Haversine formülü kullanarak iki koordinat arasındaki mesafeyi hesaplar
 */

/**
 * İki koordinat arasındaki mesafeyi kilometre cinsinden hesaplar (Haversine formülü)
 * @param {number} lat1 - İlk noktanın enlemi
 * @param {number} lon1 - İlk noktanın boylamı
 * @param {number} lat2 - İkinci noktanın enlemi
 * @param {number} lon2 - İkinci noktanın boylamı
 * @returns {number} İki nokta arasındaki mesafe (kilometre)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Dünya yarıçapı (kilometre)
  const R = 6371;

  // Dereceleri radyana çevir
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Dereceyi radyana çevirir
 * @param {number} degrees - Derece cinsinden açı
 * @returns {number} Radyan cinsinden açı
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

