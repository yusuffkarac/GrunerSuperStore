import api from './api';

/**
 * Adres arama servisi - Backend API üzerinden
 * Backend OpenStreetMap Nominatim API'sini proxy ediyor
 * CORS ve User-Agent sorunlarını backend üzerinden çözüyor
 */

/**
 * Adres arama yap
 * @param {string} query - Arama sorgusu (örn: "Musterstraße 1, Stuttgart")
 * @param {Object} options - Arama seçenekleri
 * @returns {Promise<Array>} Bulunan adresler
 */
export const searchAddress = async (query, options = {}) => {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const params = {
      q: query,
      limit: options.limit || 5,
    };
    
    // Eğer city belirtilmişse ekle, yoksa backend varsayılan şehri kullanacak
    if (options.city) {
      params.city = options.city;
    }

    const response = await api.get('/user/search-address', { params });

    // api.get zaten response.data döndürüyor (interceptor'dan dolayı)
    return response?.data?.addresses || [];
  } catch (error) {
    console.error('[AddressSearch] Adres arama hatası:', error);
    return [];
  }
};

/**
 * Posta kodu ve şehir ile adres arama
 * @param {string} postalCode - Posta kodu
 * @param {string} city - Şehir
 * @returns {Promise<Array>} Bulunan adresler
 */
export const searchByPostalCodeAndCity = async (postalCode, city) => {
  const query = `${postalCode} ${city}`;
  return searchAddress(query, { limit: 1 });
};

/**
 * Sokak adı ve şehir ile adres arama
 * @param {string} street - Sokak adı
 * @param {string} houseNumber - Ev numarası
 * @param {string} city - Şehir
 * @param {string} postalCode - Posta kodu (opsiyonel)
 * @returns {Promise<Array>} Bulunan adresler
 */
export const searchByStreetAndCity = async (street, houseNumber, city, postalCode = '') => {
  let query = street;
  if (houseNumber) {
    query += ` ${houseNumber}`;
  }
  if (city) {
    query += `, ${city}`;
  }
  if (postalCode) {
    query = `${postalCode} ${query}`;
  }
  return searchAddress(query, { limit: 5 });
};

/**
 * Koordinatlardan adres bul (Reverse Geocoding)
 * @param {number} latitude - Enlem
 * @param {number} longitude - Boylam
 * @returns {Promise<Object|null>} Bulunan adres
 */
export const reverseGeocode = async (latitude, longitude) => {
  if (!latitude || !longitude) {
    return null;
  }

  try {
    const params = {
      lat: latitude,
      lon: longitude,
    };

    const response = await api.get('/user/reverse-geocode', { params });

    // api.get zaten response.data döndürüyor (interceptor'dan dolayı)
    return response?.data?.address || null;
  } catch (error) {
    console.error('[AddressSearch] Reverse geocoding hatası:', error);
    return null;
  }
};

export default {
  searchAddress,
  searchByPostalCodeAndCity,
  searchByStreetAndCity,
  reverseGeocode,
};
