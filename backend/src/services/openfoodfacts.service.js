import https from 'https';
import http from 'http';

/**
 * HTTP/HTTPS isteği yap
 * @param {string} url - İstek URL'i
 * @returns {Promise<Response>} Fetch Response benzeri obje
 */
function httpRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'GrunerSuperStore/1.0',
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => JSON.parse(data),
          text: async () => data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * OpenFoodFacts API servisi
 */
class OpenFoodFactsService {
  /**
   * Barkod ile ürün bilgilerini çek
   * @param {string} barcode - Ürün barkodu
   * @returns {Promise<Object|null>} Ürün bilgileri veya null
   */
  async fetchProductByBarcode(barcode) {
    if (!barcode || barcode.trim().length === 0) {
      return null;
    }

    // Barcode'u temizle (sadece rakamlar)
    const cleanBarcode = barcode.replace(/\D/g, '');
    
    if (cleanBarcode.length < 8) {
      return null; // Geçersiz barcode
    }

    try {
      const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`;
      
      const response = await httpRequest(apiUrl);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Ürün bulunamadı
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.status !== 1 || !data.product) {
        return null; // Ürün bulunamadı veya geçersiz response
      }

      return data.product;
    } catch (error) {
      console.error(`❌ OpenFoodFacts API hatası (barcode: ${barcode}):`, error.message);
      return null;
    }
  }

  /**
   * Rate limiting için bekleme fonksiyonu
   * @param {number} ms - Beklenecek milisaniye
   * @returns {Promise<void>}
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new OpenFoodFactsService();

