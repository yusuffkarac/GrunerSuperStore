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
        className="w-full flex items-center justify-between p-3 md:p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 md:gap-4">
          <div className="p-2 md:p-3 bg-green-100 rounded-lg">
            <Icon className="text-green-600 text-lg md:text-xl" />
          </div>
          <h2 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {isOpen ? (
          <FiChevronUp className="text-gray-400 text-lg md:text-xl" />
        ) : (
          <FiChevronDown className="text-gray-400 text-lg md:text-xl" />
        )}
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="px-3 md:px-6 pb-4 md:pb-6"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

function StepList({ steps }) {
  return (
    <ol className="space-y-2 md:space-y-3 ml-2 md:ml-4">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-2 md:gap-3">
          <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs md:text-sm font-medium">
            {index + 1}
          </span>
          <span className="text-sm md:text-base text-gray-700 pt-0.5">{step}</span>
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
    <div className={`${style.bg} ${style.border} border rounded-lg p-3 md:p-4 mt-3 md:mt-4`}>
      <div className="flex gap-2 md:gap-3">
        <Icon className={`${style.iconColor} flex-shrink-0 mt-0.5 text-base md:text-lg`} />
        <div className="text-xs md:text-sm text-gray-700">{children}</div>
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
      title: 'Bestellungsverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Bestellungen anzeigen, Status aktualisieren und Benachrichtigungen an Kunden senden.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Bestellstatus aktualisieren</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Bestellungen"',
                'Finden Sie die Bestellung, die Sie aktualisieren möchten, in der Bestellliste',
                'Wählen Sie den neuen Status aus dem Dropdown-Menü in der Status-Spalte',
                'Die Änderung wird automatisch gespeichert und der Kunde erhält eine Benachrichtigung',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Bestellstatus</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Pending:</strong> Bestellung erhalten, wartet auf Bestätigung</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Processing:</strong> Bestellung wird vorbereitet</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Ready:</strong> Bestellung ist fertig, wartet auf Lieferung</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Delivered:</strong> Bestellung wurde geliefert</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Cancelled:</strong> Bestellung wurde storniert</span>
              </li>
            </ul>
          </div>

          <InfoBox type="info">
            Bei jeder Statusänderung wird automatisch eine Benachrichtigung an den Kunden gesendet. Kunden können den Status ihrer Bestellung verfolgen.
          </InfoBox>

          <InfoBox type="warning">
            Für stornierte Bestellungen werden die Produktbestände automatisch aktualisiert.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'products',
      icon: FiPackage,
      title: 'Produktverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Produkte hinzufügen, bearbeiten, löschen und Lagerbestände verwalten.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Neues Produkt hinzufügen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Produkte"',
                'Klicken Sie auf die Schaltfläche "Neues Produkt" oben rechts',
                'Füllen Sie die Produktinformationen aus (Name, Beschreibung, Preis, Lagerbestand usw.)',
                'Wählen Sie eine Kategorie und laden Sie das Produktbild hoch',
                'Geben Sie die Barcode-Nummer ein (optional)',
                'Klicken Sie auf "Speichern", um das Produkt zu speichern',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Produkt bearbeiten</h3>
            <StepList
              steps={[
                'Finden Sie das Produkt, das Sie bearbeiten möchten, in der Produktliste',
                'Klicken Sie auf die Schaltfläche "Bearbeiten" auf der rechten Seite',
                'Nehmen Sie die erforderlichen Änderungen vor',
                'Klicken Sie auf "Speichern", um zu speichern',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Lagerbestandswarnstufe</h3>
            <p className="text-sm md:text-base text-gray-700 mb-2">
              Sie können für jedes Produkt eine niedrige Lagerbestandswarnstufe festlegen. Wenn der Bestand unter diese Stufe fällt, sehen Sie eine Warnung im Dashboard.
            </p>
          </div>

          <InfoBox type="info">
            Produktbilder sollten maximal 5MB groß sein. Unterstützte Formate: JPG, PNG, WebP
          </InfoBox>

          <InfoBox type="success">
            Mit der Barcode-Funktion können Sie Produkte einfach scannen und Ihren Bestellprozess beschleunigen.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'categories',
      icon: FiGrid,
      title: 'Kategorieverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Produktkategorien erstellen und bearbeiten.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Neue Kategorie erstellen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Kategorien"',
                'Klicken Sie auf die Schaltfläche "Neue Kategorie"',
                'Geben Sie den Kategorienamen und die Beschreibung ein',
                'Laden Sie ein Kategoriebild hoch (optional)',
                'Legen Sie eine Sortiernummer fest',
                'Speichern Sie mit "Speichern"',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Kategoriesortierung</h3>
            <p className="text-sm md:text-base text-gray-700">
              Sie können die Reihenfolge, in der Kategorien auf der Website angezeigt werden, mit dem Feld "Sortierung" festlegen. Kleinere Zahlen erscheinen weiter oben.
            </p>
          </div>

          <InfoBox type="warning">
            Bevor Sie eine Kategorie löschen, verschieben oder löschen Sie die Produkte in dieser Kategorie in eine andere Kategorie.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'campaigns',
      icon: FiTag,
      title: 'Kampagnenverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Rabattkampagnen erstellen und verwalten.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Neue Kampagne erstellen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Kampagnen"',
                'Klicken Sie auf die Schaltfläche "Neue Kampagne"',
                'Geben Sie den Kampagnennamen und die Beschreibung ein',
                'Legen Sie den Rabattsatz (%) fest',
                'Wählen Sie Start- und Enddatum',
                'Wählen Sie die Produkte aus, die in die Kampagne aufgenommen werden sollen',
                'Laden Sie das Kampagnenbild hoch',
                'Speichern Sie mit "Speichern"',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Aktiv/Inaktiv Status</h3>
            <p className="text-sm md:text-base text-gray-700">
              Sie können Kampagnen durch Setzen auf "Aktiv" auf der Website sichtbar machen. Inaktive Kampagnen sind nicht sichtbar.
            </p>
          </div>

          <InfoBox type="info">
            Kampagnendaten werden automatisch überprüft. Abgelaufene Kampagnen werden automatisch deaktiviert.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'coupons',
      icon: FiTag,
      title: 'Gutscheinverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Rabattgutscheine erstellen und Nutzungsstatistiken verfolgen.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Neuen Gutschein erstellen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Gutscheine"',
                'Klicken Sie auf die Schaltfläche "Neuer Gutschein"',
                'Bestimmen Sie den Gutscheincode (muss eindeutig sein)',
                'Wählen Sie den Rabatttyp (Prozent oder fester Betrag)',
                'Geben Sie den Rabattbetrag ein',
                'Legen Sie den Mindestbestellwert fest (optional)',
                'Stellen Sie das Nutzungslimit ein',
                'Wählen Sie das Ablaufdatum',
                'Speichern Sie mit "Speichern"',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Gutscheintypen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Percentage:</strong> Prozentualer Rabatt (z.B. 20%)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Fixed:</strong> Fester Betragsrabatt (z.B. 10€)</span>
              </li>
            </ul>
          </div>

          <InfoBox type="success">
            Durch die Verfolgung der Gutscheinnutzungsstatistiken können Sie sehen, welche Gutscheine effektiver sind.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'users',
      icon: FiUsers,
      title: 'Benutzerverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Registrierte Benutzer anzeigen und verwalten. (Nur Super Admin)
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Benutzerinformationen anzeigen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Benutzer"',
                'Sie können in der Benutzerliste suchen',
                'Klicken Sie auf eine Zeile, um Benutzerdetails anzuzeigen',
                'Sie können Bestellverlauf und Aktivitäten überprüfen',
              ]}
            />
          </div>

          <InfoBox type="warning">
            Dieser Bereich ist nur für Benutzer mit Super-Admin-Berechtigung zugänglich.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'admins',
      icon: FiShield,
      title: 'Administratorenverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Admin-Benutzer erstellen und autorisieren. (Nur Super Admin)
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Neuen Administrator hinzufügen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Administratoren"',
                'Klicken Sie auf die Schaltfläche "Neuer Administrator"',
                'Geben Sie die Admin-Informationen ein (Name, E-Mail, Passwort)',
                'Wählen Sie eine Rolle (Admin oder Super Admin)',
                'Speichern Sie mit "Speichern"',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Admin-Rollen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Admin:</strong> Hat grundlegende Verwaltungsrechte</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Super Admin:</strong> Hat alle Rechte, kann Benutzer- und Admin-Verwaltung durchführen</span>
              </li>
            </ul>
          </div>

          <InfoBox type="warning">
            Vergeben Sie Super-Admin-Berechtigungen mit Vorsicht. Diese Berechtigung gewährt vollen Zugriff auf das gesamte System.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'notifications',
      icon: FiBell,
      title: 'Benachrichtigungsverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Benachrichtigungen an Benutzer senden und Benachrichtigungsverlauf anzeigen.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Massenbenachrichtigung senden</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Benachrichtigungen"',
                'Klicken Sie auf die Schaltfläche "Neue Benachrichtigung"',
                'Geben Sie den Benachrichtigungstitel und die Nachricht ein',
                'Wählen Sie die Zielgruppe (Alle Benutzer oder bestimmte Gruppen)',
                'Senden Sie die Benachrichtigung mit "Senden"',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Benachrichtigungstypen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Bestellbenachrichtigungen:</strong> Werden automatisch bei Bestellstatusaktualisierungen gesendet</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Kampagnenbenachrichtigungen:</strong> Können manuell für neue Kampagnen gesendet werden</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Allgemeine Ankündigungen:</strong> Werden für wichtige Informationen verwendet</span>
              </li>
            </ul>
          </div>

          <InfoBox type="info">
            Benachrichtigungen sind auf der Website der Benutzer und auf mobilen Geräten sichtbar (wenn PWA installiert ist).
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'barcodes',
      icon: FiPrinter,
      title: 'Barcode-Etiketten',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Barcode-Etiketten für Produkte erstellen und drucken.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Barcode-Etikett erstellen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Barcode-Etiketten"',
                'Wählen Sie die Produkte aus, für die Sie Etiketten erstellen möchten',
                'Bestimmen Sie die Anzahl der Etiketten für jedes Produkt',
                'Zeigen Sie die Vorschau mit "Vorschau" an',
                'Drucken Sie die Etiketten mit "Drucken"',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Etikettenformat</h3>
            <p className="text-sm md:text-base text-gray-700">
              Etiketten sind für Standard-Barcodedrucker optimiert. Jedes Etikett enthält Produktname, Preis und Barcode.
            </p>
          </div>

          <InfoBox type="success">
            Mit der Funktion zum Massendrucken von Etiketten können Sie gleichzeitig Etiketten für mehrere Produkte erstellen.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'settings',
      icon: FiSettings,
      title: 'Einstellungen',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Allgemeine Systemeinstellungen konfigurieren.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Konfigurierbare Einstellungen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Ladengeschäftsinformationen:</strong> Geschäftsname, Adresse, Kontaktinformationen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>E-Mail-Einstellungen:</strong> Benachrichtigungs-E-Mail-Vorlagen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Bestelleinstellungen:</strong> Mindestbestellwert, Lieferoptionen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Zahlungseinstellungen:</strong> Akzeptierte Zahlungsmethoden</span>
              </li>
            </ul>
          </div>

          <InfoBox type="warning">
            Einstellungsänderungen können das gesamte System beeinflussen. Stellen Sie sicher, bevor Sie Änderungen vornehmen.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'homepage',
      icon: FiEdit3,
      title: 'Homepage-Einstellungen',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Die Startseite der Website anpassen.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Homepage-Elemente</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Homepage-Einstellungen"',
                'Fügen Sie Slider-Bilder hinzu oder bearbeiten Sie sie',
                'Wählen Sie herausragende Produkte aus',
                'Bestimmen Sie herausragende Kategorien',
                'Aktualisieren Sie Informationen über uns und Kontaktinformationen',
                'Speichern Sie die Änderungen mit "Speichern"',
              ]}
            />
          </div>

          <InfoBox type="info">
            Homepage-Änderungen werden sofort auf der Website widergespiegelt.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'design',
      icon: FiDroplet,
      title: 'Design-Einstellungen',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Farben und Aussehen Ihrer Website anpassen.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Farbanpassung</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Design-Einstellungen"',
                'Wählen Sie die Hauptfarbe (Primary Color)',
                'Wählen Sie die Sekundärfarbe (Secondary Color)',
                'Stellen Sie Button- und Linkfarben ein',
                'Laden Sie Logo und Favicon hoch',
                'Überprüfen Sie die Änderungen mit der Vorschau',
                'Speichern Sie mit "Speichern"',
              ]}
            />
          </div>

          <InfoBox type="success">
            Farbänderungen werden automatisch auf der gesamten Website angewendet und Sie erhalten ein markenspezifisches Aussehen.
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl lg:text-2xl font-bold text-gray-900">Hilfe & Dokumentation</h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">
          Ausführliche Anleitung zur Verwendung des Admin-Panels
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg md:text-xl" />
        <input
          type="text"
          placeholder="Suche in der Dokumentation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
          <div className="text-center py-8 md:py-12">
            <p className="text-sm md:text-base text-gray-500">Keine Ergebnisse gefunden</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 md:p-6 mt-6 md:mt-8">
        <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <FiAlertCircle className="text-green-600 text-base md:text-lg" />
          Zusätzliche Hilfe
        </h3>
        <p className="text-xs md:text-sm text-gray-700">
          Wenn Sie weitere Unterstützung benötigen, wenden Sie sich bitte an Ihren Systemadministrator
          oder technischen Support.
        </p>
      </div>
    </div>
  );
}

export default Help;
