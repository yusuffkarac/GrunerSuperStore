import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { HiPlus, HiPencil, HiTrash, HiEye, HiCheck, HiX, HiExclamation } from 'react-icons/hi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { de } from 'date-fns/locale';
import magazineService from '../../services/magazineService';
import adminService from '../../services/adminService';

const Magazines = () => {
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMagazine, setEditingMagazine] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTodayCount, setActiveTodayCount] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    pdfUrl: '',
    startDate: null,
    endDate: null,
    isActive: true,
  });

  useEffect(() => {
    loadMagazines();
  }, []);

  const loadMagazines = async () => {
    try {
      setLoading(true);
      const response = await magazineService.getAllMagazines();
      const allMagazines = response.data.magazines;
      setMagazines(allMagazines);
      
      // Bugün için aktif olan dergileri kontrol et
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeToday = allMagazines.filter(magazine => {
        if (!magazine.isActive) return false;
        
        const startDate = new Date(magazine.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(magazine.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        return startDate <= today && endDate >= today;
      });
      
      setActiveTodayCount(activeToday.length);
    } catch (error) {
      console.error('Fehler beim Laden der Magazine:', error);
      toast.error('Fehler beim Laden der Magazine');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate PDF
    if (file.type !== 'application/pdf') {
      toast.error('Nur PDF-Dateien sind erlaubt');
      return;
    }

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max 50MB)');
      return;
    }

    try {
      setUploading(true);
      const uploadedUrl = await adminService.uploadFile(file, 'magazines');
      setFormData(prev => ({ ...prev, pdfUrl: uploadedUrl }));
      toast.success('PDF erfolgreich hochgeladen');
    } catch (error) {
      console.error('Upload-Fehler:', error);
      toast.error('Fehler beim Hochladen der PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.pdfUrl || !formData.startDate || !formData.endDate) {
      toast.error('Bitte füllen Sie alle Felder aus');
      return;
    }

    try {
      // Convert Date objects to ISO strings for API
      const submitData = {
        ...formData,
        startDate: formData.startDate ? formData.startDate.toISOString().split('T')[0] : '',
        endDate: formData.endDate ? formData.endDate.toISOString().split('T')[0] : '',
      };

      if (editingMagazine) {
        await magazineService.updateMagazine(editingMagazine.id, submitData);
        toast.success('Magazin erfolgreich aktualisiert');
      } else {
        await magazineService.createMagazine(submitData);
        toast.success('Magazin erfolgreich erstellt');
      }

      setShowModal(false);
      resetForm();
      loadMagazines();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error(error.response?.data?.message || 'Ein Fehler ist aufgetreten');
    }
  };

  const handleEdit = (magazine) => {
    setEditingMagazine(magazine);
    setFormData({
      title: magazine.title,
      pdfUrl: magazine.pdfUrl,
      startDate: magazine.startDate ? new Date(magazine.startDate) : null,
      endDate: magazine.endDate ? new Date(magazine.endDate) : null,
      isActive: magazine.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Möchten Sie dieses Magazin wirklich löschen?')) return;

    try {
      await magazineService.deleteMagazine(id);
      toast.success('Magazin erfolgreich gelöscht');
      loadMagazines();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Fehler beim Löschen des Magazins');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await magazineService.toggleActive(id);
      toast.success('Status erfolgreich geändert');
      loadMagazines();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Fehler beim Ändern des Status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      pdfUrl: '',
      startDate: null,
      endDate: null,
      isActive: true,
    });
    setEditingMagazine(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  // Derginin durumunu kontrol et ve uygun arka plan rengini döndür
  const getMagazineStatusClass = (magazine) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(magazine.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    const startDate = new Date(magazine.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    // Geçmiş dergi: endDate bugünden önce
    if (endDate < today) {
      return 'bg-red-50'; // Hafif kırmızı
    }
    
    // Aktif dergi: isActive true VE bugün startDate ile endDate arasında
    if (magazine.isActive && startDate <= today && endDate >= today) {
      return 'bg-green-50'; // Hafif yeşil
    }
    
    // Diğer durumlar için varsayılan
    return '';
  };

  return (
    <div className="pb-4 md:pb-0">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 px-4 md:px-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Wöchentliche Magazine</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">Verwalten Sie PDF-Magazine mit Flipbook-Ansicht</p>
          
          {/* Uyarı: Bugün için 2+ aktif dergi varsa */}
          {activeTodayCount >= 2 && (
            <div className="mt-4 p-3 md:p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <HiExclamation className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800">
                  Mehrere aktive Magazine heute
                </h3>
                <p className="text-xs md:text-sm text-yellow-700 mt-1">
                  Es sind heute {activeTodayCount} aktive Magazine aktiv. Benutzer sehen beim Klick auf das Magazin-Symbol eine Auswahl.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="mb-6 px-4 md:px-0">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm md:text-base"
          >
            <HiPlus className="mr-2" />
            Neues Magazin
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Laden...</p>
          </div>
        ) : magazines.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">Keine Magazine vorhanden</p>
          </div>
        ) : (
          <>
            {/* Desktop: Table View */}
            <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Titel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Startdatum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Enddatum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {magazines.map((magazine) => (
                      <tr key={magazine.id} className={`hover:bg-gray-50 ${getMagazineStatusClass(magazine)}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{magazine.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(magazine.startDate)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(magazine.endDate)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(magazine.id)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              magazine.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {magazine.isActive ? (
                              <>
                                <HiCheck className="mr-1" /> Aktiv
                              </>
                            ) : (
                              <>
                                <HiX className="mr-1" /> Inaktiv
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <a
                              href={magazine.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 hidden"
                              title="PDF anzeigen"
                              style={{ display: 'none' }}
                            >
                              <HiEye className="h-5 w-5" />
                            </a>
                            <button
                              onClick={() => handleEdit(magazine)}
                              className="text-emerald-600 hover:text-emerald-900"
                              title="Bearbeiten"
                            >
                              <HiPencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(magazine.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Löschen"
                            >
                              <HiTrash className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: Card View */}
            <div className="md:hidden space-y-4">
              {magazines.map((magazine) => {
                const statusClass = getMagazineStatusClass(magazine);
                return (
                <div key={magazine.id} className={`${statusClass || 'bg-white'} shadow-md rounded-lg p-4`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{magazine.title}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Startdatum:</span>
                          <span>{formatDate(magazine.startDate)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-24">Enddatum:</span>
                          <span>{formatDate(magazine.endDate)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(magazine.id)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                        magazine.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {magazine.isActive ? (
                        <>
                          <HiCheck className="mr-1" /> Aktiv
                        </>
                      ) : (
                        <>
                          <HiX className="mr-1" /> Inaktiv
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(magazine)}
                      className="flex items-center px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Bearbeiten"
                    >
                      <HiPencil className="h-4 w-4 mr-1" />
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(magazine.id)}
                      className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Löschen"
                    >
                      <HiTrash className="h-4 w-4 mr-1" />
                      Löschen
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl mx-4 flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {editingMagazine ? 'Magazin bearbeiten' : 'Neues Magazin erstellen'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {editingMagazine ? 'Magazin-Informationen aktualisieren' : 'Erstellen Sie ein neues PDF-Magazin'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    aria-label="Schließen"
                  >
                    <HiX className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Titel <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                      placeholder="z.B. Wochenangebote KW 47"
                      required
                    />
                  </div>

                  {/* PDF Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      PDF-Datei <span className="text-red-500">*</span>
                    </label>
                    <label className="relative block">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                        id="pdf-upload-input"
                      />
                      <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <svg className="h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700 truncate">
                                {uploading ? 'Wird hochgeladen...' : formData.pdfUrl ? 'Datei ausgewählt' : 'PDF-Datei auswählen'}
                              </span>
                              {!formData.pdfUrl && !uploading && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    document.getElementById('pdf-upload-input')?.click();
                                  }}
                                  className="px-3 py-1 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors shadow-sm flex-shrink-0"
                                >
                                  Durchsuchen
                                </button>
                              )}
                            </div>
                            {!formData.pdfUrl && !uploading && (
                              <span className="text-xs text-gray-500 mt-0.5 block">
                                Klicken Sie hier oder ziehen Sie eine Datei hierher
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                    {uploading && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                        <span className="font-medium">Hochladen...</span>
                      </div>
                    )}
                    {formData.pdfUrl && !uploading && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                        <HiCheck className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">PDF erfolgreich hochgeladen</span>
                      </div>
                    )}
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Startdatum <span className="text-red-500">*</span>
                      </label>
                      <DatePicker
                        selected={formData.startDate}
                        onChange={(date) => setFormData({ ...formData, startDate: date })}
                        dateFormat="dd/MM/yyyy"
                        locale={de}
                        placeholderText="dd/MM/yyyy"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                        wrapperClassName="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Enddatum <span className="text-red-500">*</span>
                      </label>
                      <DatePicker
                        selected={formData.endDate}
                        onChange={(date) => setFormData({ ...formData, endDate: date })}
                        dateFormat="dd/MM/yyyy"
                        locale={de}
                        placeholderText="dd/MM/yyyy"
                        minDate={formData.startDate}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                        wrapperClassName="w-full"
                        required
                      />
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded transition-all cursor-pointer"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                          Magazin aktiv schalten
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Aktive Magazine werden auf der Website angezeigt
                        </p>
                      </div>
                    </label>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-white hover:border-gray-400 transition-all font-medium shadow-sm"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={uploading || !formData.pdfUrl}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md hover:shadow-lg disabled:hover:shadow-md"
                  >
                    {uploading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        {editingMagazine ? 'Wird aktualisiert...' : 'Wird erstellt...'}
                      </span>
                    ) : (
                      editingMagazine ? 'Aktualisieren' : 'Erstellen'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Magazines;
