import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiShoppingBag,
  FiPackage,
  FiGrid,
  FiTag,
  FiUsers,
  FiShield,
  FiBell,
  FiPrinter,
  FiSettings,
  FiEdit3,
  FiDroplet,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';

function HelpSection({ icon: Icon, title, children, isOpen, onToggle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <Icon className="text-green-600 text-xl" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        {isOpen ? (
          <FiChevronUp className="text-gray-400 text-xl" />
        ) : (
          <FiChevronDown className="text-gray-400 text-xl" />
        )}
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="px-6 pb-6"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

function StepList({ steps }) {
  return (
    <ol className="space-y-3 ml-4">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
            {index + 1}
          </span>
          <span className="text-gray-700 pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function InfoBox({ type = 'info', children }) {
  const styles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: FiAlertCircle,
      iconColor: 'text-blue-600',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: FiCheckCircle,
      iconColor: 'text-green-600',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: FiAlertCircle,
      iconColor: 'text-amber-600',
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 mt-4`}>
      <div className="flex gap-3">
        <Icon className={`${style.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="text-sm text-gray-700">{children}</div>
      </div>
    </div>
  );
}

function Help() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const sections = [
    {
      key: 'orders',
      icon: FiShoppingBag,
      title: 'Sipariş Yönetimi (Bestellungen)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Siparişleri görüntüleyin, durumlarını güncelleyin ve müşterilerinize bildirim gönderin.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Sipariş Durumunu Güncelleme</h3>
            <StepList
              steps={[
                'Menüden "Bestellungen" seçeneğine tıklayın',
                'Sipariş listesinden güncellemek istediğiniz siparişi bulun',
                'Durum sütunundaki açılır menüden yeni durumu seçin',
                'Değişiklik otomatik olarak kaydedilir ve müşteriye bildirim gönderilir',
              ]}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Sipariş Durumları</h3>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Pending:</strong> Sipariş alındı, onay bekleniyor</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Processing:</strong> Sipariş hazırlanıyor</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Ready:</strong> Sipariş hazır, teslime bekliyor</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Delivered:</strong> Sipariş teslim edildi</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Cancelled:</strong> Sipariş iptal edildi</span>
              </li>
            </ul>
          </div>

          <InfoBox type="info">
            Her durum değişikliğinde müşteriye otomatik bildirim gönderilir. Müşteriler siparişlerinin durumunu takip edebilir.
          </InfoBox>

          <InfoBox type="warning">
            İptal edilen siparişler için ürün stokları otomatik olarak güncellenir.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'products',
      icon: FiPackage,
      title: 'Ürün Yönetimi (Produkte)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Ürünleri ekleyin, düzenleyin, silin ve stok bilgilerini yönetin.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Yeni Ürün Ekleme</h3>
            <StepList
              steps={[
                'Menüden "Produkte" seçeneğine tıklayın',
                'Sağ üstteki "Neues Produkt" butonuna tıklayın',
                'Ürün bilgilerini doldurun (Ad, açıklama, fiyat, stok vb.)',
                'Kategori seçin ve ürün görselini yükleyin',
                'Barkod numarasını girin (opsiyonel)',
                '"Speichern" butonuna tıklayarak ürünü kaydedin',
              ]}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Ürün Düzenleme</h3>
            <StepList
              steps={[
                'Ürün listesinden düzenlemek istediğiniz ürünü bulun',
                'Sağ taraftaki "Bearbeiten" butonuna tıklayın',
                'Gerekli değişiklikleri yapın',
                '"Speichern" butonuna tıklayarak kaydedin',
              ]}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Stok Uyarı Seviyesi</h3>
            <p className="text-gray-700 mb-2">
              Her ürün için düşük stok uyarı seviyesi belirleyebilirsiniz. Stok bu seviyenin altına düştüğünde dashboard'da uyarı görürsünüz.
            </p>
          </div>

          <InfoBox type="info">
            Ürün görselleri maksimum 5MB boyutunda olmalıdır. Desteklenen formatlar: JPG, PNG, WebP
          </InfoBox>

          <InfoBox type="success">
            Barkod özelliğini kullanarak ürünleri kolayca tarayabilir ve sipariş sürecinizi hızlandırabilirsiniz.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'categories',
      icon: FiGrid,
      title: 'Kategori Yönetimi (Kategorien)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Ürün kategorilerini oluşturun ve düzenleyin.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Yeni Kategori Oluşturma</h3>
            <StepList
              steps={[
                'Menüden "Kategorien" seçeneğine tıklayın',
                '"Neue Kategorie" butonuna tıklayın',
                'Kategori adını ve açıklamasını girin',
                'Kategori görseli yükleyin (opsiyonel)',
                'Sıralama numarası belirleyin',
                '"Speichern" ile kaydedin',
              ]}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Kategori Sıralama</h3>
            <p className="text-gray-700">
              Kategorilerin web sitesinde görünme sırasını "Sortierung" alanı ile belirleyebilirsiniz. Küçük sayılar daha üstte görünür.
            </p>
          </div>

          <InfoBox type="warning">
            Bir kategoriyi silmeden önce, o kategoriye ait ürünleri başka bir kategoriye taşıyın veya silin.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'campaigns',
      icon: FiTag,
      title: 'Kampanya Yönetimi (Kampagnen)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            İndirim kampanyaları oluşturun ve yönetin.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Yeni Kampanya Oluşturma</h3>
            <StepList
              steps={[
                'Menüden "Kampagnen" seçeneğine tıklayın',
                '"Neue Kampagne" butonuna tıklayın',
                'Kampanya adını ve açıklamasını girin',
                'İndirim oranını (%) belirleyin',
                'Başlangıç ve bitiş tarihlerini seçin',
                'Kampanyaya dahil edilecek ürünleri seçin',
                'Kampanya görselini yükleyin',
                '"Speichern" ile kaydedin',
              ]}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Aktif/Pasif Durumu</h3>
            <p className="text-gray-700">
              Kampanyaları "Aktiv" duruma getirerek web sitesinde görünür hale getirebilirsiniz. Pasif kampanyalar görünmez.
            </p>
          </div>

          <InfoBox type="info">
            Kampanya tarihleri otomatik olarak kontrol edilir. Süresi dolmuş kampanyalar otomatik olarak devre dışı kalır.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'coupons',
      icon: FiTag,
      title: 'Kupon Yönetimi (Gutscheine)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            İndirim kuponları oluşturun ve kullanım durumlarını takip edin.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Yeni Kupon Oluşturma</h3>
            <StepList
              steps={[
                'Menüden "Gutscheine" seçeneğine tıklayın',
                '"Neuer Gutschein" butonuna tıklayın',
                'Kupon kodunu belirleyin (benzersiz olmalı)',
                'İndirim tipini seçin (Yüzde veya Sabit tutar)',
                'İndirim miktarını girin',
                'Minimum sipariş tutarını belirleyin (opsiyonel)',
                'Kullanım limitini ayarlayın',
                'Son kullanma tarihini seçin',
                '"Speichern" ile kaydedin',
              ]}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Kupon Tipleri</h3>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Percentage:</strong> Yüzdelik indirim (örn: %20)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Fixed:</strong> Sabit tutar indirimi (örn: 10€)</span>
              </li>
            </ul>
          </div>

          <InfoBox type="success">
            Kupon kullanım istatistiklerini takip ederek hangi kuponların daha etkili olduğunu görebilirsiniz.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'users',
      icon: FiUsers,
      title: 'Kullanıcı Yönetimi (Benutzer)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Kayıtlı kullanıcıları görüntüleyin ve yönetin. (Sadece Super Admin)
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Kullanıcı Bilgilerini Görüntüleme</h3>
            <StepList
              steps={[
                'Menüden "Benutzer" seçeneğine tıklayın',
                'Kullanıcı listesinde arama yapabilirsiniz',
                'Kullanıcı detaylarını görmek için satıra tıklayın',
                'Sipariş geçmişini ve aktivitelerini inceleyebilirsiniz',
              ]}
            />
          </div>

          <InfoBox type="warning">
            Bu bölüm sadece Super Admin yetkisine sahip kullanıcılar tarafından erişilebilir.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'admins',
      icon: FiShield,
      title: 'Admin Yönetimi (Administratoren)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Admin kullanıcıları oluşturun ve yetkilendirin. (Sadece Super Admin)
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Yeni Admin Ekleme</h3>
            <StepList
              steps={[
                'Menüden "Administratoren" seçeneğine tıklayın',
                '"Neuer Administrator" butonuna tıklayın',
                'Admin bilgilerini girin (Ad, email, şifre)',
                'Rol seçin (Admin veya Super Admin)',
                '"Speichern" ile kaydedin',
              ]}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Admin Rolleri</h3>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Admin:</strong> Temel yönetim yetkilerine sahiptir</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Super Admin:</strong> Tüm yetkilere sahiptir, kullanıcı ve admin yönetimi yapabilir</span>
              </li>
            </ul>
          </div>

          <InfoBox type="warning">
            Super Admin yetkisini dikkatli verin. Bu yetki tüm sisteme tam erişim sağlar.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'notifications',
      icon: FiBell,
      title: 'Bildirim Yönetimi (Benachrichtigungen)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Kullanıcılara bildirim gönderin ve bildirim geçmişini görüntüleyin.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Toplu Bildirim Gönderme</h3>
            <StepList
              steps={[
                'Menüden "Benachrichtigungen" seçeneğine tıklayın',
                '"Neue Benachrichtigung" butonuna tıklayın',
                'Bildirim başlığını ve mesajını girin',
                'Hedef kitleyi seçin (Tüm kullanıcılar veya belirli gruplar)',
                '"Senden" ile bildirimi gönderin',
              ]}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Bildirim Tipleri</h3>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Sipariş Bildirimleri:</strong> Sipariş durum güncellemelerinde otomatik gönderilir</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Kampanya Bildirimleri:</strong> Yeni kampanyalar için manuel gönderilebilir</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Genel Duyurular:</strong> Önemli bilgiler için kullanılır</span>
              </li>
            </ul>
          </div>

          <InfoBox type="info">
            Bildirimler kullanıcıların web sitesinde ve mobil cihazlarında (eğer PWA kuruluysa) görünür.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'barcodes',
      icon: FiPrinter,
      title: 'Barkod Etiketleri (Barcode-Etiketten)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Ürünler için barkod etiketleri oluşturun ve yazdırın.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Barkod Etiketi Oluşturma</h3>
            <StepList
              steps={[
                'Menüden "Barcode-Etiketten" seçeneğine tıklayın',
                'Etiket oluşturmak istediğiniz ürünleri seçin',
                'Her ürün için etiket sayısını belirleyin',
                '"Vorschau" ile önizlemeyi görüntüleyin',
                '"Drucken" ile etiketleri yazdırın',
              ]}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Etiket Formatı</h3>
            <p className="text-gray-700">
              Etiketler standart barkod yazıcıları için optimize edilmiştir. Her etikette ürün adı, fiyat ve barkod bulunur.
            </p>
          </div>

          <InfoBox type="success">
            Toplu etiket yazdırma özelliği ile aynı anda birden fazla ürün için etiket oluşturabilirsiniz.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'settings',
      icon: FiSettings,
      title: 'Ayarlar (Einstellungen)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Genel sistem ayarlarını yapılandırın.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Yapılandırılabilir Ayarlar</h3>
            <ul className="space-y-2 ml-4">
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Mağaza Bilgileri:</strong> İşletme adı, adres, iletişim bilgileri</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Email Ayarları:</strong> Bildirim email şablonları</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Sipariş Ayarları:</strong> Minimum sipariş tutarı, teslimat seçenekleri</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-700">•</span>
                <span className="text-gray-700"><strong>Ödeme Ayarları:</strong> Kabul edilen ödeme yöntemleri</span>
              </li>
            </ul>
          </div>

          <InfoBox type="warning">
            Ayar değişiklikleri tüm sistemi etkileyebilir. Değişiklik yapmadan önce emin olun.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'homepage',
      icon: FiEdit3,
      title: 'Ana Sayfa Ayarları (Homepage-Einstellungen)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Web sitesinin ana sayfasını özelleştirin.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Ana Sayfa Öğeleri</h3>
            <StepList
              steps={[
                'Menüden "Homepage-Einstellungen" seçeneğine tıklayın',
                'Slider görselleri ekleyin veya düzenleyin',
                'Öne çıkan ürünleri seçin',
                'Öne çıkan kategorileri belirleyin',
                'Hakkımızda ve iletişim bilgilerini güncelleyin',
                '"Speichern" ile değişiklikleri kaydedin',
              ]}
            />
          </div>

          <InfoBox type="info">
            Ana sayfa değişiklikleri anında web sitesinde yansır.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'design',
      icon: FiDroplet,
      title: 'Tasarım Ayarları (Design-Einstellungen)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Web sitenizin renklerini ve görünümünü özelleştirin.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Renk Özelleştirme</h3>
            <StepList
              steps={[
                'Menüden "Design-Einstellungen" seçeneğine tıklayın',
                'Ana renk (Primary Color) seçin',
                'İkincil renk (Secondary Color) seçin',
                'Buton ve bağlantı renklerini ayarlayın',
                'Logo ve favicon yükleyin',
                'Önizleme ile değişiklikleri kontrol edin',
                '"Speichern" ile kaydedin',
              ]}
            />
          </div>

          <InfoBox type="success">
            Renk değişiklikleri tüm web sitesinde otomatik olarak uygulanır ve markanıza özel bir görünüm elde edersiniz.
          </InfoBox>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hilfe & Dokumentation</h1>
        <p className="text-gray-600 mt-2">
          Ausführliche Anleitung zur Verwendung des Admin-Panels
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
        <input
          type="text"
          placeholder="Suche in der Dokumentation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <HelpSection
              key={section.key}
              icon={section.icon}
              title={section.title}
              isOpen={openSections[section.key]}
              onToggle={() => toggleSection(section.key)}
            >
              {section.content}
            </HelpSection>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Keine Ergebnisse gefunden</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <FiAlertCircle className="text-green-600" />
          Zusätzliche Hilfe
        </h3>
        <p className="text-gray-700">
          Wenn Sie weitere Unterstützung benötigen, wenden Sie sich bitte an Ihren Systemadministrator
          oder technischen Support.
        </p>
      </div>
    </div>
  );
}

export default Help;
