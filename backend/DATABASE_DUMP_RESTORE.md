# Veritabanı Dump ve Restore Kılavuzu

Bu kılavuz, yerel veritabanınızın içeriğini GitHub üzerinden sunucuya aktarmanız için hazırlanmıştır.

## 📋 Gereksinimler

- PostgreSQL client tools yüklü olmalı (`pg_dump` ve `psql` komutları)
  - macOS: `brew install postgresql`
  - Ubuntu/Debian: `sudo apt-get install postgresql-client`
  - Windows: [PostgreSQL indir](https://www.postgresql.org/download/windows/)

## 🔄 İşlem Adımları

### 1️⃣ Yerelde Dump Alma

Yerel veritabanınızın tam içeriğini SQL dosyasına aktarın:

```bash
cd backend
npm run db:dump
```

Bu komut:
- `.env` dosyanızdaki veritabanı bilgilerini kullanır
- `database-dumps/` klasörüne timestamp'li bir SQL dosyası oluşturur
- Dosya adı formatı: `dump_gruner_superstore_YYYY-MM-DD_HH-MM-SS.sql`

**Örnek çıktı:**
```
📦 Veritabanı dump işlemi başlatılıyor...
   Database: gruner_superstore
   Host: localhost:5432
   User: postgres
⏳ Dump alınıyor...
✅ Dump başarıyla oluşturuldu!
   Dosya: database-dumps/dump_gruner_superstore_2025-01-17_14-30-45.sql
   Boyut: 2.45 MB
```

### 2️⃣ GitHub'a Commit ve Push

Dump dosyasını GitHub'a commit edin:

```bash
# Dump dosyasını ekle
git add database-dumps/dump_*.sql

# Commit et
git commit -m "feat: veritabanı dump eklendi"

# Push et
git push
```

**⚠️ Dikkat:** 
- Büyük dump dosyaları (>100MB) GitHub'a yüklenemez
- Eğer dosya çok büyükse, sadece gerekli tabloları export edebilir veya dosyayı bölebilirsiniz
- Hassas veriler varsa (şifreler, kişisel bilgiler), dump dosyasını şifreleyin veya private repo kullanın

### 3️⃣ Sunucuda Restore Etme

Sunucuda aşağıdaki adımları takip edin:

```bash
# 1. Projeyi güncelle (dump dosyasını çek)
git pull

# 2. Veritabanını restore et
cd backend
npm run db:restore
```

Script otomatik olarak en son dump dosyasını bulur ve restore eder.

**Belirli bir dump dosyasını restore etmek için:**
```bash
npm run db:restore dump_gruner_superstore_2025-01-17_14-30-45.sql
```

**⚠️ UYARI:** 
- Restore işlemi mevcut veritabanındaki **TÜM verileri silecek**!
- İşlem öncesi onay istenir
- Production ortamında dikkatli olun!

## 🔧 Manuel Kullanım

### Dump Scripti (Manuel)

```bash
node backend/scripts/dumpDatabase.js
```

### Restore Scripti (Manuel)

```bash
# En son dump dosyasını kullan
node backend/scripts/restoreDatabase.js

# Belirli bir dosyayı kullan
node backend/scripts/restoreDatabase.js dump_gruner_superstore_2025-01-17_14-30-45.sql
```

## 📁 Dosya Yapısı

```
backend/
├── scripts/
│   ├── dumpDatabase.js      # Dump scripti
│   └── restoreDatabase.js   # Restore scripti
└── database-dumps/          # Dump dosyaları burada saklanır
    └── dump_*.sql
```

## 🛠️ Sorun Giderme

### "pg_dump: command not found" hatası

PostgreSQL client tools yüklü değil. Yukarıdaki gereksinimler bölümüne bakın.

### "does not exist" hatası (restore sırasında)

Veritabanı mevcut değil. Önce oluşturun:

```bash
createdb -h localhost -p 5432 -U postgres gruner_superstore
```

### Büyük dosya sorunu

Eğer dump dosyası çok büyükse (>100MB):

1. **Sadece verileri export edin** (schema olmadan):
   ```bash
   pg_dump -h localhost -U postgres -d gruner_superstore --data-only --inserts > dump_data_only.sql
   ```

2. **Sadece belirli tabloları export edin**:
   ```bash
   pg_dump -h localhost -U postgres -d gruner_superstore -t products -t categories --inserts > dump_products.sql
   ```

3. **Dosyayı sıkıştırın**:
   ```bash
   gzip dump_gruner_superstore_*.sql
   ```
   Sonra restore ederken:
   ```bash
   gunzip -c dump_gruner_superstore_*.sql.gz | psql -h localhost -U postgres -d gruner_superstore
   ```

## 🔒 Güvenlik Notları

- Dump dosyaları hassas veriler içerebilir (kullanıcı şifreleri, kişisel bilgiler)
- Production dump'larını asla public repository'lere commit etmeyin
- Dump dosyalarını şifreleyin veya private repo kullanın
- `.env` dosyasını asla commit etmeyin (zaten .gitignore'da)

## 📝 Notlar

- Dump dosyaları `--inserts` formatında oluşturulur (okunabilir SQL)
- `--column-inserts` kullanılır (kolon isimleriyle birlikte, daha güvenli)
- Owner ve privilege bilgileri dahil edilmez (farklı sunucularda sorun çıkmasın)
- `--clean --if-exists` kullanılır (mevcut tabloları güvenli şekilde siler)

## 🚀 Hızlı Başlangıç

```bash
# Yerelde
npm run db:dump
git add database-dumps/
git commit -m "feat: veritabanı dump"
git push

# Sunucuda
git pull
npm run db:restore
```

