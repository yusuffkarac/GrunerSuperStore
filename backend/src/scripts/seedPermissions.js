import prisma from '../config/prisma.js';

/**
 * İzinleri veritabanına ekle
 * Bu script, sistemde kullanılan tüm izinleri oluşturur
 */
async function seedPermissions() {
  console.log('🔐 İzinler oluşturuluyor...');

  const permissions = [
    // Verfallsdatum Verwaltung Berechtigungen
    {
      name: 'expiry_management_view',
      displayName: 'MHD-Verwaltung anzeigen',
      description: 'Berechtigung zum Anzeigen der Seite für die Verwaltung des Mindesthaltbarkeitsdatums',
      category: 'expiry',
    },
    {
      name: 'expiry_management_settings',
      displayName: 'MHD-Einstellungen',
      description: 'Berechtigung zum Ändern der Einstellungen für das Mindesthaltbarkeitsdatum',
      category: 'expiry',
    },
    {
      name: 'expiry_management_action',
      displayName: 'MHD-Aktionen',
      description: 'Berechtigung zum Etikettieren und Entfernen von Produkten',
      category: 'expiry',
    },
    // Produktverwaltung Berechtigungen
    {
      name: 'product_management_view',
      displayName: 'Produktverwaltung anzeigen',
      description: 'Berechtigung zum Anzeigen der Produktverwaltungsseite',
      category: 'products',
    },
    {
      name: 'product_management_create',
      displayName: 'Produkt erstellen',
      description: 'Berechtigung zum Erstellen eines neuen Produkts',
      category: 'products',
    },
    {
      name: 'product_management_edit',
      displayName: 'Produkt bearbeiten',
      description: 'Berechtigung zum Bearbeiten vorhandener Produkte',
      category: 'products',
    },
    {
      name: 'product_management_delete',
      displayName: 'Produkt löschen',
      description: 'Berechtigung zum Löschen von Produkten',
      category: 'products',
    },
    // Bestellverwaltung Berechtigungen
    {
      name: 'order_management_view',
      displayName: 'Bestellverwaltung anzeigen',
      description: 'Berechtigung zum Anzeigen der Bestellverwaltungsseite',
      category: 'orders',
    },
    {
      name: 'order_management_edit',
      displayName: 'Bestellung bearbeiten',
      description: 'Berechtigung zum Ändern des Bestellstatus',
      category: 'orders',
    },
    {
      name: 'order_management_cancel',
      displayName: 'Bestellung stornieren',
      description: 'Berechtigung zum Stornieren von Bestellungen',
      category: 'orders',
    },
    // Benutzerverwaltung Berechtigungen
    {
      name: 'user_management_view',
      displayName: 'Benutzerverwaltung anzeigen',
      description: 'Berechtigung zum Anzeigen der Benutzerverwaltungsseite',
      category: 'users',
    },
    {
      name: 'user_management_edit',
      displayName: 'Benutzer bearbeiten',
      description: 'Berechtigung zum Bearbeiten von Benutzerdaten',
      category: 'users',
    },
    // Marketing Berechtigungen
    {
      name: 'marketing_campaigns',
      displayName: 'Kampagnenverwaltung',
      description: 'Berechtigung zum Erstellen und Bearbeiten von Kampagnen',
      category: 'marketing',
    },
    {
      name: 'marketing_coupons',
      displayName: 'Couponverwaltung',
      description: 'Berechtigung zum Erstellen und Bearbeiten von Coupons',
      category: 'marketing',
    },
    // Einstellungen Berechtigungen
    {
      name: 'settings_view',
      displayName: 'Einstellungen anzeigen',
      description: 'Berechtigung zum Anzeigen der Systemeinstellungen',
      category: 'settings',
    },
    {
      name: 'settings_edit',
      displayName: 'Einstellungen bearbeiten',
      description: 'Berechtigung zum Ändern der Systemeinstellungen',
      category: 'settings',
    },
    {
      name: 'site_settings_manage',
      displayName: 'Seiteneinstellungen verwalten',
      description: 'Berechtigung zum Verwalten der Startseite, Footer, Cookie-Einstellungen und FAQs',
      category: 'settings',
    },
    {
      name: 'design_settings_manage',
      displayName: 'Design-Einstellungen verwalten',
      description: 'Berechtigung zum Verwalten der Design- und Markenrichtlinien (Farben, Logo, Favicon)',
      category: 'settings',
    },
    // Adminverwaltung Berechtigungen (nur für Super Admin, aber trotzdem angelegt)
    {
      name: 'admin_management',
      displayName: 'Adminverwaltung',
      description: 'Berechtigung zur Verwaltung von Admin-Benutzern (Super Admin)',
      category: 'admin',
    },
    // Benachrichtigungsverwaltung Berechtigungen
    {
      name: 'notification_management_view',
      displayName: 'Benachrichtigungsverwaltung anzeigen',
      description: 'Berechtigung zum Anzeigen der Benachrichtigungsverwaltungsseite',
      category: 'notifications',
    },
    {
      name: 'notification_management_create',
      displayName: 'Benachrichtigung erstellen',
      description: 'Berechtigung zum Erstellen einer neuen Benachrichtigung',
      category: 'notifications',
    },
    {
      name: 'notification_management_delete',
      displayName: 'Benachrichtigung löschen',
      description: 'Berechtigung zum Löschen von Benachrichtigungen',
      category: 'notifications',
    },
    // E-Mail-Vorlagenverwaltung Berechtigungen
    {
      name: 'email_template_management_view',
      displayName: 'E-Mail-Vorlagen anzeigen',
      description: 'Berechtigung zum Anzeigen der E-Mail-Vorlagenverwaltungsseite',
      category: 'templates',
    },
    {
      name: 'email_template_management_edit',
      displayName: 'E-Mail-Vorlagen bearbeiten',
      description: 'Berechtigung zum Bearbeiten von E-Mail-Vorlagen',
      category: 'templates',
    },
    // Benachrichtigungsvorlagenverwaltung Berechtigungen
    {
      name: 'notification_template_management_view',
      displayName: 'Benachrichtigungsvorlagen anzeigen',
      description: 'Berechtigung zum Anzeigen der Benachrichtigungsvorlagenverwaltungsseite',
      category: 'templates',
    },
    {
      name: 'notification_template_management_edit',
      displayName: 'Benachrichtigungsvorlagen bearbeiten',
      description: 'Berechtigung zum Bearbeiten von Benachrichtigungsvorlagen',
      category: 'templates',
    },
    // Barcode-Etikettenverwaltung Berechtigungen
    {
      name: 'barcode_label_view',
      displayName: 'Barcode-Etiketten anzeigen',
      description: 'Berechtigung zum Anzeigen der Barcode-Etikettenverwaltungsseite',
      category: 'barcode',
    },
    {
      name: 'barcode_label_create',
      displayName: 'Barcode-Etikett erstellen',
      description: 'Berechtigung zum Erstellen eines neuen Barcode-Etiketts',
      category: 'barcode',
    },
    {
      name: 'barcode_label_edit',
      displayName: 'Barcode-Etikett bearbeiten',
      description: 'Berechtigung zum Bearbeiten von Barcode-Etiketten',
      category: 'barcode',
    },
    {
      name: 'barcode_label_delete',
      displayName: 'Barcode-Etikett löschen',
      description: 'Berechtigung zum Löschen von Barcode-Etiketten',
      category: 'barcode',
    },
    // Magazine Verwaltung Berechtigungen
    {
      name: 'magazine_management_view',
      displayName: 'Magazine anzeigen',
      description: 'Berechtigung zum Anzeigen der Magazine-Verwaltungsseite',
      category: 'magazines',
    },
    {
      name: 'magazine_management_create',
      displayName: 'Magazin erstellen',
      description: 'Berechtigung zum Erstellen eines neuen Magazins',
      category: 'magazines',
    },
    {
      name: 'magazine_management_edit',
      displayName: 'Magazin bearbeiten',
      description: 'Berechtigung zum Bearbeiten vorhandener Magazine',
      category: 'magazines',
    },
    {
      name: 'magazine_management_delete',
      displayName: 'Magazin löschen',
      description: 'Berechtigung zum Löschen von Magazinen',
      category: 'magazines',
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

