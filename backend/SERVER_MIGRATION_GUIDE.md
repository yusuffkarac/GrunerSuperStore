# Sunucuda Migration Çalıştırma - Hızlı Rehber

## ⚠️ ÖNEMLİ: Sunucuda İlk Kez Çalıştırıyorsanız

Sunucudaki kodun güncel olduğundan emin olun:

```bash
# 1. Sunucuya bağlan
ssh root@your-server

# 2. Proje dizinine git
cd /var/www/gruner-superstore

# 3. Kodu güncelle
git pull origin main  # veya ilgili branch

# 4. Backend dizinine git
cd backend

# 5. Package.json'ın güncel olduğunu kontrol et
cat package.json | grep "db:dump"

# Eğer "db:dump" görünmüyorsa, package.json güncel değil demektir
# Git pull yaparak güncelleyin
```

## 📋 Sunucuda Migration Çalıştırma Adımları

### Adım 1: Backup Al (ZORUNLU!)

```bash
cd /var/www/gruner-superstore/backend

# Script varsa:
npm run db:dump

# Script yoksa (eski versiyon):
node scripts/dumpDatabase.js

# Veya manuel pg_dump:
pg_dump -h localhost -U postgres -d gruner_superstore > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Adım 2: Migration Durumunu Kontrol Et

```bash
npm run migrate:status

# Eğer script yoksa:
node src/config/runMigrations.js status
```

### Adım 3: Dry-Run (Ne Yapılacağını Gör)

```bash
npm run migrate:dry-run

# Eğer script yoksa:
node src/config/runMigrations.js run --dry-run
```

### Adım 4: Migration'ları Çalıştır

```bash
npm run migrate

# Eğer script yoksa:
node src/config/runMigrations.js run
```

## 🔧 Sorun Giderme

### Sorun: "Missing script: db:dump"

**Çözüm 1:** Git pull yaparak package.json'ı güncelle:
```bash
cd /var/www/gruner-superstore
git pull origin main
cd backend
```

**Çözüm 2:** Script'i manuel çalıştır:
```bash
node scripts/dumpDatabase.js
```

**Çözüm 3:** Manuel backup al:
```bash
pg_dump -h localhost -U postgres -d gruner_superstore > backup.sql
```

### Sorun: "Missing script: migrate:status"

**Çözüm:** Script'i doğrudan çalıştır:
```bash
node src/config/runMigrations.js status
```

### Sorun: "Cannot find module"

**Çözüm:** Node modules'ları yükle:
```bash
cd /var/www/gruner-superstore/backend
npm install
```

## 📝 Alternatif Komutlar (Script Yoksa)

Eğer package.json'daki script'ler çalışmıyorsa, doğrudan node ile çalıştırabilirsiniz:

| Script Komutu | Doğrudan Komut |
|---------------|----------------|
| `npm run migrate` | `node src/config/runMigrations.js run` |
| `npm run migrate:status` | `node src/config/runMigrations.js status` |
| `npm run migrate:dry-run` | `node src/config/runMigrations.js run --dry-run` |
| `npm run migrate:validate` | `node src/config/validateMigrations.js` |
| `npm run db:dump` | `node scripts/dumpDatabase.js` |
| `npm run db:restore` | `node scripts/restoreDatabase.js` |

## ✅ Kontrol Listesi

- [ ] Sunucudaki kod güncel mi? (`git pull`)
- [ ] Backup alındı mı? (`npm run db:dump` veya manuel)
- [ ] Migration durumu kontrol edildi mi? (`npm run migrate:status`)
- [ ] Dry-run yapıldı mı? (`npm run migrate:dry-run`)
- [ ] Migration'lar çalıştırıldı mı? (`npm run migrate`)
- [ ] Uygulama çalışıyor mu? (API test et)

