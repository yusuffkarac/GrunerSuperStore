import prisma from '../config/prisma.js';

/**
 * İzinleri veritabanına ekle
 * Bu script, sistemde kullanılan tüm izinleri oluşturur
 */
async function seedPermissions() {
  console.log('🔐 İzinler oluşturuluyor...');

  const permissions = [
    // SKT Yönetimi İzinleri
    {
      name: 'expiry_management_view',
      displayName: 'SKT Yönetimi Görüntüleme',
      description: 'Son kullanma tarihi yönetimi sayfasını görüntüleme yetkisi',
      category: 'expiry',
    },
    {
      name: 'expiry_management_settings',
      displayName: 'SKT Ayarları',
      description: 'Son kullanma tarihi ayarlarını değiştirme yetkisi',
      category: 'expiry',
    },
    {
      name: 'expiry_management_action',
      displayName: 'SKT İşlemleri',
      description: 'Ürünleri etiketleme ve kaldırma işlemleri yapma yetkisi',
      category: 'expiry',
    },
    // Ürün Yönetimi İzinleri
    {
      name: 'product_management_view',
      displayName: 'Ürün Yönetimi Görüntüleme',
      description: 'Ürün yönetimi sayfasını görüntüleme yetkisi',
      category: 'products',
    },
    {
      name: 'product_management_create',
      displayName: 'Ürün Oluşturma',
      description: 'Yeni ürün oluşturma yetkisi',
      category: 'products',
    },
    {
      name: 'product_management_edit',
      displayName: 'Ürün Düzenleme',
      description: 'Mevcut ürünleri düzenleme yetkisi',
      category: 'products',
    },
    {
      name: 'product_management_delete',
      displayName: 'Ürün Silme',
      description: 'Ürün silme yetkisi',
      category: 'products',
    },
    // Sipariş Yönetimi İzinleri
    {
      name: 'order_management_view',
      displayName: 'Sipariş Yönetimi Görüntüleme',
      description: 'Sipariş yönetimi sayfasını görüntüleme yetkisi',
      category: 'orders',
    },
    {
      name: 'order_management_edit',
      displayName: 'Sipariş Düzenleme',
      description: 'Sipariş durumunu değiştirme yetkisi',
      category: 'orders',
    },
    {
      name: 'order_management_cancel',
      displayName: 'Sipariş İptal Etme',
      description: 'Siparişleri iptal etme yetkisi',
      category: 'orders',
    },
    // Kullanıcı Yönetimi İzinleri
    {
      name: 'user_management_view',
      displayName: 'Kullanıcı Yönetimi Görüntüleme',
      description: 'Kullanıcı yönetimi sayfasını görüntüleme yetkisi',
      category: 'users',
    },
    {
      name: 'user_management_edit',
      displayName: 'Kullanıcı Düzenleme',
      description: 'Kullanıcı bilgilerini düzenleme yetkisi',
      category: 'users',
    },
    // Pazarlama İzinleri
    {
      name: 'marketing_campaigns',
      displayName: 'Kampanya Yönetimi',
      description: 'Kampanya oluşturma ve düzenleme yetkisi',
      category: 'marketing',
    },
    {
      name: 'marketing_coupons',
      displayName: 'Kupon Yönetimi',
      description: 'Kupon oluşturma ve düzenleme yetkisi',
      category: 'marketing',
    },
    // Ayarlar İzinleri
    {
      name: 'settings_view',
      displayName: 'Ayarları Görüntüleme',
      description: 'Sistem ayarlarını görüntüleme yetkisi',
      category: 'settings',
    },
    {
      name: 'settings_edit',
      displayName: 'Ayarları Düzenleme',
      description: 'Sistem ayarlarını değiştirme yetkisi',
      category: 'settings',
    },
    // Admin Yönetimi İzinleri (Super Admin'e özel, ama yine de tanımlı)
    {
      name: 'admin_management',
      displayName: 'Admin Yönetimi',
      description: 'Admin kullanıcılarını yönetme yetkisi (Super Admin)',
      category: 'admin',
    },
    // Bildirim Yönetimi İzinleri
    {
      name: 'notification_management_view',
      displayName: 'Bildirim Yönetimi Görüntüleme',
      description: 'Bildirim yönetimi sayfasını görüntüleme yetkisi',
      category: 'notifications',
    },
    {
      name: 'notification_management_create',
      displayName: 'Bildirim Oluşturma',
      description: 'Yeni bildirim oluşturma yetkisi',
      category: 'notifications',
    },
    {
      name: 'notification_management_delete',
      displayName: 'Bildirim Silme',
      description: 'Bildirim silme yetkisi',
      category: 'notifications',
    },
    // E-Mail Template Yönetimi İzinleri
    {
      name: 'email_template_management_view',
      displayName: 'E-Mail Template Görüntüleme',
      description: 'E-Mail template yönetimi sayfasını görüntüleme yetkisi',
      category: 'templates',
    },
    {
      name: 'email_template_management_edit',
      displayName: 'E-Mail Template Düzenleme',
      description: 'E-Mail template\'lerini düzenleme yetkisi',
      category: 'templates',
    },
    // Bildirim Template Yönetimi İzinleri
    {
      name: 'notification_template_management_view',
      displayName: 'Bildirim Template Görüntüleme',
      description: 'Bildirim template yönetimi sayfasını görüntüleme yetkisi',
      category: 'templates',
    },
    {
      name: 'notification_template_management_edit',
      displayName: 'Bildirim Template Düzenleme',
      description: 'Bildirim template\'lerini düzenleme yetkisi',
      category: 'templates',
    },
    // Barcode Label Yönetimi İzinleri
    {
      name: 'barcode_label_view',
      displayName: 'Barcode Etiket Görüntüleme',
      description: 'Barcode etiket yönetimi sayfasını görüntüleme yetkisi',
      category: 'barcode',
    },
    {
      name: 'barcode_label_create',
      displayName: 'Barcode Etiket Oluşturma',
      description: 'Yeni barcode etiket oluşturma yetkisi',
      category: 'barcode',
    },
    {
      name: 'barcode_label_edit',
      displayName: 'Barcode Etiket Düzenleme',
      description: 'Barcode etiket düzenleme yetkisi',
      category: 'barcode',
    },
    {
      name: 'barcode_label_delete',
      displayName: 'Barcode Etiket Silme',
      description: 'Barcode etiket silme yetkisi',
      category: 'barcode',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const permission of permissions) {
    try {
      await prisma.adminPermission.upsert({
        where: { name: permission.name },
        update: {
          displayName: permission.displayName,
          description: permission.description,
          category: permission.category,
        },
        create: permission,
      });
      created++;
      console.log(`✅ ${permission.displayName} oluşturuldu`);
    } catch (error) {
      if (error.code === 'P2002') {
        skipped++;
        console.log(`⏭️  ${permission.displayName} zaten mevcut`);
      } else {
        console.error(`❌ ${permission.displayName} oluşturulurken hata:`, error);
      }
    }
  }

  console.log(`\n📊 Özet:`);
  console.log(`   ✅ Oluşturulan: ${created}`);
  console.log(`   ⏭️  Zaten mevcut: ${skipped}`);
  console.log(`   📝 Toplam: ${permissions.length}`);
}

// Script'i çalıştır
seedPermissions()
  .then(() => {
    console.log('\n✨ İzinler başarıyla oluşturuldu!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Hata:', error);
    process.exit(1);
  });

