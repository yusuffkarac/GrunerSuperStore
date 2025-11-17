## Amaç
- MHD (son kullanma tarihi) yönetimi ekranının günlük kullanımını anlatır.
- Kullanıcının yetkilerine göre görebileceği alanları ve tipik iş akışlarını açıklar.

## Roller ve Yetkiler
- Super admin veya `expiry_management_settings` izni olan kullanıcılar tüm ayarlara erişebilir.
- Diğer adminler sadece görev listesini ve hızlı aksiyon butonlarını görür.

## Dashboard Genel Görünümü
- Üst bölümde günlük tarih etiketi, kapanış saati ve “Aktualisieren” butonu yer alır.
- Dört adet özet kartı kategoriler, ürün sayısı, bugün son tarihli ürünler ve etiketlenmesi gereken ürünleri gösterir.
- “Erledigt” yüzdesi toplam görevlerin ne kadarının tamamlandığını belirtir; altındaki bar görsel ilerlemeyi izlemeyi kolaylaştırır.

## Önizleme Tarihi
- “Vorschau-Datum” paneli gelecekteki bir gün için görevleri incelemenizi sağlar.
- Sol/Sağ oklarla günü kaydırabilir veya tarih alanına manuel giriş yapabilirsiniz.
- “Vorschau anzeigen” seçilen gün için tabloyu günceller; “Heute anzeigen” bugünkü görünümü geri getirir.
- Önizleme aktifken ekranın üst kısmında bilgi mesajı görünür.

## Kategori ve Ürün Kartları
- Her kategori başlığı toplam ürün sayısını, açık/giderilmiş görevleri ve kritik/uyarı rozetlerini gösterir.
- Ürün satırında:
  - Ürün adı, varsa barkod, mevcut MHD ve kaç gün kaldığı listelenir.
  - “Erledigt”, “Reduziert”, “Aussortiert” gibi rozetler son aksiyonu özetler.
  - “Deaktiviert” rozeti ürünün kontrol dışı bırakıldığını belirtir.

## Hızlı Aksiyonlar
- Görev tipi “reduzieren” ise:
  - “Reduzieren” butonu etiketi kaydeder.
  - “Deaktivieren” ürünü kontrol dışına çıkarır.
  - “Neues Datum” yeni MHD girmenize imkân tanır.
- Görev tipi “aussortieren” ise:
  - “Aussortieren” ürünü raftan kaldırma senaryosunu başlatır.
  - Diğer iki buton yine deaktivasyon ve tarih güncelleme için kullanılabilir.
- Her buton tıklandığında durum kısa süreli olarak “disabled” olur ve işlem tamamlanınca liste otomatik yenilenir.

## Aksiyon Diyaloğu
- “Neues Datum” veya “Aussortieren” seçimlerinde detay formu açılır.
- Yeni MHD tarihi zorunludur; not alanı opsiyoneldir ancak geri alma sürecinde referans olması için önerilir.
- “Speichern” ile işlem tamamlanır, “Abbrechen” modalı kapatır.

## Ayarlar Diyaloğu
- Sadece yetkili kullanıcılar görür.
- “Verwaltung aktiv” kutusu sistemi açıp kapar.
- “Warnstufe” ve “Kritische Stufe” alanları kaç gün kala görevlerin görüneceğini belirler (kritik ≤ uyarı olacak şekilde otomatik dengelenir).
- “Tägliche Deadline” gün içindeki kapanış saatini belirler; dashboard başlığı bu değeri baz alarak bilgilendirme yapar.

## Günlük Kullanım Senaryosu
1. **Sayfayı aç**: Yüklenme ekranı biter bitmez günün görevleri listelenir.
2. **Özet kartlarına bak**: Kaç ürün üzerinde çalışılması gerektiğini ve ilerleme oranını hızlıca gör.
3. **Kategori bazlı ilerle**: Kritik kategorilerden başlayarak ürün kartlarını incele.
4. **Uygun aksiyonu seç**:
   - Etiketle (Reduzieren) → ürün listede soluklaşır.
   - Aussortieren → yeni tarih gir veya tamamen kaldır.
   - Deaktivieren → stok dışı bırak (gerekirse tekrar etikete basarak geri al).
5. **Önizleme yap**: Planlama ihtiyacı varsa gelecekteki bir tarihe geçip görevlere göz at.
6. **Ayarları güncelle** (yetkin varsa): Yeni eşikler veya kapanış saati belirleyip kaydet.

## Bildirim ve Arka Plan Süreçleri
- Her gün sabah görev sayıları hesaplanır ve adminlere mail gönderilebilir; mail aynı gün içinde bir kez gönderilir.
- Kritik ve uyarı listeleri tamamen boşaldığında tamamlanma maili tetiklenebilir.
- Undo aksiyonu ile yanlış yapılan işlemler geri alınabilir; tarih güncelleme notlarında eski tarih saklandığından geri yükleme yapılır.

## En İyi Uygulamalar
- Aksiyon notlarına, durumun nedenini kısaca yazın (ör. “MHD uzatıldı, yeni etiket basıldı”).
- Deaktivasyon sonrası ürünü yeniden kontrol listesine almak için mutlaka etiketi yeniden kaydedin veya yeni MHD girin.
- Önizleme modundan çıkmayı unutmayın; aksi takdirde ekran gelecekteki günü göstermeye devam eder.
- Multi-tenant kurulumlarda doğru .env dosyası yüklendiğinden emin olun ve migration’ları her iki veritabanına da uygulayın.

## Operasyonel Notlar
- Şema değişikliği gerektiğinde `prisma migrate dev --name ...` komutu kullanılır; `db push` yasaktır.
- Migration dosyaları repoya eklenmeli ve üretim ortamında `prisma migrate deploy` ile uygulanmalıdır.
- Büyük ürün aksiyonları öncesinde (ör. toplu deaktivasyon) veri yedeği almak önerilir.


