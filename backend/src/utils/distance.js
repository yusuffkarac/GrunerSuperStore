/**
 * Mesafe hesaplama utility fonksiyonları
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
function calculateDistance(lat1, lon1, lat2, lon2) {
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

/**
 * Mesafe kontrolü yapar - adres ile market konumu arasındaki mesafe sınırı aşıyor mu?
 * @param {number|null} addressLat - Adres enlemi
 * @param {number|null} addressLon - Adres boylamı
 * @param {number|null} storeLat - Market enlemi
 * @param {number|null} storeLon - Market boylamı
 * @param {number|null} maxDistance - Maksimum izin verilen mesafe (km), null ise kontrol yapılmaz
 * @returns {object} { isValid: boolean, distance: number|null, message: string|null }
 */
function validateDistance(addressLat, addressLon, storeLat, storeLon, maxDistance) {
  // Eğer maksimum mesafe belirtilmemişse, kontrol yapma
  if (maxDistance === null || maxDistance === undefined) {
    return {
      isValid: true,
      distance: null,
      message: null,
    };
  }

  // Koordinatlar eksikse kontrol yapılamaz
  if (
    addressLat === null ||
    addressLat === undefined ||
    addressLon === null ||
    addressLon === undefined ||
    storeLat === null ||
    storeLat === undefined ||
    storeLon === null ||
    storeLon === undefined
  ) {
    return {
      isValid: false,
      distance: null,
      message: 'Standortinformationen fehlen. Bitte aktualisieren Sie Ihre Adresse.',
    };
  }

  // Mesafeyi hesapla
  const distance = calculateDistance(
    Number(addressLat),
    Number(addressLon),
    Number(storeLat),
    Number(storeLon)
  );

  // Mesafe kontrolü
  const isValid = distance <= maxDistance;

  return {
    isValid,
    distance: Math.round(distance * 100) / 100, // 2 ondalık basamağa yuvarla
    message: isValid
      ? null
      : `Die maximal erlaubte Bestellentfernung beträgt ${maxDistance} km. Ihre Adresse ist ${distance.toFixed(2)} km vom Markt entfernt.`,
  };
}

export { calculateDistance, validateDistance };

