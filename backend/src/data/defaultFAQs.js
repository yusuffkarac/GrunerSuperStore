// Default FAQ soruları - E-ticaret uygulaması için
export const defaultFAQs = [
  {
    question: 'Wie kann ich eine Bestellung aufgeben?',
    answer: 'Sie können ganz einfach eine Bestellung aufgeben:<br><br><strong>1.</strong> Durchsuchen Sie unsere Produktkategorien oder verwenden Sie die Suchfunktion.<br><strong>2.</strong> Fügen Sie gewünschte Produkte zum Warenkorb hinzu.<br><strong>3.</strong> Gehen Sie zum Warenkorb und klicken Sie auf "Zur Kasse".<br><strong>4.</strong> Wählen Sie eine Lieferadresse oder geben Sie eine neue ein.<br><strong>5.</strong> Wählen Sie die Zahlungsmethode und bestätigen Sie Ihre Bestellung.<br><br>Nach der Bestätigung erhalten Sie eine Bestellbestätigung per E-Mail.',
    category: 'Bestellung',
    sortOrder: 1,
    isActive: true,
  },
  {
    question: 'Welche Zahlungsmethoden werden akzeptiert?',
    answer: 'Wir akzeptieren folgende Zahlungsmethoden:<br><br><strong>• Barzahlung bei Lieferung:</strong> Sie zahlen den Betrag direkt beim Lieferanten.<br><strong>• Kartenzahlung bei Lieferung:</strong> Sie können mit EC-Karte oder Kreditkarte bei der Lieferung bezahlen.<br><br>Bitte beachten Sie, dass die verfügbaren Zahlungsmethoden je nach Lieferadresse variieren können.',
    category: 'Zahlung',
    sortOrder: 2,
    isActive: true,
  },
  {
    question: 'Wie lange dauert die Lieferung?',
    answer: 'Die Lieferzeit hängt von Ihrer Adresse und der Verfügbarkeit der Produkte ab:<br><br><strong>• Standardlieferung:</strong> In der Regel 1-3 Werktage<br><strong>• Expresslieferung:</strong> Am selben Tag (falls verfügbar)<br><strong>• Abholung:</strong> Sie können Ihre Bestellung auch direkt im Geschäft abholen<br><br>Sie erhalten eine E-Mail mit der geschätzten Lieferzeit nach der Bestellbestätigung.',
    category: 'Lieferung',
    sortOrder: 3,
    isActive: true,
  },
  {
    question: 'Kann ich meine Bestellung stornieren?',
    answer: 'Ja, Sie können Ihre Bestellung stornieren:<br><br><strong>• Vor der Bearbeitung:</strong> Sie können Ihre Bestellung direkt in Ihrem Konto stornieren.<br><strong>• Nach der Bearbeitung:</strong> Bitte kontaktieren Sie unseren Kundenservice so schnell wie möglich.<br><br>Bitte beachten Sie, dass bereits versandte Bestellungen möglicherweise nicht mehr storniert werden können. In diesem Fall können Sie die Rücksendung nach Erhalt durchführen.',
    category: 'Bestellung',
    sortOrder: 4,
    isActive: true,
  },
  {
    question: 'Wie kann ich mein Konto erstellen?',
    answer: 'Die Kontoerstellung ist ganz einfach:<br><br><strong>1.</strong> Klicken Sie auf "Registrieren" in der oberen rechten Ecke.<br><strong>2.</strong> Geben Sie Ihre persönlichen Daten ein (Name, E-Mail, Passwort).<br><strong>3.</strong> Bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen per E-Mail senden.<br><strong>4.</strong> Nach der Bestätigung können Sie sich anmelden und einkaufen.<br><br>Mit einem Konto können Sie Bestellungen verfolgen, Adressen speichern und vieles mehr.',
    category: 'Konto',
    sortOrder: 5,
    isActive: true,
  },
  {
    question: 'Was mache ich, wenn ich mein Passwort vergessen habe?',
    answer: 'Kein Problem! Sie können Ihr Passwort einfach zurücksetzen:<br><br><strong>1.</strong> Klicken Sie auf "Anmelden" und dann auf "Passwort vergessen".<br><strong>2.</strong> Geben Sie Ihre E-Mail-Adresse ein.<br><strong>3.</strong> Sie erhalten eine E-Mail mit einem Link zum Zurücksetzen des Passworts.<br><strong>4.</strong> Klicken Sie auf den Link und erstellen Sie ein neues Passwort.<br><br>Falls Sie keine E-Mail erhalten, überprüfen Sie bitte Ihren Spam-Ordner.',
    category: 'Konto',
    sortOrder: 6,
    isActive: true,
  },
  {
    question: 'Gibt es eine Mindestbestellmenge?',
    answer: 'Ja, wir haben eine Mindestbestellmenge für Lieferungen. Die genaue Mindestbestellmenge wird beim Bestellvorgang angezeigt und kann je nach Lieferadresse variieren.<br><br>Für Abholungen im Geschäft gibt es keine Mindestbestellmenge. Sie können auch jederzeit Produkte zu Ihrem Warenkorb hinzufügen, um die Mindestbestellmenge zu erreichen.',
    category: 'Bestellung',
    sortOrder: 7,
    isActive: true,
  },
  {
    question: 'Wie kann ich meine Lieferadresse ändern?',
    answer: 'Sie können Ihre Lieferadresse auf verschiedene Weise verwalten:<br><br><strong>• Während der Bestellung:</strong> Sie können eine neue Adresse eingeben oder eine gespeicherte Adresse auswählen.<br><strong>• In Ihrem Profil:</strong> Gehen Sie zu "Profil" → "Adressen" und fügen Sie neue Adressen hinzu oder bearbeiten Sie bestehende.<br><br>Sie können mehrere Adressen speichern und bei jeder Bestellung die gewünschte Adresse auswählen.',
    category: 'Lieferung',
    sortOrder: 8,
    isActive: true,
  },
  {
    question: 'Kann ich Produkte zu meinen Favoriten hinzufügen?',
    answer: 'Ja, absolut! Sie können Produkte zu Ihren Favoriten hinzufügen:<br><br><strong>1.</strong> Durchsuchen Sie unsere Produkte.<br><strong>2.</strong> Klicken Sie auf das Herz-Symbol auf einem Produkt.<br><strong>3.</strong> Das Produkt wird zu Ihren Favoriten hinzugefügt.<br><br>Sie können alle Ihre Favoriten über das "Favoriten"-Menü in der Navigation anzeigen. Von dort aus können Sie Produkte direkt zum Warenkorb hinzufügen.',
    category: 'Produkte',
    sortOrder: 9,
    isActive: true,
  },
  {
    question: 'Wie kann ich den Status meiner Bestellung verfolgen?',
    answer: 'Sie können den Status Ihrer Bestellung jederzeit einsehen:<br><br><strong>1.</strong> Melden Sie sich in Ihrem Konto an.<br><strong>2.</strong> Gehen Sie zu "Meine Bestellungen".<br><strong>3.</strong> Klicken Sie auf die gewünschte Bestellung, um Details anzuzeigen.<br><br>Sie sehen den aktuellen Status (z.B. "In Bearbeitung", "Versandt", "Geliefert") und erhalten E-Mail-Benachrichtigungen bei Statusänderungen.',
    category: 'Bestellung',
    sortOrder: 10,
    isActive: true,
  },
];

