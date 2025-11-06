# API Test Komutları

Backend API'yi test etmek için curl komutları.

## Başlamadan Önce

1. Backend'i başlat:
```bash
cd backend
npm run dev
```

2. Database migration'ı çalıştır:
```bash
npm run migrate
```

3. Test için değişkenler:
```bash
# Base URL
BASE_URL="http://localhost:5001"

# Test sonrası token'ı buraya kaydet
TOKEN=""
```

---

## 🔐 AUTHENTICATION

### 1. Kullanıcı Kaydı (Register)
```bash
curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Max",
    "lastName": "Mustermann",
    "email": "max@example.de",
    "password": "Test1234",
    "phone": "+491234567890"
  }'
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "message": "Registrierung erfolgreich",
  "data": {
    "user": {
      "id": "...",
      "firstName": "Max",
      "lastName": "Mustermann",
      "email": "max@example.de",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Token'ı kaydet:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Kullanıcı Girişi (Login)
```bash
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "max.mueller@example.de",
    "password": "Test123!"
  }'
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "message": "Anmeldung erfolgreich",
  "data": {
    "user": { ... },
    "token": "..."
  }
}
```

---

### 3. Kullanıcı Bilgilerini Getir (Get Me)
```bash
curl -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "firstName": "Max",
      "lastName": "Müller",
      ...
    }
  }
}
```

---

### 4. Şifre Sıfırlama Talebi (Forgot Password)
```bash
curl -X POST $BASE_URL/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "max.mueller@example.de"
  }'
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "message": "Wenn die E-Mail registriert ist, wird eine Rücksetz-E-Mail gesendet"
}
```

---

### 5. Şifre Sıfırlama (Reset Password)
```bash
curl -X POST $BASE_URL/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "RESET_TOKEN_FROM_EMAIL",
    "password": "NewPass1234"
  }'
```

---

## 📦 PRODUCTS

### 1. Tüm Ürünleri Listele
```bash
# Temel listeleme
curl -X GET $BASE_URL/api/products

# Sayfalama ile
curl -X GET "$BASE_URL/api/products?page=1&limit=10"

# Kategoriye göre filtreleme
curl -X GET "$BASE_URL/api/products?categoryId=CATEGORY_ID"

# Arama
curl -X GET "$BASE_URL/api/products?search=Milch"

# Öne çıkanlar
curl -X GET "$BASE_URL/api/products?isFeatured=true"

# Sıralama
curl -X GET "$BASE_URL/api/products?sortBy=price&sortOrder=asc"
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "...",
        "name": "Bio Vollmilch",
        "price": "1.29",
        "stock": 50,
        "category": {
          "name": "Milchprodukte"
        },
        ...
      }
    ],
    "pagination": {
      "total": 22,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    }
  }
}
```

---

### 2. Tek Ürün Getir (ID ile)
```bash
curl -X GET $BASE_URL/api/products/PRODUCT_ID
```

---

### 3. Tek Ürün Getir (Slug ile)
```bash
curl -X GET $BASE_URL/api/products/slug/bio-vollmilch
```

---

### 4. Öne Çıkan Ürünler
```bash
curl -X GET "$BASE_URL/api/products/featured?limit=5"
```

---

## 🏷️ CATEGORIES

### 1. Tüm Kategorileri Listele
```bash
curl -X GET $BASE_URL/api/categories
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "...",
        "name": "Obst & Gemüse",
        "slug": "obst-gemuese",
        "imageUrl": "...",
        "_count": {
          "products": 8
        }
      }
    ]
  }
}
```

---

## 🛒 CART (Authentication Required)

⚠️ **Not:** Tüm cart endpoint'leri için Bearer token gereklidir!

### 1. Sepeti Getir
```bash
curl -X GET $BASE_URL/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "...",
        "quantity": 2,
        "product": {
          "name": "Bio Äpfel",
          "price": "3.99",
          ...
        },
        "itemTotal": "7.98"
      }
    ],
    "subtotal": "7.98",
    "itemCount": 1
  }
}
```

---

### 2. Sepete Ürün Ekle
```bash
curl -X POST $BASE_URL/api/cart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 2
  }'
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "message": "Produkt zum Warenkorb hinzugefügt",
  "data": {
    "cartItem": {
      "id": "...",
      "quantity": 2,
      "product": { ... }
    }
  }
}
```

---

### 3. Sepet Öğesi Miktarını Güncelle
```bash
curl -X PUT $BASE_URL/api/cart/CART_ITEM_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 5
  }'
```

---

### 4. Sepetten Ürün Sil
```bash
curl -X DELETE $BASE_URL/api/cart/CART_ITEM_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "message": "Artikel aus dem Warenkorb entfernt"
}
```

---

### 5. Sepeti Temizle
```bash
curl -X DELETE $BASE_URL/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

---

## ❌ HATA DURUMU TESTLERİ

### 1. Geçersiz Email ile Kayıt
```bash
curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "invalid-email",
    "password": "Test1234"
  }'
```

**Beklenen Sonuç (400):**
```json
{
  "success": false,
  "message": "Validierungsfehler",
  "errors": [
    {
      "field": "email",
      "message": "Ungültige E-Mail-Adresse"
    }
  ]
}
```

---

### 2. Zayıf Şifre ile Kayıt
```bash
curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.de",
    "password": "123"
  }'
```

---

### 3. Yanlış Şifre ile Giriş
```bash
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "max.mueller@example.de",
    "password": "WrongPassword"
  }'
```

**Beklenen Sonuç (401):**
```json
{
  "success": false,
  "message": "Ungültige Anmeldedaten"
}
```

---

### 4. Token Olmadan Protected Endpoint
```bash
curl -X GET $BASE_URL/api/cart
```

**Beklenen Sonuç (401):**
```json
{
  "success": false,
  "message": "Kein Token bereitgestellt"
}
```

---

### 5. Geçersiz Token
```bash
curl -X GET $BASE_URL/api/cart \
  -H "Authorization: Bearer invalid_token_here"
```

**Beklenen Sonuç (401):**
```json
{
  "success": false,
  "message": "Ungültiger Token"
}
```

---

### 6. Var Olmayan Ürün
```bash
curl -X GET $BASE_URL/api/products/00000000-0000-0000-0000-000000000000
```

**Beklenen Sonuç (404):**
```json
{
  "success": false,
  "message": "Produkt nicht gefunden"
}
```

---

### 7. Stok Yetersiz
```bash
# Önce bir ürünün ID'sini al, sonra stoktan fazla miktar ekle
curl -X POST $BASE_URL/api/cart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 99999
  }'
```

**Beklenen Sonuç (400):**
```json
{
  "success": false,
  "message": "Nicht genügend Lagerbestand"
}
```

---

## 🧪 KOMPLE TEST AKIŞI

### Senaryo: Yeni kullanıcı kaydı → Ürün arama → Sepete ekleme → Sipariş

```bash
# 1. Yeni kullanıcı kaydı
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Anna",
    "lastName": "Schmidt",
    "email": "anna.test@example.de",
    "password": "Test1234",
    "phone": "+491234567890"
  }')

echo $RESPONSE | jq '.'

# Token'ı çıkar
TOKEN=$(echo $RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"

# 2. Kategorileri listele
curl -s -X GET $BASE_URL/api/categories | jq '.'

# 3. Ürünleri listele
PRODUCTS=$(curl -s -X GET "$BASE_URL/api/products?limit=5")
echo $PRODUCTS | jq '.'

# İlk ürünün ID'sini al
PRODUCT_ID=$(echo $PRODUCTS | jq -r '.data.products[0].id')
echo "Product ID: $PRODUCT_ID"

# 4. Sepete ekle
curl -s -X POST $BASE_URL/api/cart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 2
  }" | jq '.'

# 5. Sepeti kontrol et
curl -s -X GET $BASE_URL/api/cart \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo "✅ Test tamamlandı!"
```

---

## 📊 RATE LIMITING TEST

```bash
# 100'den fazla istek gönder (rate limit 15 dakikada 100)
for i in {1..105}; do
  echo "Request $i"
  curl -X GET $BASE_URL/api/products
done
```

**Beklenen:** 101. istekte 429 (Too Many Requests) hatası alınmalı.

---

## ✅ BAŞARILI RESPONSE FORMATI

Tüm başarılı response'lar şu yapıda:

```json
{
  "success": true,
  "message": "...",  // optional
  "data": { ... }
}
```

---

## ❌ HATA RESPONSE FORMATI

Tüm hata response'ları şu yapıda:

```json
{
  "success": false,
  "message": "...",
  "errors": [ ... ]  // optional (validation errors)
}
```

---

## 🔍 DEBUG MODE

Development'ta detaylı error stack görmek için:

```bash
export NODE_ENV=development
```

Production'da sadece user-friendly mesajlar gösterilir:

```bash
export NODE_ENV=production
```

---

## 🛠️ POSTMAN COLLECTION

Bu komutları Postman'e aktarmak için:

1. Postman'i aç
2. Import → Raw Text
3. Curl komutlarını yapıştır

Veya Postman Collection dosyası oluştur:
- Environment variable olarak `BASE_URL` ve `TOKEN` ekle
- Her endpoint için ayrı request oluştur
- Authorization → Bearer Token kullan

---

## 📝 NOT

- Tüm endpoint'ler JSON formatında veri kabul eder
- Authentication gereken endpoint'ler için `Authorization: Bearer <token>` header'ı zorunludur
- Rate limiting default: 100 request / 15 dakika
- Response her zaman `success` field'ı içerir

---

✅ **Backend API FAZ 1 hazır!**
