import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiX, FiEye, FiInfo, FiAlertCircle, FiCheckCircle, FiAlertTriangle, FiCode, FiUser, FiShield, FiGlobe } from 'react-icons/fi';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { useModalScroll } from '../../hooks/useModalScroll';

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);
  const abortControllerRef = useRef(null);
  const filterTimeoutRef = useRef(null);

  // Modal scroll yönetimi
  useModalScroll(showModal);

  // Filtreler
  const [filters, setFilters] = useState({
    searchEmail: '',
    searchIp: '',
    userType: '', // 'customer', 'admin', ''
    level: '',
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });

  // Debounced filters
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const isLoadingRef = useRef(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 50;
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Text inputlar için debounce (searchEmail, searchIp, action, entityType)
  useEffect(() => {
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    filterTimeoutRef.current = setTimeout(() => {
      setDebouncedFilters(prev => {
        const newFilters = {
          ...prev,
          searchEmail: filters.searchEmail,
          searchIp: filters.searchIp,
          action: filters.action,
          entityType: filters.entityType,
        };
        
        // Text inputlar değiştiğinde sayfa 1'e dön
        if (filters.searchEmail !== prev.searchEmail ||
            filters.searchIp !== prev.searchIp ||
            filters.action !== prev.action ||
            filters.entityType !== prev.entityType) {
          setCurrentPage(1);
        }
        
        return newFilters;
      });
    }, 500);

    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [filters.searchEmail, filters.searchIp, filters.action, filters.entityType]);

  // Select ve date inputlar için anında güncelleme (debounce yok)
  useEffect(() => {
    setDebouncedFilters(prev => ({
      ...prev,
      userType: filters.userType,
      level: filters.level,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }));
    // Select/date değiştiğinde sayfa 1'e dön
    setCurrentPage(1);
  }, [filters.userType, filters.level, filters.startDate, filters.endDate]);

  // Verileri yükle
  useEffect(() => {
    // Önceki isteği iptal et
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Yeni AbortController oluştur
    abortControllerRef.current = new AbortController();

    loadLogs(abortControllerRef.current.signal);
    loadStats();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentPage, debouncedFilters, sortBy, sortOrder]);

  const loadLogs = async (signal = null) => {
    // Eğer zaten bir yükleme devam ediyorsa, yeni istek yapma
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
      };

      if (debouncedFilters.searchEmail) params.searchEmail = debouncedFilters.searchEmail;
      if (debouncedFilters.searchIp) params.searchIp = debouncedFilters.searchIp;
      if (debouncedFilters.userType) params.userType = debouncedFilters.userType;
      if (debouncedFilters.level) params.level = debouncedFilters.level;
      if (debouncedFilters.action) params.action = debouncedFilters.action;
      if (debouncedFilters.entityType) params.entityType = debouncedFilters.entityType;
      if (debouncedFilters.startDate) params.startDate = debouncedFilters.startDate;
      if (debouncedFilters.endDate) params.endDate = debouncedFilters.endDate;

      const response = await adminService.getActivityLogs(params);
      
      // İstek iptal edildiyse state güncelleme
      if (signal?.aborted) {
        return;
      }

      setLogs(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      // AbortError'ı görmezden gel
      if (error.name === 'AbortError') {
        return;
      }
      toast.error('Logs konnten nicht geladen werden');
      console.error('Log yükleme hatası:', error);
    } finally {
      // İstek iptal edilmediyse loading'i kapat
      if (!signal?.aborted) {
        setLoading(false);
        isLoadingRef.current = false;
      } else {
        isLoadingRef.current = false;
      }
    }
  };

  const loadStats = async () => {
    try {
      const response = await adminService.getActivityLogStats();
      setStats(response.data);
    } catch (error) {
      console.error('Statistik yükleme hatası:', error);
    }
  };

  const openLogDetail = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLog(null);
  };

  const resetFilters = () => {
    const emptyFilters = {
      searchEmail: '',
      searchIp: '',
      userType: '',
      level: '',
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
    };
    setFilters(emptyFilters);
    setDebouncedFilters(emptyFilters);
    setCurrentPage(1);
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'success':
        return <FiCheckCircle className="text-emerald-600" />;
      case 'error':
        return <FiAlertCircle className="text-rose-600" />;
      case 'warning':
        return <FiAlertTriangle className="text-amber-600" />;
      case 'info':
        return <FiInfo className="text-sky-600" />;
      case 'debug':
        return <FiCode className="text-slate-500" />;
      default:
        return <FiInfo className="text-slate-500" />;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'error':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'info':
        return 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'debug':
        return 'bg-slate-50 text-slate-600 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Alan isimlerini Almanca'ya çevir
  const getFieldLabel = (key) => {
    const labels = {
      vorname: 'Vorname',
      nachname: 'Nachname',
      email: 'E-Mail',
      telefon: 'Telefon',
      status: 'Status',
      emailBestaetigt: 'E-Mail bestätigt',
      passwort: 'Passwort',
      rolle: 'Rolle',
      rollenId: 'Rollen-ID',
      rollenName: 'Rollenname',
      titel: 'Adresstitel',
      strasse: 'Straße',
      hausnummer: 'Hausnummer',
      adresszusatz: 'Adresszusatz',
      stadtteil: 'Stadtteil',
      plz: 'PLZ',
      stadt: 'Stadt',
      bundesland: 'Bundesland',
      beschreibung: 'Beschreibung',
      standardAdresse: 'Standardadresse',
      benutzerId: 'Benutzer-ID',
      administratorId: 'Administrator-ID',
      adressId: 'Adress-ID',
    };
    return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  // Metadata'yı okunaklı şekilde render et
  const renderMetadata = (metadata) => {
    // Değişiklikler varsa özel gösterim
    if (metadata.aenderungen && Object.keys(metadata.aenderungen).length > 0) {
      return (
        <div className="space-y-4">
          {/* Değişiklikler */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <FiAlertCircle className="text-blue-600" size={16} />
              Geänderte Felder
            </h3>
            <div className="space-y-3">
              {Object.entries(metadata.aenderungen).map(([key, change]) => (
                <div key={key} className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
                  <div className="text-sm font-semibold text-gray-800 mb-3">{change.feld || getFieldLabel(key)}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-red-50 border-2 border-red-300 rounded-lg p-3">
                      <div className="text-xs text-red-700 font-semibold mb-1.5 uppercase tracking-wide">Vorher</div>
                      <div className="text-base text-gray-900 font-semibold break-words">
                        {change.alt || change.altWert !== undefined ? (change.altWert !== undefined ? (change.altWert ? 'Ja' : 'Nein') : change.alt) : '-'}
                      </div>
                    </div>
                    <div className="text-gray-500 text-2xl font-bold">→</div>
                    <div className="flex-1 bg-green-50 border-2 border-green-300 rounded-lg p-3">
                      <div className="text-xs text-green-700 font-semibold mb-1.5 uppercase tracking-wide">Nachher</div>
                      <div className="text-base text-gray-900 font-semibold break-words">
                        {change.neu || change.neuWert !== undefined ? (change.neuWert !== undefined ? (change.neuWert ? 'Ja' : 'Nein') : change.neu) : '-'}
                      </div>
                    </div>
                  </div>
                  {change.hinweis && (
                    <div className="mt-2 text-xs text-gray-500 italic bg-yellow-50 border border-yellow-200 rounded p-2">
                      ℹ️ {change.hinweis}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Önce/Sonra Karşılaştırması */}
          {(metadata.vorher || metadata.nachher) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.vorher && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Vorher
                  </h3>
                  <div className="space-y-2.5">
                    {Object.entries(metadata.vorher).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-200 last:border-0">
                        <span className="text-xs font-medium text-gray-600">{getFieldLabel(key)}:</span>
                        <span className="text-sm text-gray-900 font-medium text-right max-w-[60%] break-words">{value || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {metadata.nachher && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Nachher
                  </h3>
                  <div className="space-y-2.5">
                    {Object.entries(metadata.nachher).map(([key, value]) => {
                      const changed = metadata.aenderungen && Object.keys(metadata.aenderungen).some(k => {
                        const change = metadata.aenderungen[k];
                        return change && (change.feld?.toLowerCase() === key.toLowerCase() || k.toLowerCase() === key.toLowerCase());
                      });
                      return (
                        <div key={key} className={`flex justify-between items-start gap-2 py-1.5 border-b border-gray-200 last:border-0 ${changed ? 'bg-green-50 rounded px-2 -mx-2' : ''}`}>
                          <span className="text-xs font-medium text-gray-600">{getFieldLabel(key)}:</span>
                          <span className={`text-sm font-semibold text-right max-w-[60%] break-words ${changed ? 'text-green-700' : 'text-gray-900'}`}>
                            {value || '-'}
                            {changed && <span className="ml-1.5 text-green-600 text-xs">✓</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Basit metadata gösterimi
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="space-y-2.5">
          {Object.entries(metadata).map(([key, value]) => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'object' && !Array.isArray(value)) {
              return (
                <div key={key} className="border-b border-gray-200 pb-3 mb-3 last:border-0 last:mb-0">
                  <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    {getFieldLabel(key)}
                  </div>
                  <div className="pl-3 space-y-2 bg-white rounded p-2 border border-gray-200">
                    {Object.entries(value).map(([subKey, subValue]) => (
                      <div key={subKey} className="flex justify-between items-start gap-2">
                        <span className="text-xs font-medium text-gray-600">{getFieldLabel(subKey)}:</span>
                        <span className="text-xs text-gray-900 font-medium text-right max-w-[60%] break-words">
                          {String(subValue || '-')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                <span className="text-xs font-medium text-gray-600">{getFieldLabel(key)}:</span>
                <span className="text-sm text-gray-900 font-semibold text-right max-w-[60%] break-words">
                  {String(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getActionLabel = (action) => {
    const actionLabels = {
      // Bestellungen
      'order.create': 'Bestellung erstellen',
      'order.cancel': 'Bestellung stornieren',
      'order.update_status': 'Bestellstatus aktualisieren',
      'order.create_review': 'Bewertung erstellen',
      'order.send_invoice': 'Rechnung senden',
      
      // Admin
      'admin.login': 'Admin-Anmeldung',
      'admin.create_admin': 'Administrator erstellen',
      'admin.update_admin': 'Administrator aktualisieren',
      'admin.delete_admin': 'Administrator löschen',
      'admin.create_user': 'Benutzer erstellen',
      'admin.update_user': 'Benutzer aktualisieren',
      'admin.toggle_user_status': 'Benutzerstatus ändern',
      'admin.create_user_address': 'Adresse hinzufügen',
      'admin.update_user_address': 'Adresse aktualisieren',
      'admin.delete_user_address': 'Adresse löschen',
      
      // Produkte
      'product.create': 'Produkt erstellen',
      'product.update': 'Produkt aktualisieren',
      'product.delete': 'Produkt löschen',
      'product.supplier.update': 'Lieferant aktualisieren',
      
      // Kategorien
      'category.create': 'Kategorie erstellen',
      
      // Warenkorb
      'cart.add': 'Zum Warenkorb hinzufügen',
      'cart.update': 'Warenkorb aktualisieren',
      'cart.remove': 'Aus Warenkorb entfernen',
      'cart.clear': 'Warenkorb leeren',
      
      // Benutzer
      'user.register': 'Registrierung',
      'user.login': 'Anmeldung',
      'user.forgot_password': 'Passwort vergessen',
      'user.reset_password': 'Passwort zurücksetzen',
      'user.verify_email': 'E-Mail verifizieren',
      'user.update_profile': 'Profil aktualisieren',
      'user.change_password': 'Passwort ändern',
      'user.create_address': 'Adresse erstellen',
      'user.update_address': 'Adresse aktualisieren',
      'user.delete_address': 'Adresse löschen',
      'user.set_default_address': 'Standardadresse setzen',
      
      // Lager
      'stock.order.create': 'Lagerbestellung erstellen',
      'stock.order.update': 'Lagerbestellung aktualisieren',
      'stock.list.create': 'Lagerliste erstellen',
      'stock.list.delete': 'Lagerliste löschen',
      
      // Gutscheine
      'coupon.create': 'Gutschein erstellen',
      'coupon.update': 'Gutschein aktualisieren',
      'coupon.delete': 'Gutschein löschen',
      
      // Lieferanten
      'supplier.create': 'Lieferant erstellen',
      
      // Einstellungen
      'settings.update': 'Einstellungen aktualisieren',
      
      // Kampagnen
      'campaign.create': 'Kampagne erstellen',
      'campaign.update': 'Kampagne aktualisieren',
      'campaign.delete': 'Kampagne löschen',
      
      // Favoriten
      'favorite.add': 'Zu Favoriten hinzufügen',
      'favorite.remove': 'Aus Favoriten entfernen',
    };

    return actionLabels[action] || action;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          Logs
        </h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          {total} Einträge insgesamt
        </p>
      </div>

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200"
          >
            <div className="text-sm font-medium text-gray-600 mb-1">Gesamt</div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">
              {stats.totalLogs || 0}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200"
          >
            <div className="text-sm font-medium text-gray-600 mb-1">Kunden</div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">
              {stats.userTypeStats?.customer || 0}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200"
          >
            <div className="text-sm font-medium text-gray-600 mb-1">Administratoren</div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">
              {stats.userTypeStats?.admin || 0}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200"
          >
            <div className="text-sm font-medium text-gray-600 mb-1">Fehler</div>
            <div className="text-2xl md:text-3xl font-bold text-red-600">
              {stats.levelStats?.find(s => s.level === 'error')?.count || 0}
            </div>
          </motion.div>
        </div>
      )}

      {/* Filter Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            showFilters
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <FiFilter />
          Filter
        </button>
      </div>

      {/* Filtreler */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail suchen
                </label>
                <input
                  type="text"
                  value={filters.searchEmail}
                  onChange={(e) => setFilters({ ...filters, searchEmail: e.target.value })}
                  placeholder="E-Mail..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP-Adresse suchen
                </label>
                <input
                  type="text"
                  value={filters.searchIp}
                  onChange={(e) => setFilters({ ...filters, searchIp: e.target.value })}
                  placeholder="IP..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benutzertyp
                </label>
                <select
                  value={filters.userType}
                  onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Alle</option>
                  <option value="customer">Kunden</option>
                  <option value="admin">Administratoren</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level
                </label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Alle</option>
                  <option value="info">Info</option>
                  <option value="success">Erfolg</option>
                  <option value="warning">Warnung</option>
                  <option value="error">Fehler</option>
                  <option value="debug">Debug</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aktion
                </label>
                <input
                  type="text"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  placeholder="z.B. user.login"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity-Typ
                </label>
                <input
                  type="text"
                  value={filters.entityType}
                  onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                  placeholder="z.B. product, order"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Von Datum
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bis Datum
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Zurücksetzen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Liste */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <Loading />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8">
            <EmptyState message="Keine Logs gefunden" />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Zeitpunkt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Benutzer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktion
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Nachricht
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      IP / Gerät
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit ${getLevelColor(log.level)}`}>
                          {getLevelIcon(log.level)}
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <FiUser className="text-blue-500" size={16} />
                            <span className="truncate max-w-xs">{log.user.email}</span>
                          </div>
                        ) : log.admin ? (
                          <div className="flex items-center gap-2">
                            <FiShield className="text-purple-500" size={16} />
                            <span className="truncate max-w-xs">{log.admin.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="inline-block bg-gray-50 px-2.5 py-1 rounded text-xs font-medium text-gray-700 border border-gray-200">
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                        <div className="truncate" title={log.message}>
                          {log.message}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex flex-col gap-1">
                          {log.ipAddress && (
                            <div className="flex items-center gap-1">
                              <FiGlobe className="text-gray-400" size={14} />
                              <span className="text-xs">{log.ipAddress}</span>
                            </div>
                          )}
                          {log.deviceType && (
                            <span className="text-xs text-gray-500">
                              {log.deviceType === 'mobile' ? '📱' : log.deviceType === 'desktop' ? '💻' : '❓'} {log.deviceType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openLogDetail(log)}
                          className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          <FiEye size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">{formatDate(log.createdAt)}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getLevelColor(log.level)}`}>
                          {getLevelIcon(log.level)}
                          {log.level}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => openLogDetail(log)}
                      className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <FiEye size={16} />
                    </button>
                  </div>
                  
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1">Benutzer</div>
                    {log.user ? (
                      <div className="flex items-center gap-2">
                        <FiUser className="text-blue-500" size={14} />
                        <span className="text-sm text-gray-900">{log.user.email}</span>
                      </div>
                    ) : log.admin ? (
                      <div className="flex items-center gap-2">
                        <FiShield className="text-purple-500" size={14} />
                        <span className="text-sm text-gray-900">{log.admin.email}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1">Aktion</div>
                    <span className="inline-block bg-gray-50 px-2.5 py-1 rounded text-xs font-medium text-gray-700 border border-gray-200">
                      {getActionLabel(log.action)}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1">Nachricht</div>
                    <div className="text-sm text-gray-900">{log.message}</div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {log.ipAddress && (
                      <div className="flex items-center gap-1">
                        <FiGlobe size={12} />
                        <span>{log.ipAddress}</span>
                      </div>
                    )}
                    {log.deviceType && (
                      <span>
                        {log.deviceType === 'mobile' ? '📱' : log.deviceType === 'desktop' ? '💻' : '❓'} {log.deviceType}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Seite {currentPage} von {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentPage === 1 || loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              Zurück
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentPage === totalPages || loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              Weiter
            </button>
          </div>
        </div>
      )}

      {/* Log Detay Modal */}
      <AnimatePresence>
        {showModal && selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Log-Details
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nachricht</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedLog.message}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(selectedLog.level)}`}>
                        {selectedLog.level}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aktion</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                      {getActionLabel(selectedLog.action)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Entity-Typ</label>
                    <p className="mt-1 text-gray-900">{selectedLog.entityType || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Entity-ID</label>
                    <p className="mt-1 font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedLog.entityId || '-'}</p>
                  </div>
                  {selectedLog.entityType === 'product' && selectedLog.metadata?.barcode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                      <p className="mt-1 font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                        {selectedLog.metadata.barcode}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zeitpunkt</label>
                    <p className="mt-1 text-gray-900">{formatDate(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gerät</label>
                    <p className="mt-1 text-gray-900">
                      {selectedLog.deviceType === 'mobile' ? '📱 Mobile' : selectedLog.deviceType === 'desktop' ? '💻 Desktop' : '❓ Unbekannt'}
                    </p>
                  </div>
                </div>
                {selectedLog.user && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Benutzer</label>
                    <p className="mt-1 text-gray-900">
                      {selectedLog.user.firstName} {selectedLog.user.lastName} ({selectedLog.user.email})
                    </p>
                  </div>
                )}
                {selectedLog.admin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Administrator</label>
                    <p className="mt-1 text-gray-900">
                      {selectedLog.admin.firstName} ({selectedLog.admin.email})
                    </p>
                  </div>
                )}
                {selectedLog.ipAddress && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IP-Adresse</label>
                    <p className="mt-1 font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedLog.ipAddress}</p>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">User Agent</label>
                    <p className="mt-1 font-mono text-xs break-all text-gray-900 bg-gray-50 p-2 rounded">{selectedLog.userAgent}</p>
                  </div>
                )}
                {selectedLog.metadata && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Details</label>
                    {renderMetadata(selectedLog.metadata)}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ActivityLogs;

