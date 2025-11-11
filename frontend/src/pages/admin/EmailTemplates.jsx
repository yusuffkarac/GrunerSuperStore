import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import templateService from '../../services/templateService';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Switch from '../../components/common/Switch';

function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState(null);
  
  // Editor state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Variablen-Platzhalter-Mapping (für einfachen Modus)
  const variablePlaceholders = {
    firstName: '[Kundenname]',
    lastName: '[Kundennachname]',
    verificationCode: '[Bestätigungscode]',
    resetUrl: '[Passwort-Reset-Link]',
    shopUrl: '[Shop-Link]',
    orderNo: '[Bestellnummer]',
    orderDate: '[Bestelldatum]',
    cancelDate: '[Stornierungsdatum]',
    deliveryType: '[Lieferart]',
    address: '[Adresse]',
    subtotal: '[Zwischensumme]',
    discount: '[Rabatt]',
    deliveryFee: '[Liefergebühr]',
    total: '[Gesamtbetrag]',
    paymentType: '[Zahlungsart]',
    note: '[Notiz]',
    oldStatusText: '[Alter Status]',
    newStatusText: '[Neuer Status]',
    statusMessage: '[Statusnachricht]',
    itemCount: '[Artikelanzahl]',
    cancelReason: '[Stornierungsgrund]',
    customerMessage: '[Kundenmitteilung]',
    refundInfo: '[Rückerstattungsinfo]',
    customerName: '[Kundenname]',
    customerEmail: '[Kunden-E-Mail]',
    customerPhone: '[Kundentelefon]',
    adminOrderUrl: '[Admin-Bestelllink]',
    storeName: '[Ladenname]',
  };

  // Variablen in Platzhalter umwandeln (für einfachen Modus)
  const replaceVariablesWithPlaceholders = (text) => {
    let result = text;
    Object.entries(variablePlaceholders).forEach(([varName, placeholder]) => {
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
      result = result.replace(regex, placeholder);
      // Auch für Handlebars-Helper
      const helperRegex = new RegExp(`\\{\\{#if ${varName}\\}\\}`, 'g');
      result = result.replace(helperRegex, `[Wenn ${placeholder}]`);
      const endHelperRegex = new RegExp(`\\{\\{/if\\}\\}`, 'g');
      result = result.replace(endHelperRegex, '[/Wenn]');
    });
    // Verbleibende Variablen auch verstecken
    result = result.replace(/\{\{([^}]+)\}\}/g, '[Variable]');
    return result;
  };

  // Platzhalter in Variablen umwandeln (zum Speichern)
  const replacePlaceholdersWithVariables = (text) => {
    let result = text;
    // Platzhalter in Variablen umwandeln (in umgekehrter Reihenfolge, spezifischere zuerst)
    Object.entries(variablePlaceholders)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([varName, placeholder]) => {
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        result = result.replace(regex, `{{${varName}}}`);
        // Auch Helper umwandeln
        const helperRegex = new RegExp(`\\[Wenn ${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
        result = result.replace(helperRegex, `{{#if ${varName}}}`);
      });
    result = result.replace(/\[Wenn ([^\]]+)\]/g, '{{#if $1}}');
    result = result.replace(/\[\/Wenn\]/g, '{{/if}}');
    result = result.replace(/\[Variable\]/g, '{{variable}}');
    return result;
  };

  useEffect(() => {
    fetchTemplates();
    // Test email adresini localStorage'dan yükle
    const savedEmail = localStorage.getItem('templateTestEmail');
    if (savedEmail) {
      setTestEmail(savedEmail);
    }
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await templateService.getAllTemplates();
      setTemplates(response.data);
      
      // Erste Vorlage auswählen
      if (response.data.length > 0 && !selectedTemplate) {
        selectTemplate(response.data[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Vorlagen konnten nicht geladen werden');
      toast.error('Vorlagen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = async (template) => {
    try {
      setSelectedTemplate(template);
      // Im einfachen Modus in Platzhalter umwandeln, im normalen Modus direkt anzeigen
      const currentSubject = simpleMode ? replaceVariablesWithPlaceholders(template.subject) : template.subject;
      const currentBody = simpleMode ? replaceVariablesWithPlaceholders(template.body) : template.body;
      setSubject(currentSubject);
      setBody(currentBody);
      setShowPreview(false);
      setPreviewHtml('');
    } catch (err) {
      toast.error('Vorlage konnte nicht geladen werden');
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      setSaving(true);
      // Im einfachen Modus Platzhalter in Variablen umwandeln
      const finalSubject = simpleMode ? replacePlaceholdersWithVariables(subject.trim()) : subject.trim();
      const finalBody = simpleMode ? replacePlaceholdersWithVariables(body.trim()) : body.trim();
      
      await templateService.updateTemplate(selectedTemplate.key, {
        subject: finalSubject,
        body: finalBody,
      });
      
      toast.success('Vorlage erfolgreich gespeichert');
      
      // Vorlagenliste aktualisieren
      const updatedTemplates = templates.map((t) =>
        t.key === selectedTemplate.key
          ? { ...t, subject: finalSubject, body: finalBody, isCustomized: true }
          : t
      );
      setTemplates(updatedTemplates);
      setSelectedTemplate({ ...selectedTemplate, subject: finalSubject, body: finalBody, isCustomized: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vorlage konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedTemplate) return;
    
    if (!window.confirm('Möchten Sie diese Vorlage wirklich auf die Standardeinstellungen zurücksetzen?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await templateService.resetTemplate(selectedTemplate.key);
      const resetTemplate = response.data;
      
      setSubject(resetTemplate.subject);
      setBody(resetTemplate.body);
      setShowPreview(false);
      setPreviewHtml('');
      
      toast.success('Vorlage wurde auf Standardeinstellungen zurückgesetzt');
      
      // Vorlagenliste aktualisieren
      const updatedTemplates = templates.map((t) =>
        t.key === selectedTemplate.key
          ? { ...resetTemplate, isCustomized: false }
          : t
      );
      setTemplates(updatedTemplates);
      setSelectedTemplate({ ...resetTemplate, isCustomized: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vorlage konnte nicht zurückgesetzt werden');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;

    try {
      setPreviewing(true);
      // Im einfachen Modus Platzhalter in Variablen umwandeln
      const finalSubject = simpleMode ? replacePlaceholdersWithVariables(subject.trim()) : subject.trim();
      const finalBody = simpleMode ? replacePlaceholdersWithVariables(body.trim()) : body.trim();
      
      const response = await templateService.previewTemplate(selectedTemplate.key, {
        subject: finalSubject,
        body: finalBody,
      });
      
      setPreviewHtml(response.data.html);
      setShowPreview(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vorschau konnte nicht erstellt werden');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSimpleModeChange = (e) => {
    const newMode = e.target.checked;
    setSimpleMode(newMode);
    
    if (selectedTemplate) {
      // Inhalt aktualisieren, wenn Modus geändert wird
      if (newMode) {
        // Wechsel zum einfachen Modus: Variablen in Platzhalter umwandeln
        setSubject(replaceVariablesWithPlaceholders(subject));
        setBody(replaceVariablesWithPlaceholders(body));
      } else {
        // Wechsel zum normalen Modus: Platzhalter in Variablen umwandeln
        setSubject(replacePlaceholdersWithVariables(subject));
        setBody(replacePlaceholdersWithVariables(body));
      }
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplate) return;

    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    try {
      setSendingTest(true);
      // Basit modda placeholder'ları değişkenlere çevir
      const finalSubject = simpleMode ? replacePlaceholdersWithVariables(subject.trim()) : subject.trim();
      const finalBody = simpleMode ? replacePlaceholdersWithVariables(body.trim()) : body.trim();
      
      await templateService.sendTestEmail(selectedTemplate.key, {
        subject: finalSubject,
        body: finalBody,
        toEmail: testEmail.trim(),
      });
      
      // Email adresini localStorage'a kaydet
      localStorage.setItem('templateTestEmail', testEmail.trim());
      
      toast.success('Test-E-Mail erfolgreich gesendet');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test-E-Mail konnte nicht gesendet werden');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">E-Mail-Vorlagen</h1>
              <p className="text-gray-600 mt-2">
                Bearbeiten Sie E-Mail-Vorlagen. Verwenden Sie das Format <code className="bg-gray-200 px-1 rounded">{'{{variable}}'}</code> für Variablen.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                id="simple-mode"
                checked={simpleMode}
                onChange={handleSimpleModeChange}
                label="Einfacher Modus"
                color="green"
              />
              <span className="text-sm text-gray-500">
                {simpleMode ? 'Nur Texte bearbeiten' : 'Alle Funktionen aktiv'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Vorlagenliste */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vorlagen</h2>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.key}
                    onClick={() => selectTemplate(template)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedTemplate?.key === template.key
                        ? 'bg-green-100 text-green-900 border-2 border-green-500'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    {template.isCustomized && (
                      <span className="text-xs text-green-600">Angepasst</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hauptinhalt - Editor */}
          <div className="lg:col-span-3">
            {selectedTemplate ? (
              <div className="bg-white rounded-lg shadow">
                {/* Header */}
                <div className="border-b border-gray-200 p-6">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedTemplate.description}</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Subject Editor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-Mail-Betreff
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="E-Mail-Betreff..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Variablen: <code className="bg-gray-100 px-1 rounded">{'{{orderNo}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{firstName}}'}</code>, usw.
                    </p>
                  </div>

                  {/* Variablen-Panel - Im einfachen Modus ausblenden */}
                  {!simpleMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verfügbare Variablen
                      </label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.variables.map((variable) => (
                            <button
                              key={variable}
                              onClick={() => insertVariable(variable)}
                              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:border-green-500 transition-colors"
                              title={`{{${variable}}} hinzufügen`}
                            >
                              {`{{${variable}}}`}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          Klicken Sie auf eine Variable, um sie an der Cursor-Position einzufügen.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Einfacher Modus Information */}
                  {simpleMode && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Einfacher Modus aktiv:</strong> In diesem Modus können Sie nur Texte bearbeiten. 
                        Variablen werden automatisch beibehalten und als verständliche Texte wie <code className="bg-blue-100 px-1 rounded">[Kundenname]</code> angezeigt.
                      </p>
                    </div>
                  )}

                  {/* Body Editor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-Mail-Inhalt (HTML)
                    </label>
                    <textarea
                      id="body-editor"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={20}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                      placeholder="HTML-Inhalt..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {simpleMode ? (
                        <>
                          Sie können Texte bearbeiten. Platzhalter wie <code className="bg-gray-100 px-1 rounded">[Kundenname]</code> werden 
                          automatisch in Variablen umgewandelt.
                        </>
                      ) : (
                        <>
                          Verwenden Sie Handlebars-Syntax: <code className="bg-gray-100 px-1 rounded">{'{{variable}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{#if condition}}'}</code>, usw.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Test E-Mail */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Test-E-Mail senden
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="test@example.com"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                      <button
                        onClick={handleSendTestEmail}
                        disabled={sendingTest || !subject.trim() || !body.trim() || !testEmail.trim()}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {sendingTest ? 'Wird gesendet...' : 'Senden'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Test-E-Mail mit Mock-Daten an die angegebene Adresse senden
                    </p>
                  </div>

                  {/* Aktionen */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handlePreview}
                      disabled={previewing || !subject.trim() || !body.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {previewing ? 'Vorschau wird erstellt...' : 'Vorschau'}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !subject.trim() || !body.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Wird gespeichert...' : 'Speichern'}
                    </button>
                    {selectedTemplate.isCustomized && (
                      <button
                        onClick={handleReset}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? 'Wird zurückgesetzt...' : 'Auf Standard zurücksetzen'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">Bitte wählen Sie eine Vorlage aus</p>
              </div>
            )}

            {/* Vorschau-Modal */}
            {showPreview && previewHtml && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
                  onClick={() => setShowPreview(false)}
                />
                {/* Modal */}
                <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
                  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
                    <div className="border-b border-gray-200 p-4 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">E-Mail-Vorschau</h3>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-6">
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailTemplates;

