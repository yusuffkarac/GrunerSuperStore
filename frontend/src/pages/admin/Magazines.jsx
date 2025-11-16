import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { HiPlus, HiPencil, HiTrash, HiEye, HiCheck, HiX, HiExclamation } from 'react-icons/hi';
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
    startDate: '',
    endDate: '',
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
      if (editingMagazine) {
        await magazineService.updateMagazine(editingMagazine.id, formData);
        toast.success('Magazin erfolgreich aktualisiert');
      } else {
        await magazineService.createMagazine(formData);
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
      startDate: magazine.startDate.split('T')[0],
      endDate: magazine.endDate.split('T')[0],
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
      startDate: '',
      endDate: '',
      isActive: true,
    });
    setEditingMagazine(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div className="">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Wöchentliche Magazine</h1>
          <p className="mt-2 text-gray-600">Verwalten Sie PDF-Magazine mit Flipbook-Ansicht</p>
          
          {/* Uyarı: Bugün için 2+ aktif dergi varsa */}
          {activeTodayCount >= 2 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <HiExclamation className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800">
                  Mehrere aktive Magazine heute
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Es sind heute {activeTodayCount} aktive Magazine aktiv. Benutzer sehen beim Klick auf das Magazin-Symbol eine Auswahl.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                    <tr key={magazine.id} className="hover:bg-gray-50">
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
                            className="text-blue-600 hover:text-blue-900"
                            title="PDF anzeigen"
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
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {editingMagazine ? 'Magazin bearbeiten' : 'Neues Magazin erstellen'}
                </h2>

                <form onSubmit={handleSubmit}>
                  {/* Title */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titel *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="z.B. Wochenangebote KW 47"
                      required
                    />
                  </div>

                  {/* PDF Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PDF-Datei *
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={uploading}
                    />
                    {uploading && <p className="mt-2 text-sm text-gray-500">Hochladen...</p>}
                    {formData.pdfUrl && !uploading && (
                      <p className="mt-2 text-sm text-green-600">✓ PDF hochgeladen</p>
                    )}
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Startdatum *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enddatum *
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="mb-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Magazin aktiv schalten</span>
                    </label>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || !formData.pdfUrl}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editingMagazine ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Magazines;
