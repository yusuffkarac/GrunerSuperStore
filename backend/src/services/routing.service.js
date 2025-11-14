import https from 'https';

/**
 * OpenRouteService ile yol mesafesi hesaplama servisi
 * Ücretsiz ve açık kaynak routing API
 */
class RoutingService {
  constructor() {
    // OpenRouteService API key (environment variable'dan alınır)
    // Ücretsiz API key için: https://openrouteservice.org/dev/#/signup
    this.apiKey = process.env.OPENROUTESERVICE_API_KEY || null;
    this.baseUrl = 'https://api.openrouteservice.org/v2';
    
    console.log('[RoutingService] Constructor çalıştı:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      baseUrl: this.baseUrl,
      envVarExists: !!process.env.OPENROUTESERVICE_API_KEY
    });
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
          'Content-Type': 'application/json',
          'User-Agent': 'GrunerSuperStore/1.0',
          ...(body && { 'Content-Length': Buffer.byteLength(body) }),
          ...options.headers,
        },
      };

      console.log('[RoutingService] HTTP isteği başlatılıyor:', {
        hostname: requestOptions.hostname,
        path: requestOptions.path.replace(/api_key=[^&]+/, 'api_key=***HIDDEN***'),
        method: requestOptions.method,
        hasBody: !!body
      });

      const req = https.request(requestOptions, (res) => {
        let data = '';
        
        console.log('[RoutingService] HTTP yanıt başlıkları:', {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers
        });
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('[RoutingService] HTTP yanıt tamamlandı:', {
            statusCode: res.statusCode,
            dataLength: data.length,
            dataPreview: data.substring(0, 200)
          });
          
          try {
            const jsonData = JSON.parse(data);
            const result = {
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              data: jsonData,
            };
            console.log('[RoutingService] JSON parse başarılı:', {
              ok: result.ok,
              status: result.status
            });
            resolve(result);
          } catch (error) {
            console.error('[RoutingService] JSON parse hatası:', {
              error: error.message,
              dataPreview: data.substring(0, 200)
            });
            resolve({
              ok: false,
              status: res.statusCode,
              data: { error: 'Invalid JSON response' },
            });
          }
        });
      });

      req.on('error', (error) => {
        console.error('[RoutingService] HTTP istek hatası:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        reject(error);
      });

      req.setTimeout(15000, () => {
        console.error('[RoutingService] HTTP istek timeout (15 saniye)');
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(body);
      }

      req.end();
      console.log('[RoutingService] HTTP isteği gönderildi');
    });
  }

  /**
   * İki koordinat arasındaki yol mesafesini hesapla
   * @param {number} originLat - Başlangıç enlemi
   * @param {number} originLon - Başlangıç boylamı
   * @param {number} destLat - Hedef enlemi
   * @param {number} destLon - Hedef boylamı
   * @returns {Promise<{distance: number, duration: number}|null>} Mesafe (km) ve süre (saniye)
   */
  async calculateRoadDistance(originLat, originLon, destLat, destLon) {
    console.log('[RoutingService] calculateRoadDistance çağrıldı');
    console.log('[RoutingService] Koordinatlar:', {
      origin: { lat: originLat, lon: originLon },
      dest: { lat: destLat, lon: destLon }
    });
    
    // API key yoksa null döndür
    console.log('[RoutingService] API Key kontrolü:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'YOK'
    });
    
    if (!this.apiKey) {
      console.warn('⚠️  [RoutingService] OpenRouteService API key bulunamadı. Yol mesafesi hesaplanamıyor.');
      console.warn('⚠️  [RoutingService] OPENROUTESERVICE_API_KEY environment variable kontrol edin.');
      return null;
    }

    try {
      const url = `${this.baseUrl}/directions/driving-car?api_key=${this.apiKey}`;
      console.log('[RoutingService] API URL oluşturuldu:', url.replace(this.apiKey, '***HIDDEN***'));
      
      const requestBody = {
        coordinates: [
          [originLon, originLat], // OpenRouteService [longitude, latitude] formatı kullanır
          [destLon, destLat],
        ],
        // units parametresi kaldırıldı - API varsayılan olarak metre döndürür
      };
      
      console.log('[RoutingService] API isteği gönderiliyor:', {
        method: 'POST',
        coordinates: requestBody.coordinates
      });

      const response = await this.httpRequest(url, {
        method: 'POST',
        body: requestBody,
      });

      console.log('[RoutingService] API yanıtı alındı:', {
        ok: response.ok,
        status: response.status,
        hasRoutes: !!response.data?.routes,
        routesLength: response.data?.routes?.length || 0
      });
      
      // API yanıtının detaylarını logla
      if (response.data?.routes?.[0]?.summary) {
        console.log('[RoutingService] API yanıt summary (ham):', JSON.stringify(response.data.routes[0].summary, null, 2));
      }

      if (!response.ok || !response.data?.routes || response.data.routes.length === 0) {
        console.error('[RoutingService] OpenRouteService API hatası:', {
          ok: response.ok,
          status: response.status,
          data: response.data
        });
        return null;
      }

      const route = response.data.routes[0];
      const distance = route.summary?.distance || 0; // metre cinsinden (API varsayılan)
      const duration = route.summary?.duration || 0; // saniye cinsinden

      console.log('[RoutingService] Route bilgileri (ham):', {
        routeSummary: route.summary,
        distanceRaw: distance,
        durationRaw: duration,
        distanceType: typeof distance,
        distanceValue: distance
      });

      console.log('[RoutingService] Route bilgileri:', {
        distanceMeters: distance,
        durationSeconds: duration,
        distanceInKm: distance / 1000
      });

      // Metreyi kilometreye çevir (API varsayılan olarak metre döndürür)
      // 2 ondalık basamağa yuvarla
      const distanceKm = Math.round((distance / 1000) * 100) / 100;
      
      console.log('[RoutingService] Mesafe hesaplama detayı:', {
        distanceMeters: distance,
        distanceDividedBy1000: distance / 1000,
        multipliedBy100: (distance / 1000) * 100,
        rounded: Math.round((distance / 1000) * 100),
        finalKm: distanceKm
      });

      const result = {
        distance: distanceKm,
        duration: Math.round(duration / 60), // dakikaya çevir
      };
      
      console.log('[RoutingService] Sonuç:', result);
      return result;
    } catch (error) {
      console.error('[RoutingService] ❌ OpenRouteService API hatası:', {
        message: error.message,
        stack: error.stack
      });
      return null;
    }
  }
}

export default new RoutingService();

