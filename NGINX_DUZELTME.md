# Nginx Config Düzeltme - 15935test.gruner-super.store

## Adımlar

### 1. Config dosyasını düzenle:
```bash
sudo nano /etc/nginx/sites-available/15935test.gruner-super.store
```

### 2. Server bloğunun başına ekle (listen satırlarından hemen sonra):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 15935test.gruner-super.store;
    
    # Dosya yükleme limiti - PDF'ler için 100MB
    client_max_body_size 100M;
    
    # ... mevcut ayarlar
```

### 3. `/api` location bloğunu bul ve şu satırları ekle:
```nginx
location /api {
    # ... mevcut proxy ayarları ...
    
    # Dosya yükleme limiti - PDF'ler için 100MB
    client_max_body_size 100M;
    
    # Timeout ayarları - büyük dosyalar için artırıldı
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}
```

### 4. Test et ve reload et:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Örnek Tam Değişiklik

Eğer mevcut config şöyleyse:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 15935test.gruner-super.store;
    
    root /var/www/...;
    
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        # ... diğer ayarlar
    }
}
```

Şöyle olmalı:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 15935test.gruner-super.store;
    
    # Dosya yükleme limiti - PDF'ler için 100MB
    client_max_body_size 100M;
    
    root /var/www/...;
    
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
}
```

