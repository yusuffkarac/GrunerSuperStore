# Sunucuda 413 Hatası Düzeltme Adımları

## 1. Backend Kodunu Güncelle

### Git kullanıyorsanız:
```bash
cd /path/to/backend
git pull origin main
# veya
git pull origin master
```

### Git kullanmıyorsanız:
Aşağıdaki dosyaları manuel olarak güncelleyin:

#### `backend/src/server.js` dosyasında:
```javascript
// 112. satırı bulun ve değiştirin:
app.use(express.json({ limit: '100mb' })); // PDF'ler için artırıldı
app.use(express.urlencoded({ extended: true, limit: '100mb' })); // PDF'ler için artırıldı
```

#### `backend/src/middleware/upload.js` dosyasında:
```javascript
// 69-75. satırları bulun ve değiştirin:
// Multer yapılandırması - max 100MB (PDF'ler için artırıldı)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});
```

## 2. Backend'i Yeniden Başlat

### PM2 kullanıyorsanız:
```bash
cd /path/to/backend
pm2 restart all
# veya belirli bir process için:
pm2 restart gruner-backend
pm2 restart ecosystem.config.cjs
```

### PM2 kullanmıyorsanız:
```bash
# Process'i durdur
pkill -f "node.*server.js"
# veya
systemctl stop gruner-backend

# Tekrar başlat
cd /path/to/backend
npm start
# veya
node src/server.js
```

## 3. Nginx Yapılandırmasını Güncelle

### Nginx config dosyasını bulun:
```bash
# Genellikle şu konumlarda olur:
/etc/nginx/sites-available/gruner
/etc/nginx/sites-available/default
/etc/nginx/nginx.conf
```

### Config dosyasını düzenleyin:
```bash
sudo nano /etc/nginx/sites-available/gruner
# veya
sudo nano /etc/nginx/sites-available/default
```

### Her `server` bloğunun başına ekleyin:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    
    # Dosya yükleme limiti - PDF'ler için 100MB
    client_max_body_size 100M;
    
    # ... diğer ayarlar
```

### `/api` location bloğuna ekleyin:
```nginx
location /api {
    proxy_pass http://localhost:5001;  # Backend portunuz
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Dosya yükleme limiti - PDF'ler için 100MB
    client_max_body_size 100M;
    
    # Timeout ayarları - büyük dosyalar için artırıldı
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}
```

## 4. Nginx'i Test Et ve Yeniden Yükle

```bash
# Nginx config'i test et
sudo nginx -t

# Hata yoksa reload et
sudo systemctl reload nginx
# veya
sudo service nginx reload
# veya
sudo nginx -s reload
```

## 5. Kontrol Et

### Backend loglarını kontrol edin:
```bash
# PM2 kullanıyorsanız:
pm2 logs

# Veya log dosyasına bakın:
tail -f /var/log/gruner/backend.log
```

### Nginx loglarını kontrol edin:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Örnek Tam Nginx Config

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 15935test.gruner-super.store;
    
    # Dosya yükleme limiti - PDF'ler için 100MB
    client_max_body_size 100M;
    
    root /var/www/gruner/frontend/dist;
    index index.html;
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
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
        
        # Dosya yükleme limiti - PDF'ler için 100MB
        client_max_body_size 100M;
        
        # Timeout ayarları - büyük dosyalar için artırıldı
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Uploads klasörü
    location /uploads {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        client_max_body_size 100M;
    }
}
```

## Sorun Giderme

### Hala 413 hatası alıyorsanız:

1. **Nginx config'i doğru yüklenmiş mi kontrol edin:**
   ```bash
   sudo nginx -T | grep client_max_body_size
   ```

2. **Backend'in doğru çalıştığını kontrol edin:**
   ```bash
   curl http://localhost:5001/health
   ```

3. **Dosya boyutunu kontrol edin:**
   ```bash
   ls -lh /path/to/your/file.pdf
   ```

4. **Tüm değişikliklerin uygulandığından emin olun:**
   - Backend express.json limit: 100mb
   - Backend express.urlencoded limit: 100mb
   - Multer fileSize limit: 100MB
   - Nginx client_max_body_size: 100M

## Notlar

- Nginx config değişikliklerinden sonra mutlaka `sudo nginx -t` ile test edin
- Backend'i yeniden başlatmadan değişiklikler etkili olmaz
- Nginx reload yeterli, restart gerekmez
- Büyük dosyalar için timeout'ları da artırdık (300s)

