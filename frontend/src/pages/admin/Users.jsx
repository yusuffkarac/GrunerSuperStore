import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFilter, FiUsers, FiEye, FiCheck, FiXCircle, FiX, FiMail, FiPhone, FiShoppingBag, FiMapPin, FiHeart, FiShoppingCart, FiPlus, FiEdit2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { useAlert } from '../../contexts/AlertContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { cleanRequestData } from '../../utils/requestUtils';
import HelpTooltip from '../../components/common/HelpTooltip';

function Users() {
  const { showConfirm } = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filtreler
  const [searchQuery, setSearchQuery] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
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
    lastName: '',
    email: '',
    phone: '',
    password: '',
    isActive: true,
    isEmailVerified: false,
  });
  const [formErrors, setFormErrors] = useState({});

  // Verileri yükle
  useEffect(() => {
    loadUsers();
  }, [currentPage, searchQuery, isActiveFilter, sortBy, sortOrder]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
      };

      if (searchQuery) params.search = searchQuery;
      if (isActiveFilter !== '') params.isActive = isActiveFilter === 'true';

      const response = await adminService.getUsers(params);
      setUsers(response.data.users || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Benutzer konnten nicht geladen werden');
      console.error('Kullanıcı yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcı durumu değiştir
  const handleToggleStatus = async (user) => {
    const action = user.isActive ? 'deaktivieren' : 'aktivieren';
    const confirmed = await showConfirm(
      `Möchten Sie "${user.firstName} ${user.lastName}" wirklich ${action}?`,
      { title: `Benutzer ${action}` }
    );

    if (confirmed) {
      try {
        await adminService.toggleUserStatus(user.id);
        toast.success(`Benutzer erfolgreich ${user.isActive ? 'deaktiviert' : 'aktiviert'}`);
        loadUsers();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren');
      }
    }
  };

  // Kullanıcı detayını aç
  const openUserDetail = async (user) => {
    try {
      const response = await adminService.getUserById(user.id);
      setSelectedUser(response.data.user);
      setShowModal(true);
    } catch (error) {
      toast.error('Benutzerdetails konnten nicht geladen werden');
      console.error('Kullanıcı detay hatası:', error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  // Form modal aç/kapat
  const openFormModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        isEmailVerified: user.isEmailVerified !== undefined ? user.isEmailVerified : false,
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        isActive: true,
        isEmailVerified: false,
      });
    }
    setFormErrors({});
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      isActive: true,
      isEmailVerified: false,
    });
    setFormErrors({});
  };

  // Form validasyonu
  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'Vorname ist erforderlich';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Nachname ist erforderlich';
    }

    if (!formData.email.trim()) {
      errors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Ungültige E-Mail-Adresse';
    }

    if (formData.phone && !/^(\+49|0)[1-9]\d{1,14}$/.test(formData.phone)) {
      errors.phone = 'Ungültige Telefonnummer';
    }

    if (!editingUser && !formData.password) {
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
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        isActive: formData.isActive,
        isEmailVerified: formData.isEmailVerified,
      };

      if (formData.password) {
        submitData.password = formData.password;
      }

      // Boş string'leri, null ve undefined değerleri temizle
      const cleanedData = cleanRequestData(submitData);

      if (editingUser) {
        await adminService.updateUser(editingUser.id, cleanedData);
        toast.success('Benutzer erfolgreich aktualisiert');
      } else {
        await adminService.createUser(cleanedData);
        toast.success('Benutzer erfolgreich erstellt');
      }

      closeFormModal();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern');
      console.error('Kullanıcı kaydetme hatası:', error);
    }
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSearchQuery('');
    setIsActiveFilter('');
    setCurrentPage(1);
  };

  // Aktif filtre sayısı
  const activeFilterCount = [
    searchQuery,
    isActiveFilter !== '',
  ].filter(Boolean).length;

  if (loading && users.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            Benutzer
            <HelpTooltip content="Verwalten Sie registrierte Kunden: Benutzerdetails ansehen, Bestellhistorie prüfen. Nur für Super-Administratoren." />
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {total} {total === 1 ? 'Benutzer' : 'Benutzer'} insgesamt
          </p>
        </div>
        <button
          onClick={() => openFormModal()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
        >
          <FiPlus className="w-4 h-4" />
          <span>Neuer Benutzer</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Name, E-Mail, Telefon suchen..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <FiFilter size={18} />
            Filter {activeFilterCount > 0 && (
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700"
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
              {/* Aktif/Pasif */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Status
                  <HelpTooltip content="Filtern Sie Benutzer nach ihrem Aktivierungsstatus. Aktive Benutzer können sich anmelden, inaktive nicht." />
                </label>
                <select
                  value={isActiveFilter}
                  onChange={(e) => {
                    setIsActiveFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Alle</option>
                  <option value="true">Aktiv</option>
                  <option value="false">Inaktiv</option>
                </select>
              </div>

              {/* Sortierung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Sortierung
                  <HelpTooltip content="Sortieren Sie Benutzer nach Registrierungsdatum oder Namen. Neueste zuerst zeigt die zuletzt registrierten Benutzer oben." />
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
                  <option value="lastName-asc">Nachname A-Z</option>
                  <option value="lastName-desc">Nachname Z-A</option>
                  <option value="email-asc">E-Mail A-Z</option>
                  <option value="email-desc">E-Mail Z-A</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Users Table/Cards */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse">Lädt...</div>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title="Keine Benutzer gefunden"
            message="Es gibt noch keine Benutzer oder passen Sie die Filter an."
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Benutzer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kontakt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktivitäten
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Registriert
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-green-700 font-semibold">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FiMail size={14} />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <FiPhone size={14} />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                            <FiShoppingBag size={12} />
                            {user._count?.orders || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                            <FiMapPin size={12} />
                            {user._count?.addresses || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                            <FiHeart size={12} />
                            {user._count?.favorites || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded">
                            <FiShoppingCart size={12} />
                            {user._count?.cartItems || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            <FiCheck size={12} />
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                            <FiXCircle size={12} />
                            Inaktiv
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openUserDetail(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Details anzeigen"
                          >
                            <FiEye size={18} />
                          </button>
                          <button
                            onClick={() => openFormModal(user)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Bearbeiten"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'Deaktivieren' : 'Aktivieren'}
                          >
                            {user.isActive ? <FiXCircle size={18} /> : <FiCheck size={18} />}
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
              {users.map((user) => (
                <div key={user.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-semibold text-lg">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                      </div>
                    </div>
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex-shrink-0">
                        <FiCheck size={12} />
                        Aktiv
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded flex-shrink-0">
                        <FiXCircle size={12} />
                        Inaktiv
                      </span>
                    )}
                  </div>
                  
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <FiPhone size={14} />
                      {user.phone}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      <FiShoppingBag size={12} />
                      {user._count?.orders || 0} Bestellungen
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                      <FiMapPin size={12} />
                      {user._count?.addresses || 0} Adressen
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                      <FiHeart size={12} />
                      {user._count?.favorites || 0} Favoriten
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Registriert: {new Date(user.createdAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openUserDetail(user)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                    >
                      <FiEye size={16} />
                      Details
                    </button>
                    <button
                      onClick={() => openFormModal(user)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm"
                    >
                      <FiEdit2 size={16} />
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                        user.isActive
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {user.isActive ? <FiXCircle size={16} /> : <FiCheck size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Seite {currentPage} von {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zurück
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {showModal && selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedUser.email}</p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* User Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Kontaktinformationen</h3>
                      <div className="text-sm text-gray-900 space-y-2">
                        <div className="flex items-center gap-2">
                          <FiMail size={16} className="text-gray-400" />
                          <span>{selectedUser.email}</span>
                        </div>
                        {selectedUser.phone && (
                          <div className="flex items-center gap-2">
                            <FiPhone size={16} className="text-gray-400" />
                            <span>{selectedUser.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                      <div className="space-y-2">
                        {selectedUser.isActive ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded">
                            <FiCheck size={14} />
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded">
                            <FiXCircle size={14} />
                            Inaktiv
                          </span>
                        )}
                        <div className="text-sm text-gray-600">
                          Registriert: {new Date(selectedUser.createdAt).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Statistiken</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <FiShoppingBag className="text-blue-600" size={18} />
                          <span className="text-sm text-gray-600">Bestellungen</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{selectedUser._count?.orders || 0}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <FiMapPin className="text-purple-600" size={18} />
                          <span className="text-sm text-gray-600">Adressen</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{selectedUser._count?.addresses || 0}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <FiHeart className="text-green-600" size={18} />
                          <span className="text-sm text-gray-600">Favoriten</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{selectedUser._count?.favorites || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <FiShoppingCart className="text-gray-600" size={18} />
                          <span className="text-sm text-gray-600">Warenkorb</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{selectedUser._count?.cartItems || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Addresses */}
                  {selectedUser.addresses && selectedUser.addresses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Adressen</h3>
                      <div className="space-y-2">
                        {selectedUser.addresses.map((address) => (
                          <div key={address.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{address.title}</p>
                                <p className="text-sm text-gray-600">
                                  {address.street} {address.houseNumber}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {address.postalCode} {address.city}
                                </p>
                              </div>
                              {address.isDefault && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Standard
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() => {
                        handleToggleStatus(selectedUser);
                        closeModal();
                      }}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedUser.isActive
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {selectedUser.isActive ? 'Benutzer deaktivieren' : 'Benutzer aktivieren'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeFormModal}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
                  </h2>
                  <button
                    onClick={closeFormModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      Vorname *
                      <HelpTooltip content="Der Vorname des Benutzers. Wird für Bestellungen und Kommunikation verwendet." />
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                        formErrors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Vorname"
                    />
                    {formErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      Nachname *
                      <HelpTooltip content="Der Nachname des Benutzers. Wird zusammen mit dem Vornamen für die vollständige Identifikation verwendet." />
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                        formErrors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nachname"
                    />
                    {formErrors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.lastName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      E-Mail *
                      <HelpTooltip content="Die E-Mail-Adresse des Benutzers. Wird für Login, Bestellbestätigungen und Benachrichtigungen verwendet. Muss eindeutig sein." />
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                        formErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="email@example.com"
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      Telefon
                      <HelpTooltip content="Die Telefonnummer des Benutzers (optional). Wird für Lieferungen und Kontakt verwendet." />
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                        formErrors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+49 123 456789"
                    />
                    {formErrors.phone && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      Passwort {editingUser ? '(leer lassen, um nicht zu ändern)' : '*'}
                      <HelpTooltip content={editingUser ? "Lassen Sie das Feld leer, um das Passwort nicht zu ändern. Geben Sie ein neues Passwort ein, um es zu aktualisieren." : "Das Passwort muss mindestens 8 Zeichen lang sein. Wird für die Anmeldung benötigt."} />
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                        formErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={editingUser ? 'Leer lassen, um nicht zu ändern' : 'Mindestens 8 Zeichen'}
                    />
                    {formErrors.password && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                    )}
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      Benutzer ist aktiv
                      <HelpTooltip content="Aktive Benutzer können sich anmelden und Bestellungen aufgeben. Inaktive Benutzer können sich nicht anmelden." />
                    </label>
                  </div>

                  {/* Email Verified Status */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isEmailVerified"
                      checked={formData.isEmailVerified}
                      onChange={(e) => setFormData({ ...formData, isEmailVerified: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="isEmailVerified" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      E-Mail bestätigt
                      <HelpTooltip content="Zeigt an, ob die E-Mail-Adresse des Benutzers verifiziert wurde. Verifizierte Benutzer erhalten wichtige Benachrichtigungen." />
                    </label>
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeFormModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {editingUser ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Users;

