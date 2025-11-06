# Gruner SuperStore

Online market sipariş uygulaması - Web tabanlı PWA (Progressive Web App)

## Özellikler

- **Sipariş Tipleri**: Gel Al (Pick-up) ve Kapıya Gelsin (Delivery)
- **Ödeme**: Kapıda ödeme (online ödeme yok)
- **Ürün Yönetimi**: ~500 ürün, kategoriler, görseller
- **Stok Yönetimi**: Otomatik stok takibi ve email uyarısı
- **Kullanıcı Sistemi**: JWT tabanlı güvenli kimlik doğrulama
- **Sipariş Takibi**: Email ve bildirimlerle sipariş durumu
- **Admin Panel**: Sipariş, ürün ve stok yönetimi
- **Favori Ürünler**: Kullanıcılar favori ürünlerini kaydedebilir
- **Sipariş Geçmişi**: Eski siparişleri görüntüleme
- **Bölge Sınırlaması**: Teslimat bölgesi kontrolü
- **PWA**: Mobil uygulama hissi veren web uygulaması

## Teknoloji Stack

### Frontend
- React 18
- Tailwind CSS
- Vite
- React Router DOM
- Zustand (State Management)
- Framer Motion (Animasyonlar)
- React Swipeable (Gesture Desteği)
- Axios
- PWA

### Backend
- Node.js
- Express
- PostgreSQL
- JWT (Authentication)
- Nodemailer (Email)
- Cloudinary (Görsel Depolama)
- Bcrypt (Şifre Hashleme)

## Kurulum

### Gereksinimler
- Node.js (v18+)
- PostgreSQL (v14+)
- npm veya yarn

### 1. Projeyi Klonlayın
```bash
git clone <repo-url>
cd GrunerSuperStore
```

### 2. Backend Kurulumu

```bash
cd backend
npm install
```

**.env dosyası oluşturun:**
```bash
cp .env.example .env
```

`.env` dosyasındaki değerleri düzenleyin:
- Database bilgilerini girin
- JWT secret oluşturun
- Email SMTP ayarlarını yapın
- Cloudinary hesabı oluşturup API bilgilerini girin

**Veritabanını oluşturun:**
```bashpsql -U postgres

# PostgreSQL'e bağlanın
psql -U postgres

# Veritabanı oluşturun
CREATE DATABASE gruner_superstore;

# Çıkış yapın
\q
```

**Migration çalıştırın:**
```bash
npm run migrate
```

**Backend'i başlatın:**
```bash
npm run dev
```

Backend http://localhost:5001 adresinde çalışacaktır.

### 3. Frontend Kurulumu

```bash
cd frontend
npm install
```

**.env dosyası oluşturun:**
```bash
cp .env.example .env
```

**Frontend'i başlatın:**
```bash
npm run dev
```

Frontend http://localhost:5173 adresinde çalışacaktır.

## Proje Yapısı

```
GrunerSuperStore/
├── frontend/
│   ├── public/
│   │   ├── manifest.json      # PWA manifest
│   │   └── index.html
│   ├── src/
│   │   ├── components/        # UI bileşenleri
│   │   │   ├── common/        # Ortak bileşenler (Button, Input, Card)
│   │   │   ├── layout/        # Layout bileşenleri (Header, Footer, Navbar)
│   │   │   └── features/      # Özellik bileşenleri
│   │   ├── pages/             # Sayfa bileşenleri
│   │   ├── services/          # API servisleri
│   │   ├── store/             # Global state yönetimi
│   │   ├── utils/             # Yardımcı fonksiyonlar
│   │   ├── hooks/             # Custom React hooks
│   │   ├── constants/         # Sabitler
│   │   ├── styles/            # Global stiller
│   │   └── App.jsx            # Ana uygulama
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/       # İstek işleyiciler
│   │   ├── models/            # Database modelleri
│   │   ├── routes/            # API rotaları
│   │   ├── middleware/        # Middleware'ler (auth, validation, vb.)
│   │   ├── services/          # İş mantığı servisleri
│   │   ├── utils/             # Yardımcı fonksiyonlar
│   │   ├── config/            # Konfigürasyon dosyaları
│   │   └── server.js          # Ana sunucu dosyası
│   └── package.json
├── .gitignore
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/profile` - Profil bilgisi
- `PUT /api/auth/profile` - Profil güncelleme

### Products
- `GET /api/products` - Tüm ürünleri listele
- `GET /api/products/:id` - Ürün detayı
- `GET /api/products/category/:categoryId` - Kategoriye göre ürünler
- `POST /api/products` - Ürün ekle (Admin)
- `PUT /api/products/:id` - Ürün güncelle (Admin)
- `DELETE /api/products/:id` - Ürün sil (Admin)

### Categories
- `GET /api/categories` - Tüm kategorileri listele
- `POST /api/categories` - Kategori ekle (Admin)
- `PUT /api/categories/:id` - Kategori güncelle (Admin)
- `DELETE /api/categories/:id` - Kategori sil (Admin)

### Orders
- `GET /api/orders` - Kullanıcının siparişleri
- `GET /api/orders/:id` - Sipariş detayı
- `POST /api/orders` - Sipariş oluştur
- `PUT /api/orders/:id/status` - Sipariş durumu güncelle (Admin)
- `GET /api/orders/admin/all` - Tüm siparişler (Admin)

### Favorites
- `GET /api/favorites` - Favori ürünler
- `POST /api/favorites/:productId` - Favorilere ekle
- `DELETE /api/favorites/:productId` - Favorilerden çıkar

### Cart
- Frontend'de local storage ile yönetilir (backend endpoint'i yok)

## Geliştirme Kuralları

Proje geliştirirken `CLAUDE.md` dosyasındaki kurallara uyulmalıdır:

- **Naming**: camelCase (değişken/fonksiyon), PascalCase (component), UPPER_SNAKE_CASE (sabit)
- **Tailwind**: Mobile-first, tekrar eden classlar için @apply
- **Yorumlar**: Türkçe yazılmalı
- **Güvenlik**: .env kullanımı, input validation, parameterized queries
- **PWA**: manifest.json, service worker, offline support
- **Mobile-First**: Bottom navigation, gesture support, smooth transitions

## Deployment

### Production Build

**Backend:**
```bash
cd backend
NODE_ENV=production npm start
```

**Frontend:**
```bash
cd frontend
npm run build
```

Build dosyaları `frontend/dist/` klasöründe oluşturulur.

## Lisans

Bu proje özel bir projedir.

## İletişim

Sorular için: [email]
