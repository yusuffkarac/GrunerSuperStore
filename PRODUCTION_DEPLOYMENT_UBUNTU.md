# Production Deployment Rehberi - Ubuntu

Bu rehber, GrunerSuperStore projesini Ubuntu sunucuda production ortamına kurmak için adım adım talimatlar içerir.

## Sunucu Bilgileri

- **Sunucu IP**: 82.165.174.89
- **Domain**: meral.netwerkpro.de
- **Node.js Versiyonu**: v20.19.5
- **Database**: PostgreSQL
- **Web Server**: Nginx
- **Process Manager**: PM2

---

## 1. Sunucuya Bağlanma

```bash
ssh root@82.165.174.89
# Şifre: VZgB2CSa
```

---

## 2. Sistem Güncellemeleri

```bash
# Sistem güncellemelerini yap
apt update && apt upgrade -y

# Temel paketleri kur
apt install -y curl wget git build-essential software-properties-common
```

---

## 3. Node.js v20.19.5 Kurulumu

```bash
# NodeSource repository ekle
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Node.js kur
apt install -y nodejs

# Versiyonu kontrol et (v20.19.5 olmalı)
node --version

# Eğer versiyon farklıysa, nvm ile kurulum yap
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# NVM ile Node.js v20.19.5 kur
nvm install 20.19.5
nvm use 20.19.5
nvm alias default 20.19.5

# Versiyonu tekrar kontrol et
node --version  # v20.19.5 olmalı
npm --version
```

---

## 4. PostgreSQL Kurulumu

```bash
# PostgreSQL repository ekle
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update

# PostgreSQL kur
apt install -y postgresql postgresql-contrib

# PostgreSQL servisini başlat
systemctl start postgresql
systemctl enable postgresql

# PostgreSQL kullanıcı şifresini ayarla
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'admin999';"

# Database oluştur
sudo -u postgres psql -c "CREATE DATABASE gruner_superstore;"

# PostgreSQL'in dışarıdan erişime açılması (opsiyonel - sadece gerekirse)
# /etc/postgresql/*/main/postgresql.conf dosyasında:
# listen_addresses = 'localhost'  (sadece localhost'tan erişim için)
```

---

## 5. Nginx Kurulumu ve Yapılandırması

```bash
# Nginx kur
apt install -y nginx

# Nginx config dosyası oluştur
nano /etc/nginx/sites-available/meral.netwerkpro.de
```

Aşağıdaki içeriği ekle:

```nginx
server {
    listen 80;
    server_name meral.netwerkpro.de;

    # Frontend için
    location / {
        root /var/www/meral.netwerkpro.de/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API için
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Upload dosyaları için
    location /uploads {
        alias /var/www/meral.netwerkpro.de/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip sıkıştırma
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

```bash
# Symbolic link oluştur
ln -s /etc/nginx/sites-available/meral.netwerkpro.de /etc/nginx/sites-enabled/

# Default config'i devre dışı bırak (varsa)
rm -f /etc/nginx/sites-enabled/default

# Nginx config'i test et
nginx -t

# Nginx'i başlat
systemctl start nginx
systemctl enable nginx
```

---

## 6. PM2 Kurulumu

```bash
# PM2'yi global olarak kur
npm install -g pm2

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup systemd
# Çıkan komutu çalıştır (örnek: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root)
```

---

## 7. Redis Kurulumu (Opsiyonel - Email Queue için)

```bash
# Redis kur
apt install -y redis-server

# Redis servisini başlat
systemctl start redis-server
systemctl enable redis-server

# Redis test
redis-cli ping  # PONG dönmeli
```

---

## 8. Proje Kurulumu

```bash
# Proje klasörü oluştur
mkdir -p /var/www/meral.netwerkpro.de
cd /var/www/meral.netwerkpro.de

# Git'ten projeyi klonla
git clone https://github.com/yusuffkarac/GrunerSuperStore.git .

# Proje klasörlerine izin ver
chown -R $USER:$USER /var/www/meral.netwerkpro.de
```

---

## 9. Backend Kurulumu

```bash
cd /var/www/meral.netwerkpro.de/backend

# Dependencies kur
npm install

# Environment dosyası oluştur
nano .env
```

`.env` dosyasına aşağıdaki içeriği ekle:

```env
NODE_ENV=production
PORT=5001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gruner_superstore
DB_USER=postgres
DB_PASSWORD=GüçlüBirŞifreBuraya

# JWT
JWT_SECRET=ÇokGüçlüVeGizliBirJWTSecretKeyBuraya

# CORS
CORS_ORIGIN=https://meral.netwerkpro.de,http://meral.netwerkpro.de

# Upload
UPLOAD_PATH=uploads

# Email (SMTP ayarlarınızı buraya ekleyin)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@meral.netwerkpro.de

# Cloudinary (eğer kullanıyorsanız)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# OpenRouteService (eğer kullanıyorsanız)
ORS_API_KEY=

# Google Gemini (eğer kullanıyorsanız)
GEMINI_API_KEY=

# OpenAI (eğer kullanıyorsanız)
OPENAI_API_KEY=
```

---

## 10. Database Migration (ÖNEMLİ)

Migration'lar eksik olduğu için, en sağlam yöntem **Prisma Schema'yı kullanarak database'i sıfırdan oluşturmak**tır.

### Yöntem 1: Prisma Migrate Deploy (Önerilen)

```bash
cd /var/www/meral.netwerkpro.de/backend

# Prisma Client'ı generate et
npx prisma generate

# Migration'ları production modunda çalıştır
npx prisma migrate deploy
```

Bu komut:
- `prisma/migrations` klasöründeki tüm migration'ları sırayla çalıştırır
- Migration geçmişini `_prisma_migrations` tablosunda tutar
- Production için güvenli bir yöntemdir

### Yöntem 2: Prisma DB Push (Hızlı ama dikkatli kullan)

Eğer migration'lar çalışmazsa veya hızlı bir kurulum istiyorsanız:

```bash
cd /var/www/meral.netwerkpro.de/backend

# Schema'yı database'e push et (migration geçmişi olmadan)
npx prisma db push

# Prisma Client'ı generate et
npx prisma generate
```

**UYARI**: `db push` migration geçmişini tutmaz, sadece schema'yı database'e uygular. Production'da dikkatli kullanın.

### Yöntem 3: Manuel SQL (En sağlam - önerilen)

Eğer mevcut bir database'iniz varsa ve veri kaybı istemiyorsanız:

```bash
cd /var/www/meral.netwerkpro.de/backend

# Önce schema'yı SQL'e çevir
npx prisma migrate dev --create-only --name initial_schema

# Oluşan migration dosyasını kontrol et
# Sonra manuel olarak çalıştır veya:
npx prisma migrate deploy
```

---

## 11. İlk Admin Kullanıcısı Oluşturma

```bash
cd /var/www/meral.netwerkpro.de/backend

# Admin kullanıcısı oluştur
npm run create-admin
```

Komut sizden email ve şifre isteyecektir.

---

## 12. Frontend Kurulumu ve Build

```bash
cd /var/www/meral.netwerkpro.de/frontend

# Dependencies kur
npm install

# Environment dosyası oluştur (opsiyonel - eğer gerekirse)
# Vite config'de API URL'i kontrol et

# Production build yap
npm run build

# Build çıktısını kontrol et
ls -la dist/
```

---

## 13. Upload Klasörlerini Oluşturma

```bash
cd /var/www/meral.netwerkpro.de/backend

# Upload klasörlerini oluştur
mkdir -p uploads/products
mkdir -p uploads/categories
mkdir -p uploads/campaigns
mkdir -p uploads/magazines
mkdir -p uploads/general
mkdir -p uploads/weekly-discounts

# İzinleri ayarla
chmod -R 755 uploads
chown -R $USER:$USER uploads
```

---

## 14. PM2 ile Backend'i Başlatma

```bash
cd /var/www/meral.netwerkpro.de

# PM2 ecosystem config dosyası zaten projede var ve .env dosyasından otomatik okuma yapıyor
# Sadece backend/.env dosyasını oluşturduğunuzdan emin olun

# Ecosystem config'i kontrol et (isteğe bağlı)
cat ecosystem.config.cjs
```

**Not**: `ecosystem.config.cjs` dosyası zaten projede mevcut ve `backend/.env` dosyasından otomatik olarak environment variable'ları okuyor. Bu yüzden ayrıca bir config dosyası oluşturmanıza gerek yok.

Eğer manuel olarak environment variable'ları eklemek isterseniz, `ecosystem.config.cjs` dosyasını düzenleyebilirsiniz, ancak genellikle `.env` dosyası yeterlidir.

```bash
# Log klasörü oluştur
mkdir -p /var/www/meral.netwerkpro.de/logs

# PM2 ile başlat
pm2 start ecosystem.config.cjs

# PM2 durumunu kontrol et
pm2 status

# PM2 loglarını kontrol et
pm2 logs gruner-backend

# PM2'yi kaydet (restart sonrası otomatik başlasın)
pm2 save
```

---

## 15. SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kur
apt install -y certbot python3-certbot-nginx

# SSL sertifikası al
certbot --nginx -d meral.netwerkpro.de

# Otomatik yenileme test et
certbot renew --dry-run
```

Certbot otomatik olarak Nginx config'ini güncelleyecektir.

---

## 16. Firewall Ayarları

```bash
# UFW firewall kur
apt install -y ufw

# Temel kuralları ekle
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 5001/tcp  # Backend portu (sadece localhost'tan erişilebilir olmalı)

# Firewall'u aktif et
ufw enable

# Durumu kontrol et
ufw status
```

---

## 17. Sistem Optimizasyonları

```bash
# Node.js için sistem limitlerini artır
nano /etc/security/limits.conf
```

Şu satırları ekle:

```
* soft nofile 65536
* hard nofile 65536
```

```bash
# PostgreSQL performans ayarları (opsiyonel)
nano /etc/postgresql/*/main/postgresql.conf
```

Önemli ayarlar:
```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

```bash
# PostgreSQL'i yeniden başlat
systemctl restart postgresql
```

---

## 18. Monitoring ve Log Yönetimi

```bash
# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Log rotasyon için logrotate ayarı
nano /etc/logrotate.d/gruner
```

İçerik:

```
/var/www/meral.netwerkpro.de/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
```

---

## 19. Yedekleme Stratejisi

```bash
# Yedekleme scripti oluştur
nano /root/backup-gruner.sh
```

İçerik:

```bash
#!/bin/bash
BACKUP_DIR="/root/backups/gruner"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database yedeği
sudo -u postgres pg_dump gruner_superstore > $BACKUP_DIR/db_$DATE.sql

# Upload klasörü yedeği
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/meral.netwerkpro.de/backend/uploads

# Eski yedekleri temizle (30 günden eski)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Yedekleme tamamlandı: $DATE"
```

```bash
# Script'e çalıştırma izni ver
chmod +x /root/backup-gruner.sh

# Cron job ekle (her gün saat 02:00'de)
crontab -e
```

Şu satırı ekle:

```
0 2 * * * /root/backup-gruner.sh >> /var/log/gruner-backup.log 2>&1
```

---

## 20. Test ve Doğrulama

```bash
# Backend API test
curl http://localhost:5001/api/health  # Eğer health endpoint varsa

# Frontend test
curl http://localhost/

# Nginx test
nginx -t

# PM2 durumu
pm2 status
pm2 logs gruner-backend --lines 50

# Database bağlantısı test
cd /var/www/meral.netwerkpro.de/backend
npx prisma db execute --stdin <<< "SELECT 1;"
```

---

## 21. Troubleshooting

### Backend başlamıyorsa:

```bash
# Logları kontrol et
pm2 logs gruner-backend --lines 100

# Manuel olarak test et
cd /var/www/meral.netwerkpro.de/backend
node src/server.js
```

### Database bağlantı hatası:

```bash
# PostgreSQL servisini kontrol et
systemctl status postgresql

# Database'in var olduğunu kontrol et
sudo -u postgres psql -l

# Bağlantıyı test et
sudo -u postgres psql -d gruner_superstore
```

### Nginx 502 hatası:

```bash
# Backend'in çalıştığını kontrol et
curl http://localhost:5001/api/health

# Nginx error loglarını kontrol et
tail -f /var/log/nginx/error.log
```

### Frontend build hatası:

```bash
# Node modules'ü temizle ve yeniden kur
cd /var/www/meral.netwerkpro.de/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 22. Güncelleme İşlemi

Projeyi güncellemek için:

```bash
cd /var/www/meral.netwerkpro.de

# Değişiklikleri çek
git pull origin main

# Backend dependencies güncelle
cd backend
npm install

# Migration'ları çalıştır (eğer varsa)
npx prisma migrate deploy
npx prisma generate

# Frontend dependencies güncelle
cd ../frontend
npm install

# Frontend rebuild
npm run build

# PM2'yi yeniden başlat
pm2 restart gruner-backend

# Logları kontrol et
pm2 logs gruner-backend --lines 50
```

---

## 23. Güvenlik Kontrol Listesi

- [ ] Güçlü database şifresi kullanıldı
- [ ] JWT_SECRET güçlü ve benzersiz
- [ ] Firewall aktif ve doğru yapılandırıldı
- [ ] SSL sertifikası kuruldu
- [ ] SSH key-based authentication kullanılıyor (şifre yerine)
- [ ] Gereksiz portlar kapatıldı
- [ ] Düzenli yedekleme yapılıyor
- [ ] Log rotasyon ayarlandı
- [ ] PM2 monitoring aktif
- [ ] Environment variable'lar güvenli tutuluyor

---

## 24. Önemli Notlar

1. **Database Migration**: Migration'lar eksik olduğu için `prisma migrate deploy` kullanarak tüm migration'ları çalıştırın. Eğer sorun olursa `prisma db push` kullanabilirsiniz ama bu migration geçmişini tutmaz.

2. **Multi-Tenant**: Bu kurulum tek tenant için yapılmıştır. Multi-tenant yapı kullanılmayacak.

3. **Environment Variables**: Tüm hassas bilgileri `.env` dosyasında saklayın ve bu dosyayı git'e commit etmeyin.

4. **Upload Klasörleri**: Upload klasörlerinin izinlerini düzenli kontrol edin.

5. **Yedekleme**: Düzenli yedekleme yapın ve yedekleri farklı bir yerde saklayın.

---

## 25. İletişim ve Destek

Sorun yaşarsanız:
1. PM2 loglarını kontrol edin: `pm2 logs gruner-backend`
2. Nginx loglarını kontrol edin: `tail -f /var/log/nginx/error.log`
3. Database loglarını kontrol edin: `/var/log/postgresql/`

---

**Kurulum tamamlandı!** 🎉

Artık `https://meral.netwerkpro.de` adresinden uygulamanıza erişebilirsiniz.

