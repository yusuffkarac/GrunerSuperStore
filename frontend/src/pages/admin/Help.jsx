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
  FiBarChart2,
  FiTrendingUp,
  FiClock,
  FiList,
  FiMail,
  FiBook,
  FiRefreshCw,
  FiHelpCircle,
  FiLayers,
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
    {
      key: 'dashboard',
      icon: FiBarChart2,
      title: 'Dashboard & Statistiken',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Übersicht über Verkäufe, Bestellungen, Produkte und Benutzer mit detaillierten Statistiken und Grafiken.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Dashboard-Funktionen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Statistikkarten:</strong> Gesamtumsatz, Bestellungen, Produkte, Benutzer</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Trend-Grafiken:</strong> Umsatz- und Bestelltrends über Zeit</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Top-Produkte:</strong> Meistverkaufte Produkte</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Kategorie-Performance:</strong> Verkaufsstatistiken nach Kategorien</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Filter:</strong> Daten nach Datum und Kategorie filtern</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Datenfilterung</h3>
            <StepList
              steps={[
                'Verwenden Sie die Filterleiste, um einen Zeitraum auszuwählen',
                'Wählen Sie optional eine Kategorie für spezifische Statistiken',
                'Die Grafiken und Tabellen werden automatisch aktualisiert',
              ]}
            />
          </div>

          <InfoBox type="info">
            Das Dashboard zeigt Echtzeitdaten und wird automatisch aktualisiert, wenn neue Bestellungen eingehen.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'stock',
      icon: FiPackage,
      title: 'Lagerbestandsverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Produktbestände überwachen, Bestelllisten erstellen und Lieferungen verwalten.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Niedrige Bestände verwalten</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Lagerbestandsverwaltung"',
                'Sehen Sie Produkte mit niedrigem Bestand in der Liste',
                'Wählen Sie Produkte aus, die nachbestellt werden müssen',
                'Erstellen Sie eine Bestellliste oder bestellen Sie einzeln',
                'Verfolgen Sie erwartete Liefertermine',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Bestelllisten erstellen</h3>
            <StepList
              steps={[
                'Wählen Sie mehrere Produkte mit niedrigem Bestand aus',
                'Klicken Sie auf "Bestellliste erstellen"',
                'Geben Sie die Bestellmengen für jedes Produkt ein',
                'Speichern Sie die Liste für spätere Verfolgung',
                'Markieren Sie Lieferungen als erhalten, wenn sie ankommen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Ansichtsmodi</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Kritikalität:</strong> Nach Bestandsniveau gruppiert</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Kategorie:</strong> Nach Produktkategorien gruppiert</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Lieferant:</strong> Nach Lieferanten gruppiert</span>
              </li>
            </ul>
          </div>

          <InfoBox type="warning">
            Produkte mit niedrigem Bestand werden automatisch im Dashboard angezeigt, wenn der Bestand unter die Warnstufe fällt.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'expiry',
      icon: FiClock,
      title: 'MHD-Verwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Mindesthaltbarkeitsdaten (MHD) von Produkten verwalten und Warnungen für ablaufende Produkte erhalten.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">MHD überprüfen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "MHD-Verwaltung"',
                'Wählen Sie ein Datum aus, um Produkte zu sehen, die an diesem Datum ablaufen',
                'Sehen Sie kritische (rot) und Warnprodukte (gelb)',
                'Verwenden Sie die Barcode-Scanner-Funktion für schnelle Eingabe',
                'Aktualisieren Sie MHD-Daten für Produkte',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Produkte entfernen</h3>
            <StepList
              steps={[
                'Klicken Sie auf "Entfernen" für ein abgelaufenes Produkt',
                'Geben Sie optional eine Notiz ein',
                'Das Produkt wird aus dem Bestand entfernt',
                'Sie können die Aktion später rückgängig machen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Einstellungen</h3>
            <p className="text-sm md:text-base text-gray-700 mb-2">
              Konfigurieren Sie Warn- und kritische Tage in den Einstellungen. Produkte werden automatisch kategorisiert basierend auf diesen Einstellungen.
            </p>
          </div>

          <InfoBox type="warning">
            Täglich werden E-Mail-Benachrichtigungen an Administratoren gesendet, wenn Produkte kurz vor dem Ablauf stehen.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'tasks',
      icon: FiList,
      title: 'Aufgabenverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Produkte mit fehlenden Informationen finden und vervollständigen.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Aufgabentypen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Foto:</strong> Produkte ohne Bild</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Barcode:</strong> Produkte ohne Barcode</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Kategorie:</strong> Produkte ohne Kategorie</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Preis:</strong> Produkte ohne Preis</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>MHD:</strong> Produkte ohne Mindesthaltbarkeitsdatum</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Aufgaben bearbeiten</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Aufgaben"',
                'Wählen Sie einen Aufgabentyp aus den Tabs',
                'Durchsuchen Sie die Liste der Produkte mit fehlenden Informationen',
                'Klicken Sie auf "Bearbeiten", um fehlende Informationen hinzuzufügen',
                'Speichern Sie die Änderungen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Produkte ignorieren</h3>
            <p className="text-sm md:text-base text-gray-700 mb-2">
              Wenn ein Produkt vorübergehend nicht bearbeitet werden soll, können Sie es als "ignoriert" markieren. Ignorierte Produkte erscheinen in einem separaten Tab.
            </p>
          </div>

          <InfoBox type="info">
            Die Anzahl der Produkte mit fehlenden Informationen wird in jedem Tab angezeigt, um Ihnen zu helfen, den Fortschritt zu verfolgen.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'activity',
      icon: FiTrendingUp,
      title: 'Aktivitätsprotokolle',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Alle Systemaktivitäten, Benutzeraktionen und Änderungen verfolgen und überwachen.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Protokolle anzeigen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Aktivitätsprotokolle"',
                'Sehen Sie alle Systemaktivitäten in chronologischer Reihenfolge',
                'Verwenden Sie Filter, um nach spezifischen Aktivitäten zu suchen',
                'Klicken Sie auf einen Eintrag, um Details anzuzeigen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Filteroptionen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Benutzertyp:</strong> Kunde oder Administrator</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Ebene:</strong> Info, Warnung, Fehler</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Aktion:</strong> Erstellen, Aktualisieren, Löschen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Entitätstyp:</strong> Produkt, Bestellung, Benutzer usw.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Datum:</strong> Nach Zeitraum filtern</span>
              </li>
            </ul>
          </div>

          <InfoBox type="warning">
            Aktivitätsprotokolle helfen bei der Sicherheitsüberwachung und Fehlerbehebung. Alle wichtigen Aktionen werden automatisch protokolliert.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'bulk-prices',
      icon: FiRefreshCw,
      title: 'Massenpreisaktualisierungen',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Preise für mehrere Produkte gleichzeitig aktualisieren und temporäre Preisänderungen verwalten.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Preisaktualisierungen anzeigen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Massenpreisaktualisierungen"',
                'Sehen Sie alle durchgeführten Massenpreisaktualisierungen',
                'Filtern Sie nach Status: Alle, Aktiv, Rückgängig gemacht',
                'Erweitern Sie einen Eintrag, um Details zu sehen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Aktualisierungstypen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Permanent:</strong> Dauerhafte Preisänderungen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Temporär:</strong> Preisänderungen mit Ablaufdatum</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Temporäre Aktualisierungen bearbeiten</h3>
            <StepList
              steps={[
                'Finden Sie eine temporäre Preisaktualisierung',
                'Klicken Sie auf "Bearbeiten"',
                'Ändern Sie das Enddatum',
                'Speichern Sie die Änderungen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Aktualisierung rückgängig machen</h3>
            <StepList
              steps={[
                'Klicken Sie auf "Rückgängig machen" für eine Aktualisierung',
                'Bestätigen Sie die Aktion',
                'Alle Preise werden auf ihre vorherigen Werte zurückgesetzt',
              ]}
            />
          </div>

          <InfoBox type="warning">
            Das Rückgängigmachen einer Preisaktualisierung kann nicht rückgängig gemacht werden. Stellen Sie sicher, bevor Sie fortfahren.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'magazines',
      icon: FiBook,
      title: 'Magazinverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            PDF-Magazine hochladen und auf der Website anzeigen.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Neues Magazin hinzufügen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Magazine"',
                'Klicken Sie auf "Neues Magazin"',
                'Geben Sie den Titel ein',
                'Laden Sie eine PDF-Datei hoch (max. 50MB)',
                'Wählen Sie Start- und Enddatum für die Anzeige',
                'Aktivieren Sie das Magazin, um es auf der Website sichtbar zu machen',
                'Speichern Sie mit "Speichern"',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Magazin bearbeiten</h3>
            <StepList
              steps={[
                'Finden Sie das Magazin in der Liste',
                'Klicken Sie auf "Bearbeiten"',
                'Nehmen Sie die erforderlichen Änderungen vor',
                'Sie können die PDF-Datei aktualisieren, wenn nötig',
                'Speichern Sie die Änderungen',
              ]}
            />
          </div>

          <InfoBox type="info">
            Nur Magazine, die innerhalb ihres Start- und Enddatums liegen und aktiviert sind, werden auf der Website angezeigt.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'footer',
      icon: FiEdit3,
      title: 'Footer-Einstellungen',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Footer-Struktur, Links und Inhalte der Website anpassen.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Footer-Blöcke verwalten</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Seiteneinstellungen" und wählen Sie "Footer-Einstellungen"',
                'Erstellen Sie neue Blöcke oder bearbeiten Sie bestehende',
                'Fügen Sie Links, Texte und Kategorien hinzu',
                'Organisieren Sie Blöcke durch Drag & Drop',
                'Exportieren oder importieren Sie Einstellungen als JSON',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Block-Typen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Link-Liste:</strong> Liste von Links</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Text:</strong> Freitext-Inhalt</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Kategorien:</strong> Produktkategorien automatisch anzeigen</span>
              </li>
            </ul>
          </div>

          <InfoBox type="success">
            Sie können Footer-Einstellungen als JSON exportieren und in anderen Installationen importieren, um die Konfiguration zu teilen.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'faqs',
      icon: FiHelpCircle,
      title: 'FAQ-Verwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Häufig gestellte Fragen (FAQs) erstellen, bearbeiten und organisieren.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Neue FAQ erstellen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Seiteneinstellungen" und wählen Sie "FAQ-Verwaltung"',
                'Klicken Sie auf "Neue FAQ"',
                'Geben Sie die Frage und Antwort ein',
                'Wählen Sie optional eine Kategorie',
                'Legen Sie eine Sortierreihenfolge fest',
                'Aktivieren Sie die FAQ, um sie auf der Website anzuzeigen',
                'Speichern Sie mit "Speichern"',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">FAQs organisieren</h3>
            <StepList
              steps={[
                'Verwenden Sie Kategorien, um FAQs zu gruppieren',
                'Legen Sie Sortierreihenfolgen fest, um die Anzeigereihenfolge zu steuern',
                'Aktivieren oder deaktivieren Sie FAQs nach Bedarf',
                'Exportieren oder importieren Sie FAQs als JSON',
              ]}
            />
          </div>

          <InfoBox type="info">
            FAQs werden auf der FAQ-Seite der Website angezeigt. Nur aktive FAQs sind für Benutzer sichtbar.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'cookies',
      icon: FiShield,
      title: 'Cookie-Einstellungen',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Cookie-Einwilligungstexte und -einstellungen für die Website konfigurieren.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Cookie-Texte anpassen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Seiteneinstellungen" und wählen Sie "Cookie-Einstellungen"',
                'Bearbeiten Sie Titel, Beschreibungen und Button-Texte',
                'Passen Sie Texte für notwendige, Analyse- und Marketing-Cookies an',
                'Speichern Sie die Änderungen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Cookie-Typen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Notwendige Cookies:</strong> Erforderlich für die Grundfunktionen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Analyse-Cookies:</strong> Für Website-Analysen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Marketing-Cookies:</strong> Für Werbung und Marketing</span>
              </li>
            </ul>
          </div>

          <InfoBox type="warning">
            Cookie-Einstellungen müssen den Datenschutzbestimmungen entsprechen. Stellen Sie sicher, dass alle Texte korrekt und vollständig sind.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'email-templates',
      icon: FiMail,
      title: 'E-Mail-Vorlagen',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            E-Mail-Vorlagen für Bestellungen, Benachrichtigungen und andere System-E-Mails anpassen.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Vorlage bearbeiten</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "E-Mail-Vorlagen"',
                'Wählen Sie eine Vorlage aus der Liste',
                'Bearbeiten Sie Betreff und E-Mail-Text',
                'Verwenden Sie Variablen wie [Kundenname], [Bestellnummer] usw.',
                'Verwenden Sie den einfachen Modus für benutzerfreundliche Bearbeitung',
                'Vorschau anzeigen, um das Ergebnis zu sehen',
                'Test-E-Mail senden, um die Vorlage zu überprüfen',
                'Speichern Sie die Änderungen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Verfügbare Variablen</h3>
            <p className="text-sm md:text-base text-gray-700 mb-2">
              Sie können Variablen wie [Kundenname], [Bestellnummer], [Gesamtbetrag], [Status] und viele mehr verwenden. Diese werden automatisch durch die tatsächlichen Werte ersetzt.
            </p>
          </div>

          <InfoBox type="info">
            Im einfachen Modus werden technische Variablen durch benutzerfreundliche Platzhalter ersetzt, um die Bearbeitung zu erleichtern.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'notification-templates',
      icon: FiBell,
      title: 'Benachrichtigungsvorlagen',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Vorlagen für Push-Benachrichtigungen anpassen, die an Benutzer gesendet werden.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Vorlage bearbeiten</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Benachrichtigungsvorlagen"',
                'Wählen Sie eine Vorlage aus der Liste',
                'Bearbeiten Sie Titel und Nachricht',
                'Verwenden Sie Variablen wie [Kundenname], [Bestellnummer] usw.',
                'Verwenden Sie den einfachen Modus für benutzerfreundliche Bearbeitung',
                'Vorschau anzeigen, um das Ergebnis zu sehen',
                'Speichern Sie die Änderungen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Vorlagentypen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Bestellstatus:</strong> Für Bestellstatusänderungen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Kampagne:</strong> Für neue Kampagnen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Allgemein:</strong> Für allgemeine Benachrichtigungen</span>
              </li>
            </ul>
          </div>

          <InfoBox type="success">
            Benachrichtigungsvorlagen werden automatisch verwendet, wenn entsprechende Ereignisse im System auftreten.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'roles',
      icon: FiShield,
      title: 'Rollenverwaltung',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Benutzerrollen erstellen und Berechtigungen zuweisen. (Nur Super Admin)
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Neue Rolle erstellen</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Rollenverwaltung"',
                'Klicken Sie auf "Neue Rolle"',
                'Geben Sie Rollenname und Beschreibung ein',
                'Wählen Sie die Berechtigungen aus, die diese Rolle haben soll',
                'Speichern Sie mit "Speichern"',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Rolle bearbeiten</h3>
            <StepList
              steps={[
                'Finden Sie die Rolle in der Liste',
                'Klicken Sie auf "Bearbeiten"',
                'Ändern Sie Berechtigungen nach Bedarf',
                'Speichern Sie die Änderungen',
              ]}
            />
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Berechtigungen</h3>
            <p className="text-sm md:text-base text-gray-700 mb-2">
              Berechtigungen bestimmen, welche Aktionen Benutzer mit einer bestimmten Rolle ausführen können. Wählen Sie sorgfältig aus, welche Berechtigungen jede Rolle haben soll.
            </p>
          </div>

          <InfoBox type="warning">
            Diese Funktion ist nur für Super-Administratoren verfügbar. Änderungen an Rollen und Berechtigungen wirken sich auf die Sicherheit des Systems aus.
          </InfoBox>
        </div>
      ),
    },
    {
      key: 'page-settings',
      icon: FiLayers,
      title: 'Seiteneinstellungen',
      content: (
        <div className="space-y-3 md:space-y-4">
          <p className="text-sm md:text-base text-gray-600">
            Alle Seiteneinstellungen an einem zentralen Ort verwalten.
          </p>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Verfügbare Einstellungen</h3>
            <ul className="space-y-1.5 md:space-y-2 ml-2 md:ml-4">
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Startseite:</strong> Homepage-Texte und Inhalte</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Footer:</strong> Footer-Struktur und Links</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>Cookie:</strong> Cookie-Einwilligungstexte</span>
              </li>
              <li className="flex gap-2">
                <span className="text-sm md:text-base text-gray-700">•</span>
                <span className="text-sm md:text-base text-gray-700"><strong>FAQ:</strong> Häufig gestellte Fragen</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Einstellungen verwenden</h3>
            <StepList
              steps={[
                'Klicken Sie im Menü auf "Seiteneinstellungen"',
                'Wählen Sie den gewünschten Tab aus',
                'Nehmen Sie Ihre Änderungen vor',
                'Speichern Sie die Einstellungen',
              ]}
            />
          </div>

          <InfoBox type="info">
            Alle Seiteneinstellungen sind an einem Ort zusammengefasst, um die Verwaltung zu vereinfachen.
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
