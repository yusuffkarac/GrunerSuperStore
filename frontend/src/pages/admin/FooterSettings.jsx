import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { HiRefresh, HiDownload, HiUpload } from 'react-icons/hi';
import settingsService from '../../services/settingsService';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import HelpTooltip from '../../components/common/HelpTooltip';
import AlertDialog from '../../components/common/AlertDialog';
import { useModalScroll } from '../../hooks/useModalScroll';

// Footer Ayarları Sayfası
function FooterSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [editingBlock, setEditingBlock] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState(null);
  const fileInputRef = useRef(null);
  
  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'OK',
    cancelText: 'Abbrechen',
  });

  // Ayarları yükle
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsService.getSettings();
      const loadedSettings = response.data.settings;
      
      if (loadedSettings?.footerSettings?.blocks) {
        setBlocks(loadedSettings.footerSettings.blocks);
      } else {
        setBlocks([]);
      }
    } catch (err) {
      setError(err.message || 'Fehler beim Laden der Einstellungen');
      toast.error(err.message || 'Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  // Blok ekle
  const handleAddBlock = () => {
    const newBlock = {
      id: `block-${Date.now()}`,
      title: '',
      items: [],
    };
    setBlocks([...blocks, newBlock]);
    setEditingBlock(newBlock.id);
  };

  // Blok sil
  const handleDeleteBlock = (blockId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Block löschen',
      message: 'Möchten Sie diesen Block wirklich löschen?',
      onConfirm: () => {
        setBlocks(blocks.filter(b => b.id !== blockId));
      },
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
    });
  };

  // Blok başlığını güncelle
  const handleUpdateBlockTitle = (blockId, title) => {
    setBlocks(blocks.map(b => 
      b.id === blockId ? { ...b, title } : b
    ));
  };

  // Item ekle
  const handleAddItem = (blockId) => {
    const newItem = {
      id: `item-${Date.now()}`,
      title: '',
      type: 'link',
      url: '',
      popupTitle: '',
      popupContent: '',
    };
    setBlocks(blocks.map(b => 
      b.id === blockId ? { ...b, items: [...b.items, newItem] } : b
    ));
    setEditingItem({ blockId, itemId: newItem.id });
    setShowItemModal(true);
  };

  // Item düzenle
  const handleEditItem = (blockId, itemId) => {
    setEditingItem({ blockId, itemId });
    setShowItemModal(true);
  };

  // Item sil
  const handleDeleteItem = (blockId, itemId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Link löschen',
      message: 'Möchten Sie diesen Link wirklich löschen?',
      onConfirm: () => {
        setBlocks(blocks.map(b => 
          b.id === blockId 
            ? { ...b, items: b.items.filter(i => i.id !== itemId) }
            : b
        ));
      },
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
    });
  };

  // Item kaydet
  const handleSaveItem = (itemData) => {
    const { blockId, itemId } = editingItem;
    setBlocks(blocks.map(b => 
      b.id === blockId 
        ? { 
            ...b, 
            items: b.items.map(i => 
              i.id === itemId ? { ...itemData, id: itemId } : i
            )
          }
        : b
    ));
    setShowItemModal(false);
    setEditingItem(null);
  };

  // Kaydet
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validasyon
      for (const block of blocks) {
        if (!block.title || block.title.trim() === '') {
          toast.error('Bitte geben Sie für alle Blöcke einen Titel ein');
          return;
        }
        for (const item of block.items) {
          if (!item.title || item.title.trim() === '') {
            toast.error('Bitte geben Sie für alle Links einen Titel ein');
            return;
          }
          if (item.type === 'link' && (!item.url || item.url.trim() === '')) {
            toast.error('Bitte geben Sie für alle Links eine URL ein');
            return;
          }
          if (item.type === 'popup' && (!item.popupTitle || item.popupTitle.trim() === '')) {
            toast.error('Bitte geben Sie für alle Popups einen Titel ein');
            return;
          }
          if (item.type === 'popup' && (!item.popupContent || item.popupContent.trim() === '')) {
            toast.error('Bitte geben Sie für alle Popups einen Inhalt ein');
            return;
          }
        }
      }

      await settingsService.updateSettings({
        footerSettings: {
          blocks: blocks,
        },
      });

      toast.success('Footer-Einstellungen erfolgreich gespeichert');
    } catch (err) {
      console.error('Kaydetme hatası:', err);
      toast.error(err.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  // Export Footer Settings to JSON
  const handleExport = () => {
    try {
      const exportData = {
        blocks: blocks,
      };
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `footer_settings_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Footer-Einstellungen erfolgreich exportiert');
    } catch (error) {
      console.error('Export-Fehler:', error);
      toast.error('Fehler beim Exportieren der Footer-Einstellungen');
    }
  };

  // Import Footer Settings from JSON file
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Bitte wählen Sie eine JSON-Datei aus');
      return;
    }

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      if (!importedData || typeof importedData !== 'object') {
        toast.error('Ungültiges Dateiformat. Erwartet wird ein Footer-Einstellungen-Objekt.');
        return;
      }

      if (!Array.isArray(importedData.blocks)) {
        toast.error('Ungültiges Format. "blocks" muss ein Array sein.');
        return;
      }

      setImportData(importedData);
      setShowImportModal(true);
      e.target.value = '';
    } catch (error) {
      console.error('Import-Fehler:', error);
      toast.error('Fehler beim Lesen der Datei. Bitte überprüfen Sie das Format.');
    }
  };

  const handleImportConfirm = async () => {
    if (!importData) return;

    try {
      setImporting(true);
      setBlocks(importData.blocks || []);
      
      await settingsService.updateSettings({
        footerSettings: {
          blocks: importData.blocks || [],
        },
      });

      toast.success('Footer-Einstellungen erfolgreich importiert und gespeichert');
      setShowImportModal(false);
      setImportData(null);
    } catch (error) {
      console.error('Import-Fehler:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Importieren der Footer-Einstellungen');
    } finally {
      setImporting(false);
    }
  };

  // Default ayarlara sıfırla
  const handleResetToDefaults = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Auf Standardeinstellungen zurücksetzen',
      message: 'Möchten Sie die Footer-Einstellungen wirklich auf die Standardeinstellungen zurücksetzen? Alle aktuellen Änderungen gehen verloren.',
      onConfirm: async () => {
        try {
          setResetting(true);
          const response = await settingsService.resetFooterToDefaults();
          
          if (response.data?.settings?.footerSettings?.blocks) {
            setBlocks(response.data.settings.footerSettings.blocks);
            toast.success('Footer-Einstellungen erfolgreich auf Standardeinstellungen zurückgesetzt');
          } else {
            toast.error('Fehler beim Zurücksetzen der Einstellungen');
          }
        } catch (err) {
          console.error('Reset hatası:', err);
          toast.error(err.message || 'Fehler beim Zurücksetzen der Einstellungen');
        } finally {
          setResetting(false);
        }
      },
      confirmText: 'Zurücksetzen',
      cancelText: 'Abbrechen',
    });
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Footer-Einstellungen
            <HelpTooltip content="Verwalten Sie die Footer-Blöcke und Links. Sie können beliebig viele Blöcke erstellen und jedem Block Links oder Popups hinzufügen." />
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie die Footer-Struktur Ihrer Website
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={handleAddBlock}
            className="px-4 py-2 sm:px-6 sm:py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Block hinzufügen</span>
            <span className="sm:hidden">Hinzufügen</span>
          </button>

          <button
            onClick={handleExport}
            disabled={blocks.length === 0}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-xs sm:text-sm"
            title="Footer-Einstellungen exportieren"
          >
            <HiDownload className="w-4 h-4" />
            <span className="hidden sm:inline">Exportieren</span>
            <span className="sm:hidden">Export</span>
          </button>

          <label className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer">
            <HiUpload className="w-4 h-4" />
            <span className="hidden sm:inline">Importieren</span>
            <span className="sm:hidden">Import</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetToDefaults}
            disabled={resetting}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-xs sm:text-sm"
            title="Auf Standardeinstellungen zurücksetzen"
          >
            <HiRefresh className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{resetting ? 'Zurücksetzen...' : 'Zurücksetzen'}</span>
            <span className="sm:hidden">{resetting ? '...' : 'Reset'}</span>
          </button>

          <div className="ml-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 sm:px-8 sm:py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="hidden sm:inline">{saving ? 'Wird gespeichert...' : 'Änderungen speichern'}</span>
              <span className="sm:hidden">{saving ? 'Speichern...' : 'Speichern'}</span>
            </button>
          </div>
        </div>

        {/* Blöcke */}
        {blocks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 mb-2 text-lg font-medium">Noch keine Blöcke vorhanden</p>
            <p className="text-gray-500 mb-6 text-sm">
              Sie können Standard-Blöcke laden oder eigene erstellen
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleResetToDefaults}
                disabled={resetting}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <HiRefresh className={`w-5 h-5 ${resetting ? 'animate-spin' : ''}`} />
                {resetting ? 'Wird geladen...' : 'Standard-Blöcke laden'}
              </button>
              <button
                onClick={handleAddBlock}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Eigene Blöcke erstellen
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {blocks.map((block, blockIndex) => (
              <div key={block.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editingBlock === block.id ? (
                        <input
                          type="text"
                          value={block.title}
                          onChange={(e) => handleUpdateBlockTitle(block.id, e.target.value)}
                          onBlur={() => setEditingBlock(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingBlock(null);
                            }
                          }}
                          className="text-lg font-semibold text-gray-900 bg-white border border-primary-300 rounded px-3 py-1 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Block-Titel eingeben"
                          autoFocus
                        />
                      ) : (
                        <h2 
                          className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-primary-700"
                          onClick={() => setEditingBlock(block.id)}
                        >
                          {block.title || 'Block-Titel (klicken zum Bearbeiten)'}
                        </h2>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleAddItem(block.id)}
                        className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                        title="Link hinzufügen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Block löschen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {block.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-4">Noch keine Links in diesem Block</p>
                      <button
                        onClick={() => handleAddItem(block.id)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        Link hinzufügen
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {block.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-900">{item.title}</span>
                              <span className={`px-2 py-1 text-xs rounded ${
                                item.type === 'link' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {item.type === 'link' ? 'Link' : 'Popup'}
                              </span>
                            </div>
                            {item.type === 'link' && item.url && (
                              <p className="text-xs text-gray-500 mt-1">{item.url}</p>
                            )}
                            {item.type === 'popup' && item.popupTitle && (
                              <p className="text-xs text-gray-500 mt-1">Popup: {item.popupTitle}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditItem(block.id, item.id)}
                              className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                              title="Bearbeiten"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(block.id, item.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Löschen"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddItem(block.id)}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg font-medium hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Weitere Links hinzufügen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type="confirm"
          onConfirm={confirmDialog.onConfirm}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
        />

        {/* Item Modal */}
        {showItemModal && editingItem && (
          <ItemModal
            block={blocks.find(b => b.id === editingItem.blockId)}
            item={blocks.find(b => b.id === editingItem.blockId)?.items.find(i => i.id === editingItem.itemId)}
            onSave={handleSaveItem}
            onClose={() => {
              setShowItemModal(false);
              setEditingItem(null);
            }}
            isOpen={showItemModal}
          />
        )}

        {/* Import Modal */}
        {showImportModal && importData && (
          <ImportModal
            importData={importData}
            importing={importing}
            onConfirm={handleImportConfirm}
            onClose={() => {
              setShowImportModal(false);
              setImportData(null);
            }}
            isOpen={showImportModal}
          />
        )}
    </div>
  );
}

// Import Modal Component
function ImportModal({ importData, importing, onConfirm, onClose, isOpen }) {
  useModalScroll(isOpen);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Footer-Einstellungen importieren</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{importData.blocks?.length || 0} Block(s)</strong> werden importiert und automatisch gespeichert.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Vorschau der zu importierenden Blöcke:</h4>
            <div className="space-y-2 text-sm">
              {importData.blocks?.slice(0, 10).map((block, index) => (
                <div key={index} className="border-b border-gray-100 pb-2 last:border-0">
                  <p className="font-medium text-gray-900">{block.title || `Block ${index + 1}`}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {block.items?.length || 0} Link(s)
                  </p>
                </div>
              ))}
              {importData.blocks?.length > 10 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  ... und {importData.blocks.length - 10} weitere Block(s)
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={importing}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Importiere...
                </>
              ) : (
                'Importieren & Speichern'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Item Modal Component
function ItemModal({ block, item, onSave, onClose, isOpen }) {
  // Modal scroll yönetimi
  useModalScroll(isOpen);

  const [formData, setFormData] = useState({
    title: item?.title || '',
    type: item?.type || 'link',
    url: item?.url || '',
    popupTitle: item?.popupTitle || '',
    popupContent: item?.popupContent || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || formData.title.trim() === '') {
      toast.error('Bitte geben Sie einen Titel ein');
      return;
    }
    
    if (formData.type === 'link' && (!formData.url || formData.url.trim() === '')) {
      toast.error('Bitte geben Sie eine URL ein');
      return;
    }
    
    if (formData.type === 'popup') {
      if (!formData.popupTitle || formData.popupTitle.trim() === '') {
        toast.error('Bitte geben Sie einen Popup-Titel ein');
        return;
      }
      if (!formData.popupContent || formData.popupContent.trim() === '') {
        toast.error('Bitte geben Sie einen Popup-Inhalt ein');
        return;
      }
    }

    onSave({
      ...formData,
      id: item?.id || `item-${Date.now()}`,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              {item ? 'Link bearbeiten' : 'Neuer Link'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="z.B. Über uns"
              required
            />
          </div>

          {/* Typ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Typ <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="link"
                  checked={formData.type === 'link'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mr-2"
                />
                <span>Link</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="popup"
                  checked={formData.type === 'popup'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mr-2"
                />
                <span>Popup</span>
              </label>
            </div>
          </div>

          {/* URL (Link tipinde) */}
          {formData.type === 'link' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="z.B. /uber-uns oder https://example.com"
                required={formData.type === 'link'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Relative URLs beginnen mit / (z.B. /uber-uns), externe URLs mit http:// oder https://
              </p>
            </div>
          )}

          {/* Popup Ayarları */}
          {formData.type === 'popup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Popup-Titel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.popupTitle}
                  onChange={(e) => setFormData({ ...formData, popupTitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="z.B. Datenschutzerklärung"
                  required={formData.type === 'popup'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Popup-Inhalt <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.popupContent}
                  onChange={(e) => setFormData({ ...formData, popupContent: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={8}
                  placeholder="Geben Sie hier den Inhalt des Popups ein..."
                  required={formData.type === 'popup'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  HTML ist erlaubt (z.B. &lt;strong&gt;, &lt;br&gt;, &lt;a&gt;)
                </p>
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FooterSettings;

