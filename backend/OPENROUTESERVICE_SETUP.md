# OpenRouteService API Key Kurulumu

## Bu Uyarı Ne Anlama Geliyor?

Bu bir **hata değil, sadece bir uyarı**. OpenRouteService API key'i eksik olduğu için yol mesafesi hesaplama özelliği çalışmıyor. Bu özellik **opsiyonel**dir ve uygulamanın temel işlevselliğini etkilemez.

## Ne Zaman Gerekli?

- ✅ **Gerekli DEĞİL:** Eğer yol mesafesi hesaplama özelliğini kullanmıyorsanız, bu uyarıyı görmezden gelebilirsiniz.
- ⚠️ **Gerekli:** Eğer adresler arası yol mesafesi hesaplama özelliğini kullanmak istiyorsanız, API key eklemeniz gerekir.

## API Key Nasıl Alınır?

1. **OpenRouteService'e kaydolun:**
   - https://openrouteservice.org/dev/#/signup adresine gidin
   - Ücretsiz hesap oluşturun
   - API key'inizi alın

2. **Sunucuda .env dosyasına ekleyin:**

```bash
# Sunucuda .env dosyasını düzenle
cd /var/www/gruner-superstore/backend
nano .env

# Şu satırı ekleyin:
OPENROUTESERVICE_API_KEY=your_api_key_here
```

3. **PM2'yi yeniden başlatın:**

```bash
pm2 restart gruner-backend
```

## Uyarıyı Kapatmak İsterseniz

Eğer bu özelliği hiç kullanmayacaksanız ve uyarıları görmek istemiyorsanız, routing service'i devre dışı bırakabilirsiniz. Ancak şu an için bu gerekli değil - uyarılar zararsızdır.

## Kontrol

API key'i ekledikten sonra logları kontrol edin:

```bash
pm2 logs gruner-backend --lines 20 | grep RoutingService
```

Artık uyarı yerine başarılı mesajlar görmelisiniz.

