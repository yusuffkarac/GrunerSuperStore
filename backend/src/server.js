import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
// import rateLimit from 'express-rate-limit'; // Rate limiting deaktif edildi
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import adminRoutes from './routes/admin.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import magazineRoutes from './routes/magazine.routes.js';
import faqRoutes from './routes/faq.routes.js';
import campaignRoutes, { adminCampaignRouter } from './routes/campaign.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import emailRoutes from './routes/email.routes.js';
import barcodeLabelRoutes from './routes/barcode-label.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminNotificationRoutes from './routes/admin-notification.routes.js';
import templateRoutes from './routes/template.routes.js';
import notificationTemplateRoutes from './routes/notification-template.routes.js';
import activityLogRoutes from './routes/activityLog.routes.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Config
// PM2 production'da environment variable'ları zaten set ediyor
// Development'ta .env dosyasını yükle
if (process.env.NODE_ENV !== 'production') {
dotenv.config();
}

// Timezone ayarı - Almanya saatine göre (CET/CEST otomatik handle edilir)
process.env.TZ = 'Europe/Berlin';

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy - reverse proxy (nginx) arkasında çalışırken gerekli
// 1 değeri sadece bir proxy'ye (nginx) güvenmek anlamına gelir
app.set('trust proxy', 1);

// CORS yapılandırması - EN BAŞTA (tüm middleware'lerden önce)
// Development'ta tüm origin'leri kabul et
const corsOptions = {
  origin: function (origin, callback) {
    // Origin yoksa (Postman, curl gibi) tüm origin'leri kabul et
    if (!origin) {
      callback(null, true);
      return;
    }

    // Development modunda localhost ve 127.0.0.1'in tüm portlarını kabul et
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('0.0.0.0');
      if (isLocalhost) {
        callback(null, true);
        return;
      }
      // Development'ta diğer origin'leri de kabul et (esnek geliştirme için)
      callback(null, true);
      return;
    }

    // Production'da belirli origin'leri kontrol et
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173'];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400, // 24 saat
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Helmet yapılandırması - CSP'yi görseller için ayarla
// CORS'dan SONRA (Helmet bazı CORS ayarlarını override edebilir)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5001", "http://localhost:5173"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(compression()); // Response sıkıştırma
app.use(express.json({ limit: '100mb' })); // PDF'ler için artırıldı
app.use(express.urlencoded({ extended: true, limit: '100mb' })); // PDF'ler için artırıldı
app.use(cookieParser());

// Statik dosya servisi - uploads klasörünü serve et (route'lardan ÖNCE olmalı)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// __dirname = backend/src, uploads klasörü = backend/uploads

// Tenant-specific upload path (UPLOAD_PATH environment variable'ından)
// Eğer UPLOAD_PATH yoksa varsayılan olarak uploads klasörünü kullan
const uploadPath = process.env.UPLOAD_PATH 
  ? join(__dirname, '..', process.env.UPLOAD_PATH)
  : join(__dirname, '../uploads');

// Upload klasörünü oluştur (yoksa)
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Statik dosya servisi için header ayarları
const staticOptions = {
  setHeaders: (res, path, stat) => {
    // CORS header'larını statik dosyalar için de ekle - development'ta tüm origin'leri kabul et
    if (process.env.NODE_ENV !== 'production') {
      res.set('Access-Control-Allow-Origin', '*');
    } else {
      // CORS_ORIGIN virgülle ayrılmış liste olabilir
      const allowedOrigins = process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:5173'];
      const origin = res.req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
      }
    }
    res.set('Access-Control-Allow-Credentials', 'true');
    // Cache control headers - production'da cache'le
    if (process.env.NODE_ENV === 'production') {
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 yıl cache
    }
  }
};

// /uploads için static file serving (direkt erişim)
app.use('/uploads', express.static(uploadPath, staticOptions));

// /api/uploads için static file serving (frontend'den gelen istekler için)
// Frontend normalizeImageUrl fonksiyonu VITE_API_URL eklediği için /api/uploads oluyor
app.use('/api/uploads', express.static(uploadPath, staticOptions));

// Logging
// Morgan için Almanya saatine göre özel format
morgan.token('date-germany', (req, res) => {
  const now = new Date();
  
  // Almanya saatine göre zamanı al
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  
  const day = parts.find(p => p.type === 'day').value.padStart(2, '0');
  const month = parts.find(p => p.type === 'month').value;
  const year = parts.find(p => p.type === 'year').value;
  const hour = parts.find(p => p.type === 'hour').value.padStart(2, '0');
  const minute = parts.find(p => p.type === 'minute').value.padStart(2, '0');
  const second = parts.find(p => p.type === 'second').value.padStart(2, '0');
  
  // Timezone offset'ini hesapla (CET: +0100, CEST: +0200)
  // Almanya'da yaz saati (CEST) genellikle Mart sonu - Ekim sonu arasındadır
  let offset = '+0100'; // Varsayılan CET (kış saati)
  
  try {
    // Ay ve gün bilgisini al
    const dayNum = parseInt(day);
    
    // Ay ismini sayıya çevir
    const monthMap = {
      'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
      'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    };
    const monthNum = monthMap[month] || 1;
    
    // Yaz saati kontrolü (basitleştirilmiş - gerçekte her yıl değişir)
    // Genellikle Mart sonu - Ekim sonu arası CEST
    if (monthNum > 3 && monthNum < 10) {
      offset = '+0200'; // Yaz saati (CEST)
    } else if (monthNum === 3 && dayNum >= 25) {
      // Mart sonu (yaklaşık)
      offset = '+0200';
    } else if (monthNum === 10 && dayNum <= 25) {
      // Ekim sonu (yaklaşık)
      offset = '+0200';
    } else {
      offset = '+0100'; // Kış saati (CET)
    }
  } catch (e) {
    // Hata durumunda varsayılan değeri kullan
    offset = '+0100';
  }
  
  return `[${day}/${month}/${year}:${hour}:${minute}:${second} ${offset}]`;
});

if (process.env.NODE_ENV === 'development') {
  // Development modunda da Almanya saatini kullan
  app.use(morgan(':method :url :status :response-time ms - :date-germany'));
} else {
  // Combined format'ı Almanya saatine göre özelleştir
  app.use(morgan(':remote-addr - - :date-germany ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'));
}

// Rate limiting - DEAKTİF EDİLDİ
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 2 * 60 * 1000,
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100000,
//   message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   // Nginx proxy'si arkasında gerçek client IP'yi kullan
//   // X-Forwarded-For header'ından gerçek IP'yi al
//   keyGenerator: (req) => {
//     // Nginx'ten gelen gerçek client IP'yi al
//     const forwardedFor = req.headers['x-forwarded-for'];
//     if (forwardedFor) {
//       // X-Forwarded-For: client1, proxy1, proxy2 formatında olabilir
//       // İlk IP gerçek client IP'sidir
//       const clientIp = forwardedFor.split(',')[0].trim();
//       return clientIp || req.ip;
//     }
//     return req.ip;
//   },
//   // OPTIONS request'lerini skip et (CORS preflight)
//   skip: (req) => req.method === 'OPTIONS',
// });

// Rate limiting - DEAKTİF EDİLDİ
// app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: {
      name: process.env.DB_NAME || 'not set',
      host: process.env.DB_HOST || 'not set',
      port: process.env.DB_PORT || 'not set',
      user: process.env.DB_USER || 'not set',
    }
  });
});

// CORS test endpoint
app.get('/api/test-cors', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CORS test successful',
    origin: req.headers.origin,
    headers: req.headers,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/campaigns', adminCampaignRouter);
app.use('/api/settings', settingsRoutes);
app.use('/api/magazines', magazineRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin/email', emailRoutes);
app.use('/api/admin/barcode-labels', barcodeLabelRoutes);
app.use('/api/admin/templates', templateRoutes);
app.use('/api/admin/notification-templates', notificationTemplateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/logs', activityLogRoutes);

// Test route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Gruner SuperStore API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      cart: '/api/cart',
      orders: '/api/orders',
      favorites: '/api/favorites',
      admin: '/api/admin',
    },
  });
});

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Server başlatma - 0.0.0.0 ile tüm network interface'lerine bind et
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`🌐 Network URL: http://0.0.0.0:${PORT}`);
});

export default app;
