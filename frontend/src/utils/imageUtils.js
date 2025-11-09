/**
 * Image URL'lerini normalize eder - relative path'leri tam URL'ye çevirir
 */
export const normalizeImageUrl = (url) => {
  if (!url) return url;
  
  // Eğer zaten tam URL ise (http/https ile başlıyorsa) direkt döndür
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // API base URL'i dinamik olarak oluştur (api.js ile aynı mantık)
  const getApiBaseUrl = () => {
    // Eğer environment variable varsa onu kullan
    if (import.meta.env.VITE_API_URL) {
      const url = import.meta.env.VITE_API_URL;
      // /api ile bitiyorsa kaldır (çünkü /uploads ekleyeceğiz)
      return url.endsWith('/api') ? url.slice(0, -4) : url;
    }
    
    // Development modunda localhost kullan
    if (import.meta.env.DEV) {
      return 'http://localhost:5001';
    }
    
    // Production'da dinamik olarak hostname ve protocol kullan
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = '5001';
    return `${protocol}//${hostname}:${port}`;
  };
  
  const API_BASE = getApiBaseUrl();
  
  // Eğer /uploads ile başlıyorsa API base URL ekle
  // Backend'de hem /uploads hem de /api/uploads serve ediliyor
  // /api/uploads kullanarak tutarlılık sağlıyoruz
  if (url.startsWith('/uploads')) {
    return `${API_BASE}/api${url}`;
  }
  
  // Diğer durumlarda direkt döndür
  return url;
};

/**
 * Image URL array'ini normalize eder
 */
export const normalizeImageUrls = (imageUrls) => {
  if (!imageUrls) return [];
  
  if (Array.isArray(imageUrls)) {
    return imageUrls.map(normalizeImageUrl).filter(Boolean);
  }
  
  if (typeof imageUrls === 'string') {
    return [normalizeImageUrl(imageUrls)];
  }
  
  return [];
};

/**
 * Görseli kırpar ve File nesnesi olarak döndürür
 */
export const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context oluşturulamadı');
  }

  // Canvas boyutlarını kırpma alanına göre ayarla
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Görseli canvas'a çiz
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Canvas'ı blob'a dönüştür
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas boş'));
          return;
        }
        // Blob'u File nesnesine dönüştür - rastgele numara ile dosya adı
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
        const file = new File([blob], uniqueName, {
          type: 'image/png',
          lastModified: Date.now(),
        });
        resolve(file);
      },
      'image/png',
      1.0
    );
  });
};

/**
 * Görsel URL'den Image nesnesi oluşturur
 */
const createImage = (url) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });
};

