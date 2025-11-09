import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
import campaignRoutes, { adminCampaignRouter } from './routes/campaign.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import emailRoutes from './routes/email.routes.js';
import barcodeLabelRoutes from './routes/barcode-label.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminNotificationRoutes from './routes/admin-notification.routes.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Config
dotenv.config();

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Statik dosya servisi - uploads klasörünü serve et (route'lardan ÖNCE olmalı)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// __dirname = backend/src, uploads klasörü = backend/uploads

// Statik dosya servisi için header ayarları
const staticOptions = {
  setHeaders: (res, path, stat) => {
    // CORS header'larını statik dosyalar için de ekle - development'ta tüm origin'leri kabul et
    if (process.env.NODE_ENV !== 'production') {
      res.set('Access-Control-Allow-Origin', '*');
    } else {
      res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
    }
    res.set('Access-Control-Allow-Credentials', 'true');
    // Cache control headers - production'da cache'le
    if (process.env.NODE_ENV === 'production') {
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 yıl cache
    }
  }
};

// /uploads için static file serving (direkt erişim)
app.use('/uploads', express.static(join(__dirname, '../uploads'), staticOptions));

// /api/uploads için static file serving (frontend'den gelen istekler için)
// Frontend normalizeImageUrl fonksiyonu VITE_API_URL eklediği için /api/uploads oluyor
app.use('/api/uploads', express.static(join(__dirname, '../uploads'), staticOptions));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting - sadece API isteklerine (OPTIONS hariç - CORS preflight)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 2 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100000,
  message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy validation'ını kapat - nginx proxy'si güvenilir
  validate: {
    trustProxy: false,
  },
  // OPTIONS request'lerini skip et (CORS preflight)
  skip: (req) => req.method === 'OPTIONS',
});

// Rate limiting - sadece API isteklerine
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
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
app.use('/api/coupons', couponRoutes);
app.use('/api/admin/email', emailRoutes);
app.use('/api/admin/barcode-labels', barcodeLabelRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);

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
