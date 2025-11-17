# Production Deployment Rehberi - Ubuntu (15935test.gruner-super.store)

Bu rehber, GrunerSuperStore projesini Ubuntu sunucuda production ortamına kurmak için adım adım talimatlar içerir.

## Sunucu Bilgileri

- **Sunucu IP**: 87.106.47.223
- **Domain**: 15935test.gruner-super.store
- **Node.js Versiyonu**: v20.19.5
- **Database**: PostgreSQL
- **Web Server**: Nginx
- **Process Manager**: PM2
- **PostgreSQL Admin Şifresi**: admin999
- **SSH Şifresi**: BH56cci1

---

## 1. Sunucuya Bağlanma

```bash
ssh root@87.106.47.223
# Şifre: BH56cci1
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
nano /etc/nginx/sites-available/15935test.gruner-super.store
```

Aşağıdaki içeriği ekle:

```nginx
server {
    listen 80;
    server_name 15935test.gruner-super.store;

    # Frontend için
    location / {
        root /var/www/15935test.gruner-super.store/frontend/dist;
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
        alias /var/www/15935test.gruner-super.store/backend/uploads;
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
ln -s /etc/nginx/sites-available/15935test.gruner-super.store /etc/nginx/sites-enabled/

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
mkdir -p /var/www/15935test.gruner-super.store
cd /var/www/15935test.gruner-super.store

# Git'ten projeyi klonla
git clone https://github.com/yusuffkarac/GrunerSuperStore.git .

# Proje klasörlerine izin ver
chown -R $USER:$USER /var/www/15935test.gruner-super.store
```

---

## 9. Backend Kurulumu

```bash
cd /var/www/15935test.gruner-super.store/backend

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
DB_PASSWORD=admin999

# DATABASE_URL (Prisma için)
DATABASE_URL=postgresql://postgres:admin999@localhost:5432/gruner_superstore?schema=public

# JWT
JWT_SECRET=ÇokGüçlüVeGizliBirJWTSecretKeyBurayaDeğiştirin

# CORS
CORS_ORIGIN=https://15935test.gruner-super.store,http://15935test.gruner-super.store

# Upload
UPLOAD_PATH=uploads

# Email (SMTP ayarlarınızı buraya ekleyin)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@15935test.gruner-super.store

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

## 10. Database Migration (ÖNEMLİ - SCHEMA KULLANARAK)

Migration'lar eksik olduğu için, **en sağlam yöntem Prisma Schema'yı kullanarak database'i oluşturmak**tır.

### Yöntem 1: Prisma DB Push (Önerilen - Schema'dan Direkt Oluşturma)

Bu yöntem Prisma schema'yı direkt database'e uygular. Migration geçmişi tutmaz ama production'da sıfırdan kurulum için en güvenli yöntemdir.

```bash
cd /var/www/15935test.gruner-super.store/backend

# Prisma Client'ı generate et
npx prisma generate

# Schema'yı database'e push et (tüm tabloları oluşturur)
npx prisma db push

# Başarılı olduğunu kontrol et
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

**Avantajları:**
- Schema'yı direkt database'e uygular
- Tüm tablolar, indexler, constraint'ler otomatik oluşturulur
- Hızlı ve güvenilir
- Production'da sıfırdan kurulum için idealdir

**Not**: `db push` migration geçmişini tutmaz, sadece schema'yı database'e uygular. Bu yeni bir kurulum olduğu için sorun değil.

### Yöntem 2: Initial Migration Oluşturup Deploy Et (Alternatif)

Eğer migration geçmişi tutmak istiyorsanız:

```bash
cd /var/www/15935test.gruner-super.store/backend

# Prisma Client'ı generate et
npx prisma generate

# Initial migration oluştur (sadece oluştur, çalıştırma)
npx prisma migrate dev --create-only --name initial_schema

# Oluşan migration dosyasını kontrol et
ls -la prisma/migrations/

# Migration'ı production modunda deploy et
npx prisma migrate deploy
```

Bu yöntem migration geçmişini tutar ve gelecekteki güncellemeler için daha uygun olabilir.

### Yöntem 3: Manuel SQL Kontrolü (Opsiyonel)

Database'in doğru oluşturulduğunu kontrol etmek için:

```bash
# PostgreSQL'e bağlan
sudo -u postgres psql -d gruner_superstore

# Tabloları listele
\dt

# Bir tablonun yapısını kontrol et (örnek: users)
\d users

# Çıkış
\q
```

---

## 11. İlk Admin Kullanıcısı Oluşturma

```bash
cd /var/www/15935test.gruner-super.store/backend

# Admin kullanıcısı oluştur
npm run create-admin
```

Komut sizden email ve şifre isteyecektir.

---

## 12. Frontend Kurulumu ve Build

```bash
cd /var/www/15935test.gruner-super.store/frontend

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
cd /var/www/15935test.gruner-super.store/backend

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
cd /var/www/15935test.gruner-super.store

# PM2 ecosystem config dosyası zaten projede var ve .env dosyasından otomatik okuma yapıyor
# Sadece backend/.env dosyasını oluşturduğunuzdan emin olun

# Ecosystem config'i kontrol et (isteğe bağlı)
cat ecosystem.config.cjs
```

**Not**: `ecosystem.config.cjs` dosyası zaten projede mevcut ve `backend/.env` dosyasından otomatik olarak environment variable'ları okuyor. Bu yüzden ayrıca bir config dosyası oluşturmanıza gerek yok.

Eğer manuel olarak environment variable'ları eklemek isterseniz, `ecosystem.config.cjs` dosyasını düzenleyebilirsiniz, ancak genellikle `.env` dosyası yeterlidir.

```bash
# Log klasörü oluştur
mkdir -p /var/www/15935test.gruner-super.store/logs

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
certbot --nginx -d 15935test.gruner-super.store

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
/var/www/15935test.gruner-super.store/logs/*.log {
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
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/15935test.gruner-super.store/backend/uploads

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
cd /var/www/15935test.gruner-super.store/backend
npx prisma db execute --stdin <<< "SELECT 1;"

# Database tablolarını kontrol et
sudo -u postgres psql -d gruner_superstore -c "\dt"
```

---

## 21. Troubleshooting

### Backend başlamıyorsa:

```bash
# Logları kontrol et
pm2 logs gruner-backend --lines 100

# Manuel olarak test et
cd /var/www/15935test.gruner-super.store/backend
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

# Prisma schema'yı tekrar push et (eğer tablolar eksikse)
cd /var/www/15935test.gruner-super.store/backend
npx prisma db push
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
cd /var/www/15935test.gruner-super.store/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Prisma Schema Hatası:

```bash
# Prisma Client'ı yeniden generate et
cd /var/www/15935test.gruner-super.store/backend
npx prisma generate

# Schema'yı tekrar push et
npx prisma db push --force-reset  # DİKKAT: Bu tüm veriyi siler!
# VEYA
npx prisma db push  # Sadece eksik tabloları ekler
```

---

## 22. Güncelleme İşlemi

Projeyi güncellemek için:

```bash
cd /var/www/15935test.gruner-super.store

# Değişiklikleri çek
git pull origin main

# Backend dependencies güncelle
cd backend
npm install

# Prisma schema değişikliklerini uygula
npx prisma generate
npx prisma db push  # VEYA npx prisma migrate deploy (eğer migration varsa)

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

- [ ] Güçlü database şifresi kullanıldı (admin999 - production'da değiştirin!)
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

1. **Database Migration**: Migration'lar eksik olduğu için `prisma db push` kullanarak schema'yı direkt database'e uyguladık. Bu yeni bir kurulum olduğu için sorun değil. Gelecekte schema değişiklikleri için `prisma migrate dev` kullanarak migration oluşturabilirsiniz.

2. **Multi-Tenant**: Bu kurulum tek tenant için yapılmıştır. Multi-tenant yapı kullanılmayacak.

3. **Environment Variables**: Tüm hassas bilgileri `.env` dosyasında saklayın ve bu dosyayı git'e commit etmeyin.

4. **Upload Klasörleri**: Upload klasörlerinin izinlerini düzenli kontrol edin.

5. **Yedekleme**: Düzenli yedekleme yapın ve yedekleri farklı bir yerde saklayın.

6. **Prisma Schema**: Database yapısı Prisma schema'dan (`backend/prisma/schema.prisma`) oluşturulmuştur. Schema değişikliklerinde `npx prisma db push` veya migration oluşturarak güncelleyin.

---

## 25. İletişim ve Destek

Sorun yaşarsanız:
1. PM2 loglarını kontrol edin: `pm2 logs gruner-backend`
2. Nginx loglarını kontrol edin: `tail -f /var/log/nginx/error.log`
3. Database loglarını kontrol edin: `/var/log/postgresql/`
4. Prisma schema'yı kontrol edin: `backend/prisma/schema.prisma`

---

**Kurulum tamamlandı!** 🎉

Artık `https://15935test.gruner-super.store` adresinden uygulamanıza erişebilirsiniz.

