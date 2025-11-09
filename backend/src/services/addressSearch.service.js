import https from 'https';
import { isCityMatch } from '../utils/cityMatcher.js';
import { normalizeGermanChars, denormalizeGermanChars } from '../utils/stringNormalizer.js';

/**
 * OpenStreetMap Nominatim API ile adres arama servisi
 * Backend'den proxy yaparak CORS ve User-Agent sorunlarını çözer
 */
class AddressSearchService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
  }

  /**
   * HTTP isteği yap
   */
  async httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const body = options.body ? JSON.stringify(options.body) : null;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'GrunerSuperStore/1.0 (contact@grunersuperstore.com)', // Nominatim için zorunlu
          'Accept': 'application/json',
          ...(body && { 'Content-Type': 'application/json' }),
          ...(body && { 'Content-Length': Buffer.byteLength(body) }),
          ...options.headers,
        },
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              data: jsonData,
            });
          } catch (error) {
            resolve({
              ok: false,
              status: res.statusCode,
              data: { error: 'Invalid JSON response' },
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Sonuçları işle ve filtrele
   * @param {Array} data - Nominatim API'den gelen ham sonuçlar
   * @param {Array} allowedCities - İzin verilen şehirler
   * @param {Object} options - Seçenekler
   * @returns {Array} Formatlanmış sonuçlar
   */
  processResults(data, allowedCities, options) {
    const resultsWithRoad = [];
    const resultsWithoutRoad = [];

    data.forEach((item) => {
      const itemCity = item.address?.city || item.address?.town || item.address?.village || '';
      
      // Şehir filtresi varsa kontrol et (fuzzy matching ile)
      // Şehir filtresi yoksa tüm sonuçları göster
      if (allowedCities.length > 0) {
        const isMatch = isCityMatch(itemCity, allowedCities, 0.7);
        if (!isMatch) {
          return; // Bu şehirden değilse atla
        }
      }

      const hasRoad = !!item.address?.road;
      const result = {
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        address: {
          street: item.address?.road || '',
          houseNumber: item.address?.house_number || '',
          postalCode: item.address?.postcode || '',
          city: itemCity,
          district: item.address?.suburb || item.address?.neighbourhood || '',
          state: item.address?.state || '',
          country: item.address?.country || '',
        },
        type: item.type || item.class || 'unknown',
        hasRoad,
      };

      if (hasRoad) {
        resultsWithRoad.push(result);
      } else {
        resultsWithoutRoad.push(result);
      }
    });

    // Şehir filtresi varsa öncelikli şehirlerdeki sonuçları göster
    // Şehir filtresi yoksa tüm sonuçları göster (sokaklar öncelikli)
    let formattedResults;
    if (allowedCities.length > 0) {
      // Şehir filtresi varsa: önce sokakları göster, yoksa diğerlerini
      formattedResults = resultsWithRoad.length > 0 
        ? resultsWithRoad.slice(0, options.limit || 5)
        : resultsWithoutRoad.slice(0, options.limit || 5);
    } else {
      // Şehir filtresi yoksa: tüm sonuçları göster (sokaklar öncelikli)
      // Önce sokakları ekle, sonra diğerlerini ekle
      const allResults = [...resultsWithRoad, ...resultsWithoutRoad];
      formattedResults = allResults.slice(0, options.limit || 5);
    }

    return formattedResults;
  }

  /**
   * Adres arama yap
   * @param {string} query - Arama sorgusu
   * @param {Object} options - Arama seçenekleri
   * @returns {Promise<Array>} Bulunan adresler
   */
  async searchAddress(query, options = {}) {
    if (!query || query.trim().length < 3) {
      return [];
    }

    try {
      // Şehir filtresi: string, array veya null olabilir
      // null = şehir filtresi yok, tüm sonuçlar gösterilir
      const allowedCities = options.city === null || options.city === undefined
        ? [] // null/undefined ise boş array = filtre yok
        : (Array.isArray(options.city) ? options.city : [options.city]);

      // Şehir bilgisini sorguya ekle (varsa ve tek şehir ise)
      // Bu Nominatim'in daha iyi sonuç bulmasını sağlar
      let searchQuery = query;
      if (allowedCities.length === 1) {
        searchQuery = `${query}, ${allowedCities[0]}`;
      } else if (allowedCities.length > 1) {
        // Birden fazla şehir varsa, ilk şehri ekle (Nominatim tek şehir destekler)
        searchQuery = `${query}, ${allowedCities[0]}`;
      }

      // Limit'i artır - daha fazla sonuç gösterelim
      // Şehir filtresi varsa biraz daha fazla al (filtreleme sonrası azalabilir)
      const apiLimit = allowedCities.length > 0
        ? Math.max((options.limit || 5) * 5, 50) // Şehir filtresi varsa daha fazla sonuç al
        : Math.max((options.limit || 5) * 3, 30); // Şehir filtresi yoksa da yeterince sonuç al

      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        addressdetails: '1',
        limit: apiLimit,
        countrycodes: options.countryCodes || 'de',
        'accept-language': 'de',
      });

      const url = `${this.baseUrl}/search?${params.toString()}`;
      
      console.log('[AddressSearchService] API isteği gönderiliyor:', {
        originalQuery: query,
        searchQuery: searchQuery,
        city: options.city,
        allowedCities: allowedCities,
        apiLimit: apiLimit,
        url: url.replace(/q=[^&]+/, 'q=***'),
        limit: options.limit || 5
      });
      
      const response = await this.httpRequest(url, {
        method: 'GET',
      });

      console.log('[AddressSearchService] API yanıtı:', {
        ok: response.ok,
        status: response.status,
        resultCount: response.data?.length || 0
      });

      if (!response.ok) {
        console.error('[AddressSearchService] API hatası:', response.status, response.data);
        return [];
      }

      // Sonuçları işle
      let formattedResults = this.processResults(response.data, allowedCities, options);

      // Eğer sonuç yoksa alternatif sorguları dene
      if (formattedResults.length === 0) {
        // 1. Tersine normalize et (ss → ß): "uhlandstrase" → "uhlandstraße"
        const denormalizedQuery = denormalizeGermanChars(query);
        if (denormalizedQuery !== query.toLowerCase()) {
          console.log('[AddressSearchService] Tersine normalize edilmiş sorgu deneniyor:', denormalizedQuery);
          
          let denormalizedSearchQuery = denormalizedQuery;
          if (allowedCities.length === 1) {
            denormalizedSearchQuery = `${denormalizedQuery}, ${allowedCities[0]}`;
          } else if (allowedCities.length > 1) {
            denormalizedSearchQuery = `${denormalizedQuery}, ${allowedCities[0]}`;
          }

          const denormalizedParams = new URLSearchParams({
            q: denormalizedSearchQuery,
            format: 'json',
            addressdetails: '1',
            limit: apiLimit,
            countrycodes: options.countryCodes || 'de',
            'accept-language': 'de',
          });

          const denormalizedUrl = `${this.baseUrl}/search?${denormalizedParams.toString()}`;
          const denormalizedResponse = await this.httpRequest(denormalizedUrl, { method: 'GET' });

          if (denormalizedResponse.ok && denormalizedResponse.data?.length > 0) {
            formattedResults = this.processResults(denormalizedResponse.data, allowedCities, options);
            console.log('[AddressSearchService] Tersine normalize edilmiş sorgudan sonuç bulundu:', formattedResults.length);
          }
        }

        // 2. Eğer hala sonuç yoksa ve query'de Almanca karakter varsa, normalize edilmiş sorguyu dene
        if (formattedResults.length === 0 && /[ßüöäÜÖÄ]/.test(query)) {
          const normalizedQuery = normalizeGermanChars(query);
          if (normalizedQuery !== query.toLowerCase()) {
            console.log('[AddressSearchService] Normalize edilmiş sorgu deneniyor:', normalizedQuery);
            
            let normalizedSearchQuery = normalizedQuery;
            if (allowedCities.length === 1) {
              normalizedSearchQuery = `${normalizedQuery}, ${allowedCities[0]}`;
            } else if (allowedCities.length > 1) {
              normalizedSearchQuery = `${normalizedQuery}, ${allowedCities[0]}`;
            }

            const normalizedParams = new URLSearchParams({
              q: normalizedSearchQuery,
              format: 'json',
              addressdetails: '1',
              limit: apiLimit,
              countrycodes: options.countryCodes || 'de',
              'accept-language': 'de',
            });

            const normalizedUrl = `${this.baseUrl}/search?${normalizedParams.toString()}`;
            const normalizedResponse = await this.httpRequest(normalizedUrl, { method: 'GET' });

            if (normalizedResponse.ok && normalizedResponse.data?.length > 0) {
              formattedResults = this.processResults(normalizedResponse.data, allowedCities, options);
              console.log('[AddressSearchService] Normalize edilmiş sorgudan sonuç bulundu:', formattedResults.length);
            }
          }
        }
      }

      // Eğer hala sonuç yoksa ve şehir filtresi varsa, şehir filtresiz dene
      if (formattedResults.length === 0 && allowedCities.length > 0) {
        console.log('[AddressSearchService] Şehir filtresiz sorgu deneniyor:', query);
        
        const noCityParams = new URLSearchParams({
          q: query,
          format: 'json',
          addressdetails: '1',
          limit: apiLimit,
          countrycodes: options.countryCodes || 'de',
          'accept-language': 'de',
        });

        const noCityUrl = `${this.baseUrl}/search?${noCityParams.toString()}`;
        const noCityResponse = await this.httpRequest(noCityUrl, { method: 'GET' });

        if (noCityResponse.ok && noCityResponse.data?.length > 0) {
          // Şehir filtresiz sonuçları işle (şehir filtresi yok)
          formattedResults = this.processResults(noCityResponse.data, [], options);
          console.log('[AddressSearchService] Şehir filtresiz sorgudan sonuç bulundu:', formattedResults.length);
        }
      }

      console.log('[AddressSearchService] Formatlanmış sonuçlar:', {
        total: formattedResults.length,
        allowedCities: allowedCities,
        results: formattedResults.map(r => ({
          display: r.displayName,
          street: r.address.street,
          city: r.address.city,
          hasRoad: r.hasRoad
        }))
      });
      
      return formattedResults;
    } catch (error) {
      console.error('[AddressSearchService] Adres arama hatası:', error.message, error.stack);
      return [];
    }
  }
}

export default new AddressSearchService();

