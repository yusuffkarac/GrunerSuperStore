/**
 * Uygulama Konfigürasyonu
 * 
 * BARCODE_ONLY_MODE: true yapıldığında sadece barkod etiketleri sayfası görünür ve erişilebilir olur.
 * false yapıldığında tüm admin sayfaları normal şekilde çalışır.
 * 
 * DEFAULT_HOME_ROUTE: Ana sayfa route'unu belirler.
 * - "/" veya boş: Normal ana sayfa (AnaSayfa component'i)
 * - "/admin/dashboard": Admin dashboard'a yönlendirir
 * Environment variable: VITE_DEFAULT_HOME_ROUTE
 */

export const BARCODE_ONLY_MODE = false; // true yaparak sadece barkod etiketleri sayfasını göster

// Ana sayfa route'u - env'den al, yoksa varsayılan olarak "/" (normal ana sayfa)
export const DEFAULT_HOME_ROUTE = import.meta.env.VITE_DEFAULT_HOME_ROUTE || '/';

