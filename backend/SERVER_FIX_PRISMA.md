# Prisma Client Hatası Düzeltme Rehberi

## Sorun
Sunucuda `@prisma/client` paketi bulunamıyor hatası alınıyor.

## Çözüm Adımları

### 1. Sunucuya SSH ile bağlanın
```bash
ssh root@your-server-ip
```

### 2. Proje dizinine gidin
```bash
cd /var/www/gruner-superstore/backend
```

### 3. PM2 process'lerini durdurun
```bash
pm2 stop all
# veya belirli bir process için:
# pm2 stop gruner-backend
```

### 4. Bağımlılıkları yükleyin
```bash
npm install
```

Bu komut otomatik olarak `postinstall` script'ini çalıştıracak ve Prisma client'ı generate edecek.

### 5. Eğer Prisma client hala generate edilmediyse manuel olarak çalıştırın
```bash
npx prisma generate
```

### 6. PM2 process'lerini yeniden başlatın
```bash
pm2 restart all
# veya ecosystem config kullanıyorsanız:
pm2 restart ecosystem.config.cjs
```

### 7. Logları kontrol edin
```bash
pm2 logs backend --lines 50
# veya
tail -f /root/.pm2/logs/backend-error.log
```

## Kontrol Komutları

### Prisma client'ın doğru generate edildiğini kontrol edin:
```bash
ls -la node_modules/.prisma/client/
```

### PM2 durumunu kontrol edin:
```bash
pm2 status
pm2 list
```

## Notlar
- `@prisma/client` artık `dependencies` içinde, bu yüzden production'da yüklenecek
- `postinstall` script'i sayesinde her `npm install` sonrası Prisma client otomatik generate edilecek
- Eğer hala sorun yaşıyorsanız, `node_modules` klasörünü silip yeniden yükleyin:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

