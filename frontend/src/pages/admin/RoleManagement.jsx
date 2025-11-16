import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiShield, FiX, FiCheck, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useTheme } from '../../contexts/ThemeContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { useModalScroll } from '../../hooks/useModalScroll';

// API URL - Development'ta Vite proxy kullan, production'da environment variable veya tam URL
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  // Development modunda Vite proxy kullan
  if (import.meta.env.DEV) {
    return '/api';
  }
  // Production'da nginx üzerinden git (port kullanma, nginx proxy kullan)
  return '/api';
};

const API_URL = getApiUrl();

function RoleManagement() {
  const { themeColors } = useTheme();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog states
  const [roleDialog, setRoleDialog] = useState({ open: false, mode: 'create', role: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });

  // Modal scroll yönetimi - her modal için
  useModalScroll(roleDialog.open);
  useModalScroll(deleteDialog.open);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionIds: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Sie müssen sich anmelden');
        setLoading(false);
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [rolesRes, permissionsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/roles`, config),
        axios.get(`${API_URL}/admin/permissions`, config),
      ]);

      setRoles(rolesRes.data || []);
      setPermissions(permissionsRes.data?.all || []);
      setError(null);
    } catch (err) {
      console.error('Rol ve izin verileri yüklenirken hata:', err);
      let errorMessage = 'Fehler beim Laden der Daten';
      
      if (err.response?.data?.error) {
        errorMessage = typeof err.response.data.error === 'string' 
          ? err.response.data.error 
          : err.response.data.error?.message || JSON.stringify(err.response.data.error);
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // 403 hatası için özel mesaj
      if (err.response?.status === 403) {
        errorMessage = 'Super-Admin-Berechtigung erforderlich, um auf diese Seite zuzugreifen';
      } else if (err.response?.status === 401) {
        errorMessage = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, role = null) => {
    if (mode === 'edit' && role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        permissionIds: role.permissions?.map(p => p.id) || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        permissionIds: [],
      });
    }
    setRoleDialog({ open: true, mode, role });
  };

  const handleCloseDialog = () => {
    setRoleDialog({ open: false, mode: 'create', role: null });
    setFormData({ name: '', description: '', permissionIds: [] });
  };

  const handleSaveRole = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (roleDialog.mode === 'create') {
        await axios.post(`${API_URL}/admin/roles`, formData, config);
        toast.success('Rolle erfolgreich erstellt');
      } else {
        await axios.patch(`${API_URL}/admin/roles/${roleDialog.role.id}`, formData, config);
        toast.success('Rolle erfolgreich aktualisiert');
      }

      handleCloseDialog();
      fetchData();
      setError(null);
      
      // Admin bilgilerini yeniden yükle (menü güncellensin diye)
      // Tüm admin'lerin bilgilerini yenilemek için bir event gönder
      window.dispatchEvent(new CustomEvent('adminPermissionsUpdated'));
    } catch (err) {
      console.error('Rol kaydetme hatası:', err);
      let errorMessage = 'Fehler während des Vorgangs';
      
      if (err.response?.data?.error) {
        errorMessage = typeof err.response.data.error === 'string' 
          ? err.response.data.error 
          : err.response.data.error?.message || JSON.stringify(err.response.data.error);
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleDeleteRole = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_URL}/admin/roles/${deleteDialog.role.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Rolle erfolgreich gelöscht');
      setDeleteDialog({ open: false, role: null });
      fetchData();
      setError(null);
    } catch (err) {
      console.error('Rol silme hatası:', err);
      let errorMessage = 'Fehler beim Löschen der Rolle';
      
      if (err.response?.data?.error) {
        errorMessage = typeof err.response.data.error === 'string' 
          ? err.response.data.error 
          : err.response.data.error?.message || JSON.stringify(err.response.data.error);
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    }
  };

  // İzin bağımlılıkları - hangi izinlerin görüntüleme iznine bağlı olduğunu tanımla
  const getPermissionDependencies = () => {
    const dependencies = {};
    
    // Her kategori için görüntüleme iznini bul ve bağımlı izinleri tanımla
    permissions.forEach(perm => {
      if (perm.name.endsWith('_view')) {
        const category = perm.category;
        const baseName = perm.name.replace('_view', '');
        
        // Aynı kategorideki diğer izinleri bul
        permissions.forEach(otherPerm => {
          if (otherPerm.category === category && 
              otherPerm.name !== perm.name &&
              otherPerm.name.startsWith(baseName)) {
            if (!dependencies[otherPerm.id]) {
              dependencies[otherPerm.id] = [];
            }
            dependencies[otherPerm.id].push(perm.id);
          }
        });
      }
    });
    
    return dependencies;
  };

  const permissionDependencies = getPermissionDependencies();

  // Bir iznin görüntüleme iznine bağlı olup olmadığını kontrol et
  const isPermissionDisabled = (permissionId) => {
    const dependencies = permissionDependencies[permissionId];
    if (!dependencies || dependencies.length === 0) return false;
    
    // Bağımlı görüntüleme izinlerinden en az biri seçili mi?
    return !dependencies.some(viewPermId => formData.permissionIds.includes(viewPermId));
  };

  const togglePermission = (permissionId) => {
    const isCurrentlySelected = formData.permissionIds.includes(permissionId);
    
    setFormData(prev => {
      let newPermissionIds = [...prev.permissionIds];
      
      if (isCurrentlySelected) {
        // İzni kaldır
        newPermissionIds = newPermissionIds.filter(id => id !== permissionId);
        
        // Eğer görüntüleme izni kaldırıldıysa, bağımlı izinleri de kaldır
        const permission = permissions.find(p => p.id === permissionId);
        if (permission && permission.name.endsWith('_view')) {
          const category = permission.category;
          const baseName = permission.name.replace('_view', '');
          
          // Aynı kategorideki diğer izinleri kaldır
          permissions.forEach(otherPerm => {
            if (otherPerm.category === category && 
                otherPerm.name !== permission.name &&
                otherPerm.name.startsWith(baseName)) {
              newPermissionIds = newPermissionIds.filter(id => id !== otherPerm.id);
            }
          });
        }
      } else {
        // İzni ekle
        newPermissionIds.push(permissionId);
      }
      
      return {
        ...prev,
        permissionIds: newPermissionIds,
      };
    });
  };

  // İzinleri kategorilere göre grupla ve sırala (Görüntüleme önce)
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

  // Her kategori içindeki izinleri sırala: Görüntüleme önce, sonra diğerleri
  Object.keys(groupedPermissions).forEach(category => {
    groupedPermissions[category].sort((a, b) => {
      const aIsView = a.name.endsWith('_view');
      const bIsView = b.name.endsWith('_view');
      
      if (aIsView && !bIsView) return -1;
      if (!aIsView && bIsView) return 1;
      
      // İkisi de görüntüleme veya ikisi de değilse alfabetik sırala
      return a.displayName.localeCompare(b.displayName);
    });
  });

  const categoryNames = {
    products: 'Produktverwaltung',
    orders: 'Bestellverwaltung',
    users: 'Benutzerverwaltung',
    expiry: 'MHD-Verwaltung',
    marketing: 'Marketing',
    settings: 'Einstellungen',
    admin: 'Admin-Verwaltung',
    notifications: 'Benachrichtigungsverwaltung',
    templates: 'Vorlagenverwaltung',
    barcode: 'Barcode-Etikettenverwaltung',
    magazines: 'Magazin-Verwaltung',
    other: 'Sonstiges',
  };

  if (loading && roles.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiShield className="w-6 h-6 md:w-8 md:h-8" />
            Rollen- und Berechtigungsverwaltung
          </h1>
          <p className="text-gray-600 mt-0.5 md:mt-1 text-xs md:text-base">
            Rollen erstellen und Berechtigungen verwalten
          </p>
        </div>
        <button
          onClick={() => handleOpenDialog('create')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
          style={{
            backgroundColor: themeColors?.primary?.[600] || '#16a34a'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = themeColors?.primary?.[700] || '#15803d';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = themeColors?.primary?.[600] || '#16a34a';
          }}
        >
          <FiPlus className="w-4 h-4" />
          <span>Neue Rolle erstellen</span>
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <FiX size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Roles Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse">Lädt...</div>
          </div>
        ) : roles.length === 0 ? (
          <EmptyState
            icon={FiShield}
            title="Noch keine Rolle erstellt"
            message="Klicken Sie auf 'Neue Rolle erstellen', um Ihre erste Rolle zu erstellen."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Rollenname
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Beschreibung
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Anzahl der Berechtigungen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Anzahl der Admins
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {role.description || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {role.permissions?.length || 0} Berechtigung{role.permissions?.length !== 1 ? 'en' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {role.adminCount || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {role.isActive ? (
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
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDialog('edit', role)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, role })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ROL OLUŞTUR/DÜZENLE DİALOGU */}
      <AnimatePresence>
        {roleDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDialog}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-8">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {roleDialog.mode === 'create' ? 'Neue Rolle erstellen' : 'Rolle bearbeiten'}
                  </h3>
                  <button
                    onClick={handleCloseDialog}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rollenname *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Beschreibung
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Berechtigungen</h4>

                    {permissions.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-amber-900 mb-2">
                          Noch keine Berechtigungen definiert
                        </p>
                        <p className="text-sm text-amber-800 mb-2">
                          Führen Sie im Backend folgenden Befehl aus, um Berechtigungen zu erstellen:
                        </p>
                        <pre className="bg-amber-100 p-2 rounded text-xs text-amber-900 overflow-x-auto">
                          node backend/src/scripts/seedPermissions.js
                        </pre>
                        <p className="text-sm text-amber-800 mt-2">
                          Oder Sie können die API-Endpunkte verwenden, um Berechtigungen manuell zu erstellen.
                        </p>
                      </div>
                    ) : (
                      <>
                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                          <div key={category} className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-800 mb-2">
                              {categoryNames[category] || category}
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {perms.map((permission) => {
                                const isDisabled = isPermissionDisabled(permission.id);
                                const isChecked = formData.permissionIds.includes(permission.id);
                                
                                return (
                                  <label
                                    key={permission.id}
                                    className={`flex items-start gap-2 p-2 rounded-lg ${
                                      isDisabled 
                                        ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                                        : 'hover:bg-gray-50 cursor-pointer'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isDisabled}
                                      onChange={() => togglePermission(permission.id)}
                                      className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:cursor-not-allowed"
                                    />
                                    <div className="flex-1">
                                      <div className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                                        {permission.displayName}
                                        {isDisabled && (
                                          <span className="ml-2 text-xs text-amber-600">
                                            (Ansichtsberechtigung erforderlich)
                                          </span>
                                        )}
                                      </div>
                                      {permission.description && (
                                        <div className={`text-xs mt-0.5 ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                                          {permission.description}
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {formData.permissionIds.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-900">
                              <strong>{formData.permissionIds.length} Berechtigung{formData.permissionIds.length !== 1 ? 'en' : ''}</strong> ausgewählt. Diese Berechtigungen werden der Rolle zugewiesen, wenn sie gespeichert wird.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                  <button
                    onClick={handleCloseDialog}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSaveRole}
                    disabled={!formData.name}
                    className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={!formData.name ? {} : {
                      backgroundColor: themeColors?.primary?.[600] || '#16a34a'
                    }}
                    onMouseEnter={(e) => {
                      if (formData.name) {
                        e.currentTarget.style.backgroundColor = themeColors?.primary?.[700] || '#15803d';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.name) {
                        e.currentTarget.style.backgroundColor = themeColors?.primary?.[600] || '#16a34a';
                      }
                    }}
                  >
                    {roleDialog.mode === 'create' ? 'Erstellen' : 'Aktualisieren'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SİLME ONAYI DİALOGU */}
      <AnimatePresence>
        {deleteDialog.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteDialog({ open: false, role: null })}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Rolle löschen</h3>
                  <button
                    onClick={() => setDeleteDialog({ open: false, role: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <p className="text-gray-700">
                    Sind Sie sicher, dass Sie die Rolle <strong>{deleteDialog.role?.name}</strong> löschen möchten?
                  </p>
                  {deleteDialog.role?.adminCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-900">
                        Diese Rolle wird von {deleteDialog.role.adminCount} Admin{deleteDialog.role.adminCount !== 1 ? 's' : ''} verwendet. Sie müssen zuerst die Rollen dieser Admins ändern.
                      </p>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeleteDialog({ open: false, role: null })}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDeleteRole}
                    disabled={deleteDialog.role?.adminCount > 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RoleManagement;
