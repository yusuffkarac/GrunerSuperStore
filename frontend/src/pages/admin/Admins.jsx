import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFilter, FiUser, FiEye, FiX, FiMail, FiPlus, FiEdit2, FiTrash2, FiShield } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { useAlert } from '../../contexts/AlertContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { cleanRequestData } from '../../utils/requestUtils';

function Admins() {
  const { showConfirm } = useAlert();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 20;

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    password: '',
    role: 'admin',
  });
  const [formErrors, setFormErrors] = useState({});

  // Verileri yükle
  useEffect(() => {
    loadAdmins();
  }, [currentPage, searchQuery, roleFilter, sortBy, sortOrder]);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
      };

      if (searchQuery) params.search = searchQuery;
      if (roleFilter) params.role = roleFilter;

      const response = await adminService.getAdmins(params);
      setAdmins(response.data.admins || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Administratoren konnten nicht geladen werden');
      console.error('Admin yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Admin detayını aç
  const openAdminDetail = async (admin) => {
    try {
      const response = await adminService.getAdminById(admin.id);
      setSelectedAdmin(response.data.admin);
      setShowModal(true);
    } catch (error) {
      toast.error('Administratordetails konnten nicht geladen werden');
      console.error('Admin detay hatası:', error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAdmin(null);
  };

  // Form modal aç/kapat
  const openFormModal = (admin = null) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        firstName: admin.firstName || '',
        email: admin.email || '',
        password: '',
        role: admin.role || 'admin',
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        firstName: '',
        email: '',
        password: '',
        role: 'admin',
      });
    }
    setFormErrors({});
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingAdmin(null);
    setFormData({
      firstName: '',
      email: '',
      password: '',
      role: 'admin',
    });
    setFormErrors({});
  };

  // Form validasyonu
  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'Vorname ist erforderlich';
    }

    if (!formData.email.trim()) {
      errors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Ungültige E-Mail-Adresse';
    }

    if (!editingAdmin && !formData.password) {
      errors.password = 'Passwort ist erforderlich';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'Passwort muss mindestens 8 Zeichen lang sein';
    } else if (formData.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben und eine Zahl enthalten';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        firstName: formData.firstName.trim(),
        email: formData.email.trim(),
        role: formData.role,
      };

      if (formData.password) {
        submitData.password = formData.password;
      }

      // Boş string'leri, null ve undefined değerleri temizle
      const cleanedData = cleanRequestData(submitData);

      if (editingAdmin) {
        await adminService.updateAdmin(editingAdmin.id, cleanedData);
        toast.success('Administrator erfolgreich aktualisiert');
      } else {
        await adminService.createAdmin(cleanedData);
        toast.success('Administrator erfolgreich erstellt');
      }

      closeFormModal();
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern');
      console.error('Admin kaydetme hatası:', error);
    }
  };

  // Admin sil
  const handleDeleteAdmin = async (admin) => {
    const confirmed = await showConfirm(
      `Möchten Sie "${admin.firstName}" wirklich löschen?`,
      { title: 'Administrator löschen' }
    );

    if (confirmed) {
      try {
        await adminService.deleteAdmin(admin.id);
        toast.success('Administrator erfolgreich gelöscht');
        loadAdmins();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Fehler beim Löschen');
      }
    }
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setCurrentPage(1);
  };

  // Aktif filtre sayısı
  const activeFilterCount = [
    searchQuery,
    roleFilter,
  ].filter(Boolean).length;

  if (loading && admins.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Administratoren</h1>
          <p className="text-gray-600 mt-0.5 md:mt-1 text-xs md:text-base">
            {total} {total === 1 ? 'Administrator' : 'Administratoren'} insgesamt
          </p>
        </div>
        <button
          onClick={() => openFormModal()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
        >
          <FiPlus className="w-4 h-4" />
          <span>Neuer Administrator</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 space-y-3 md:space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Name, E-Mail suchen..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-700 hover:text-gray-900"
          >
            <FiFilter size={16} className="md:w-[18px] md:h-[18px]" />
            Filter {activeFilterCount > 0 && (
              <span className="bg-green-600 text-white text-xs px-1.5 md:px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs md:text-sm text-red-600 hover:text-red-700"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200"
            >
              {/* Rolle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rolle
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Alle</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              {/* Sortierung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sortierung
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="createdAt-desc">Neueste zuerst</option>
                  <option value="createdAt-asc">Älteste zuerst</option>
                  <option value="firstName-asc">Vorname A-Z</option>
                  <option value="firstName-desc">Vorname Z-A</option>
                  <option value="email-asc">E-Mail A-Z</option>
                  <option value="email-desc">E-Mail Z-A</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Admins Table/Cards */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse">Lädt...</div>
          </div>
        ) : admins.length === 0 ? (
          <EmptyState
            icon={FiUser}
            title="Keine Administratoren gefunden"
            message="Es gibt noch keine Administratoren oder passen Sie die Filter an."
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Administrator
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      E-Mail
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Rolle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Erstellt
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-green-700 font-semibold">
                              {admin.firstName?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {admin.firstName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <FiMail size={14} />
                          {admin.email}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
                          admin.role === 'superadmin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          <FiShield size={12} />
                          {admin.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(admin.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAdminDetail(admin)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Details anzeigen"
                          >
                            <FiEye size={18} />
                          </button>
                          <button
                            onClick={() => openFormModal(admin)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Bearbeiten"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {admins.map((admin) => (
                <div key={admin.id} className="p-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Avatar */}
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 font-semibold text-xs">
                        {admin.firstName?.[0]}
                      </span>
                    </div>
                    
                    {/* Name & Email */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-xs text-gray-900 truncate">
                          {admin.firstName}
                        </div>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded flex-shrink-0 ${
                          admin.role === 'superadmin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          <FiShield size={10} />
                          <span className="hidden sm:inline">{admin.role === 'superadmin' ? 'Superadmin' : 'Admin'}</span>
                          <span className="sm:hidden">{admin.role === 'superadmin' ? 'SA' : 'A'}</span>
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        <FiMail size={10} />
                        <span className="truncate">{admin.email}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Date & Actions */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openAdminDetail(admin)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Details"
                      >
                        <FiEye size={14} />
                      </button>
                      <button
                        onClick={() => openFormModal(admin)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Löschen"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 md:gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-2.5 md:px-4 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Zurück
          </button>
          <span className="px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-2.5 md:px-4 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Weiter
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showModal && selectedAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Administratordetails</h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorname
                  </label>
                  <p className="text-gray-900">{selectedAdmin.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail
                  </label>
                  <p className="text-gray-900">{selectedAdmin.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rolle
                  </label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-sm rounded ${
                    selectedAdmin.role === 'superadmin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    <FiShield size={14} />
                    {selectedAdmin.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Erstellt am
                  </label>
                  <p className="text-gray-900">
                    {new Date(selectedAdmin.createdAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aktualisiert am
                  </label>
                  <p className="text-gray-900">
                    {new Date(selectedAdmin.updatedAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={closeFormModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAdmin ? 'Administrator bearbeiten' : 'Neuer Administrator'}
                </h2>
                <button
                  onClick={closeFormModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      formErrors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passwort {editingAdmin ? '(leer lassen, um nicht zu ändern)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.password && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rolle
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {editingAdmin ? 'Aktualisieren' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Admins;

