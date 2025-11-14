import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import settingsService from '../../services/settingsService';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import HelpTooltip from '../../components/common/HelpTooltip';
import { useModalScroll } from '../../hooks/useModalScroll';

// Footer Ayarları Sayfası
function FooterSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [editingBlock, setEditingBlock] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);

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
    if (window.confirm('Möchten Sie diesen Block wirklich löschen?')) {
      setBlocks(blocks.filter(b => b.id !== blockId));
    }
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
    if (window.confirm('Möchten Sie diesen Link wirklich löschen?')) {
      setBlocks(blocks.map(b => 
        b.id === blockId 
          ? { ...b, items: b.items.filter(i => i.id !== itemId) }
          : b
      ));
    }
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
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={handleAddBlock}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Block hinzufügen
          </button>

          <div className="ml-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
          </div>
        </div>

        {/* Blöcke */}
        {blocks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 mb-4">Noch keine Blöcke vorhanden</p>
            <button
              onClick={handleAddBlock}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Ersten Block hinzufügen
            </button>
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

