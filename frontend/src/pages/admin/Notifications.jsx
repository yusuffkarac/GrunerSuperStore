import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiBell, FiSend, FiUsers, FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle, FiTrash2 } from 'react-icons/fi';
import adminService from '../../services/adminService';
import { useAlert } from '../../contexts/AlertContext';
import Loading from '../../components/common/Loading';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import HelpTooltip from '../../components/common/HelpTooltip';
import SwitchListItem from '../../components/common/SwitchListItem';

function Notifications() {
  const { showConfirm } = useAlert();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [targetType, setTargetType] = useState('all'); // 'all' veya 'selected'

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    actionUrl: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Verileri yükle
  useEffect(() => {
    loadNotifications();
    if (targetType === 'selected') {
      loadUsers();
    }
  }, [currentPage, targetType]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllNotifications({
        page: currentPage,
        limit: 20,
      });
      setNotifications(response.data.notifications || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Benachrichtigungen konnten nicht geladen werden');
      console.error('Bildirim yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await adminService.getUsers({ limit: 1000 });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Kullanıcı yükleme hatası:', error);
    }
  };

  // Bildirim gönder
  const handleSendNotification = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Titel und Nachricht sind erforderlich');
      return;
    }

    if (targetType === 'selected' && selectedUsers.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Benutzer aus');
      return;
    }

    setSending(true);
    try {
      const data = {
        ...formData,
        userIds: targetType === 'selected' ? selectedUsers : null,
      };

      await adminService.createNotification(data);
      toast.success('Benachrichtigung erfolgreich gesendet');
      
      // Formu temizle
      setFormData({
        title: '',
        message: '',
        type: 'info',
        actionUrl: '',
      });
      setSelectedUsers([]);
      setTargetType('all');
      
      // Bildirimleri yenile
      loadNotifications();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Senden der Benachrichtigung');
    } finally {
      setSending(false);
    }
  };

  // Kullanıcı seçimi toggle
  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Tümünü seç/seçimi kaldır
  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  // Bildirimi sil
  const handleDeleteNotification = async (notificationId) => {
    const confirmed = await showConfirm(
      'Benachrichtigung löschen',
      'Sind Sie sicher, dass Sie diese Benachrichtigung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
      'Löschen',
      'Abbrechen'
    );

    if (!confirmed) return;

    try {
      await adminService.deleteNotification(notificationId);
      toast.success('Benachrichtigung erfolgreich gelöscht');
      loadNotifications();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen der Benachrichtigung');
      console.error('Bildirim silme hatası:', error);
    }
  };

  // Bildirim tipine göre renk ve ikon
  const getTypeConfig = (type) => {
    switch (type) {
      case 'success':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <FiCheckCircle className="w-5 h-5" />,
        };
      case 'warning':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <FiAlertTriangle className="w-5 h-5" />,
        };
      case 'error':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <FiXCircle className="w-5 h-5" />,
        };
      default:
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <FiInfo className="w-5 h-5" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          Benachrichtigungen
          <HelpTooltip content="Senden Sie Push-Benachrichtigungen an alle Benutzer oder bestimmte Gruppen. Perfekt für Ankündigungen und Updates." />
        </h1>
        <p className="text-gray-600 mt-1">Benachrichtigungen an Benutzer senden</p>
      </div>

      {/* Bildirim Gönderme Formu */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Neue Benachrichtigung</h2>

        <form onSubmit={handleSendNotification} className="space-y-4">
          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Benachrichtigungstitel"
              maxLength={200}
              required
            />
          </div>

          {/* Nachricht */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nachricht *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Benachrichtigungsnachricht"
              rows={4}
              maxLength={1000}
              required
            />
          </div>

          {/* Typ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="info">Info</option>
              <option value="success">Erfolg</option>
              <option value="warning">Warnung</option>
              <option value="error">Fehler</option>
            </select>
          </div>

          {/* Action URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action URL (optional)
            </label>
            <input
              type="text"
              value={formData.actionUrl}
              onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="/siparislerim/123"
            />
          </div>

          {/* Zielgruppe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zielgruppe
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={targetType === 'all'}
                  onChange={(e) => {
                    setTargetType(e.target.value);
                    setSelectedUsers([]);
                  }}
                  className="mr-2"
                />
                <span>Alle Benutzer</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="selected"
                  checked={targetType === 'selected'}
                  onChange={(e) => {
                    setTargetType(e.target.value);
                    if (e.target.value === 'selected') {
                      loadUsers();
                    }
                  }}
                  className="mr-2"
                />
                <span>Ausgewählte Benutzer</span>
              </label>
            </div>

            {/* Kullanıcı Seçimi */}
            {targetType === 'selected' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setShowUserSelect(!showUserSelect)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {showUserSelect ? 'Auswahl ausblenden' : 'Benutzer auswählen'}
                  </button>
                  {showUserSelect && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-sm text-gray-600 hover:text-gray-700"
                    >
                      {selectedUsers.length === users.length ? 'Alle abwählen' : 'Alle auswählen'}
                    </button>
                  )}
                </div>

                {showUserSelect && (
                  <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {users.length === 0 ? (
                      <p className="text-gray-500 text-sm">Keine Benutzer gefunden</p>
                    ) : (
                      <div className="space-y-2">
                        {users.map((user) => (
                          <SwitchListItem
                            key={user.id}
                            id={`user-${user.id}`}
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            label={`${user.firstName} ${user.lastName} (${user.email})`}
                            color="green"
                            className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedUsers.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedUsers.length} Benutzer ausgewählt
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FiSend className="w-5 h-5" />
              {sending ? 'Wird gesendet...' : 'Benachrichtigung senden'}
            </button>
          </div>
        </form>
      </div>

      {/* Gönderilen Bildirimler */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Gesendete Benachrichtigungen</h2>

        {loading ? (
          <Loading />
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FiBell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Keine Benachrichtigungen gesendet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const typeConfig = getTypeConfig(notification.type);
              return (
                <div
                  key={notification.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${typeConfig.color}`}
                    >
                      {typeConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-gray-900">{notification.title}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Benachrichtigung löschen"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      {notification.user && (
                        <p className="text-xs text-gray-400 mt-2">
                          An: {notification.user.firstName} {notification.user.lastName} ({notification.user.email})
                        </p>
                      )}
                      {notification.actionUrl && (
                        <p className="text-xs text-primary-600 mt-1">
                          Link: {notification.actionUrl}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;

