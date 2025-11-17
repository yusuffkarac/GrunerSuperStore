import React, { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiGrid,
  FiInfo,
  FiPower,
  FiRefreshCw,
  FiSettings,
  FiTag,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import expiryService from '../../services/expiryService';
import { useTheme } from '../../contexts/ThemeContext';
import useModalScroll from '../../hooks/useModalScroll';

const initialActionDialog = { type: null, product: null };

const formatExpiryDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('de-DE');
  } catch (error) {
    return value;
  }
};

const formatDaysUntil = (days) => {
  if (days === 0) {
    return 'Heute';
  }
  if (days < 0) {
    return `Überfällig (${Math.abs(days)}T)`;
  }
  if (days === 1) {
    return 'In 1 Tag';
  }
  return `In ${days} Tagen`;
};

const readAdminPermissions = () => {
  try {
    const raw = localStorage.getItem('admin');
    if (!raw) return { perms: [], isSuperAdmin: false };
    const admin = JSON.parse(raw);
    const role = admin.role?.toString().trim().toLowerCase();
    const isSuperAdmin = role === 'superadmin';
    if (isSuperAdmin) {
      return { perms: [], isSuperAdmin: true };
    }

    if (Array.isArray(admin.permissions)) {
      return { perms: admin.permissions.map((perm) => perm?.name || perm), isSuperAdmin: false };
    }

    if (Array.isArray(admin.adminRole?.permissions)) {
      return {
        perms: admin.adminRole.permissions.map((perm) => perm.permission?.name || perm.permission),
        isSuperAdmin: false,
      };
    }

    return { perms: [], isSuperAdmin: false };
  } catch (error) {
    return { perms: [], isSuperAdmin: false };
  }
};

const getActionBadge = (product) => {
  if (!product?.isProcessed || !product?.lastAction) {
    return null;
  }

  const action = product.lastAction;
  if (action.actionType === 'labeled') {
    return {
      label: 'Reduziert',
      className: 'bg-amber-50 text-amber-700',
      icon: FiTag,
    };
  }

  if (action.actionType === 'removed') {
    if (action.excludedFromCheck) {
      return {
        label: 'Deaktiviert',
        className: 'bg-slate-100 text-slate-700',
        icon: FiPower,
      };
    }
    const note = action.note?.toLowerCase() || '';
    if (note.includes('mhd') || note.includes('skt') || note.includes('datum')) {
      return {
        label: 'Neues Datum',
        className: 'bg-blue-50 text-blue-700',
        icon: FiCalendar,
      };
    }
    return {
      label: 'Aussortiert',
      className: 'bg-red-50 text-red-700',
      icon: FiTrash2,
    };
  }

  return null;
};

function ExpiryManagement() {
  const { themeColors } = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionDialog, setActionDialog] = useState(initialActionDialog);
  const [actionForm, setActionForm] = useState({});
  const [savingAction, setSavingAction] = useState(false);
  const [pendingQuickAction, setPendingQuickAction] = useState(null);
  const [pendingDeactivateId, setPendingDeactivateId] = useState(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    enabled: true,
    warningDays: 3,
    criticalDays: 0,
    processingDeadline: '20:00',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [deadlineBannerHidden, setDeadlineBannerHidden] = useState(false);
  const [canEditSettings, setCanEditSettings] = useState(false);
  const [previewInput, setPreviewInput] = useState('');
  const [appliedPreviewDate, setAppliedPreviewDate] = useState(null);
  const isActionDialogOpen = Boolean(actionDialog.type && actionDialog.product);
  const isAnyModalOpen = isActionDialogOpen || settingsDialogOpen;

  useModalScroll(isAnyModalOpen);

  useEffect(() => {
    const { perms, isSuperAdmin } = readAdminPermissions();
    if (isSuperAdmin || perms.includes('expiry_management_settings')) {
      setCanEditSettings(true);
    }
  }, []);

  const fetchDashboard = async (previewDateOverride = appliedPreviewDate) => {
    setLoading(true);
    try {
      const data = await expiryService.getDashboard({
        previewDate: previewDateOverride || undefined,
      });
      setDashboard(data);
      setSettingsForm({
        enabled: data.settings.enabled,
        warningDays: data.settings.warningDays,
        criticalDays: data.settings.criticalDays,
        processingDeadline: data.settings.processingDeadline,
      });
      setError(null);
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Daten konnten nicht geladen werden';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const progressLabel = useMemo(() => {
    if (!dashboard?.stats) return '0/0';
    return dashboard.stats.progressLabel;
  }, [dashboard]);

  const completionRate = dashboard?.stats?.completionRate ?? 0;
  const isPreviewActive = Boolean(dashboard?.preview?.isPreview);
  const todayIso = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const normalizeDateInput = (date) => {
    if (!date) {
      return null;
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const year = parsed.getFullYear();
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleApplyPreviewDate = () => {
    const normalized = previewInput?.trim() ? previewInput : null;
    setAppliedPreviewDate(normalized);
    fetchDashboard(normalized);
  };

  const handleResetPreviewDate = () => {
    if (previewInput) {
      setPreviewInput('');
    }
    if (!appliedPreviewDate && !isPreviewActive) {
      fetchDashboard(null);
      return;
    }
    setAppliedPreviewDate(null);
    fetchDashboard(null);
  };

  const handleShiftPreviewDate = (days) => {
    const baseDate =
      previewInput ||
      appliedPreviewDate ||
      (dashboard?.preview?.isPreview ? dashboard.preview.date : dashboard?.date) ||
      todayIso;

    const normalizedBase = normalizeDateInput(baseDate);
    if (!normalizedBase) {
      return;
    }

    const nextDate = new Date(normalizedBase);
    nextDate.setDate(nextDate.getDate() + days);
    const formattedNext = normalizeDateInput(nextDate);
    if (!formattedNext) {
      return;
    }

    setPreviewInput(formattedNext);
    setAppliedPreviewDate(formattedNext);
    fetchDashboard(formattedNext);
  };

  const openActionDialog = (product, type) => {
    setActionDialog({ product, type });
    if (type === 'remove' || type === 'date') {
      setActionForm({ newExpiryDate: '', note: '' });
      } else {
      setActionForm({});
    }
  };

  const closeActionDialog = () => {
    if (savingAction) return;
    setActionDialog(initialActionDialog);
    setActionForm({});
  };

  const handleLabelProduct = async (product) => {
    if (!product) return;
    setPendingQuickAction(product.id);
    try {
      await expiryService.labelProduct(product.id, { note: 'Reduziert' });
      toast.success(`${product.name} wurde etikettiert`);
      await fetchDashboard();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Aktion fehlgeschlagen');
    } finally {
      setPendingQuickAction(null);
    }
  };

  const handleDeactivateProduct = async (product) => {
    if (!product) return;
    setPendingDeactivateId(product.id);
    try {
      await expiryService.processRemoval(product.id, {
        action: 'deactivate',
        scenario: 'out_of_stock',
        excludeFromCheck: true,
        note: 'Produkt deaktiviert',
      });
      toast.success(`${product.name} wurde deaktiviert`);
      await fetchDashboard();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Aktion fehlgeschlagen');
    } finally {
      setPendingDeactivateId(null);
    }
  };

  const handleActionSubmit = async () => {
    if (!actionDialog.product || !actionDialog.type) return;
    const product = actionDialog.product;
    setSavingAction(true);
    try {
      if (actionDialog.type === 'remove') {
        if (!actionForm.newExpiryDate) {
          toast.error('Bitte neues MHD eingeben');
          return;
        }
        await expiryService.processRemoval(product.id, {
          action: 'remove',
          scenario: 'remove',
          excludeFromCheck: false,
          newExpiryDate: actionForm.newExpiryDate,
          note: actionForm.note,
        });
        toast.success(`${product.name} wurde aussortiert`);
      } else if (actionDialog.type === 'date') {
        if (!actionForm.newExpiryDate) {
          toast.error('Bitte neues MHD eingeben');
          return;
        }
        await expiryService.updateExpiryDate(product.id, {
          newExpiryDate: actionForm.newExpiryDate,
          note: actionForm.note,
        });
        toast.success(`${product.name} wurde aktualisiert`);
      }
      closeActionDialog();
      await fetchDashboard();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Aktion fehlgeschlagen');
    } finally {
      setSavingAction(false);
    }
  };

  const handleSettingsSave = async () => {
    setSavingSettings(true);
    try {
      const payload = {
        enabled: settingsForm.enabled,
        warningDays: Number(settingsForm.warningDays),
        criticalDays: Number(settingsForm.criticalDays),
        processingDeadline: settingsForm.processingDeadline,
      };
      await expiryService.updateSettings(payload);
      toast.success('Einstellungen gespeichert');
      setSettingsDialogOpen(false);
      await fetchDashboard();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Einstellungen konnten nicht gespeichert werden');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!dashboard) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <EmptyState
          icon={FiAlertCircle}
          title="Keine Daten verfügbar"
          message={error || 'Versuchen Sie es später erneut.'}
        />
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Kategorien',
      value: dashboard.stats?.totalCategories ?? 0,
      icon: FiGrid,
      accent: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Produkte',
      value: dashboard.stats?.totalProducts ?? 0,
      icon: FiTag,
      accent: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Heute fällig',
      value: dashboard.actionSummary?.removeToday?.total ?? 0,
      icon: FiTrash2,
      accent: 'bg-red-50 text-red-700',
    },
    {
      label: 'Label nötig',
      value: dashboard.actionSummary?.labelSoon?.total ?? 0,
      icon: FiAlertTriangle,
      accent: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
          <h1 className="text-2xl font-bold text-gray-900">MHD-Verwaltung</h1>
          <p className="text-sm text-gray-600">
            {dashboard.dateLabel || 'Heute'} • {dashboard.deadlineLabel}
          </p>
          </div>
        <div className="flex flex-wrap gap-2">
                <button
            onClick={() => fetchDashboard()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <FiRefreshCw className="w-4 h-4" />
            Aktualisieren
                </button>
          {canEditSettings && (
                <button
              onClick={() => setSettingsDialogOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-white"
              style={{
                backgroundColor: themeColors?.primary?.[600] || '#16a34a',
              }}
            >
              <FiSettings className="w-4 h-4" />
              Einstellungen
            </button>
          )}
          </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 border border-emerald-100 space-y-3 hidden dayChange" >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-xs">
            <label className="text-sm font-medium text-gray-700">Vorschau-Datum</label>
            <div className="mt-1 flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => handleShiftPreviewDate(-1)}
                className="inline-flex items-center justify-center px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
            <input
              type="date"
              value={previewInput}
              onChange={(e) => setPreviewInput(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
            />
              <button
                type="button"
                onClick={() => handleShiftPreviewDate(1)}
                className="inline-flex items-center justify-center px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Zeige das Dashboard so an, wie es an einem zukünftigen Tag aussehen würde.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleApplyPreviewDate}
              disabled={!previewInput && !appliedPreviewDate}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
            >
              Vorschau anzeigen
            </button>
            <button
              onClick={handleResetPreviewDate}
              disabled={!previewInput && !appliedPreviewDate && !isPreviewActive}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Heute anzeigen
            </button>
          </div>
        </div>
        {isPreviewActive && (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <FiInfo className="w-4 h-4" />
            <span>Vorschau aktiv: Daten für {dashboard.dateLabel}</span>
          </div>
        )}
      </div>

      {!deadlineBannerHidden && (
        <div className="md:hidden flex items-center gap-3 bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-3 rounded-xl">
          <FiClock className="w-5 h-5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Heute fällig</p>
            <p className="text-xs">{dashboard.deadlineLabel}</p>
        </div>
            <button
            onClick={() => setDeadlineBannerHidden(true)}
            className="p-1 text-yellow-700 hover:text-yellow-900"
          >
            <FiX className="w-4 h-4" />
            </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <FiAlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow p-4 flex items-center gap-3 border border-gray-100">
            <div className={`p-3 rounded-lg ${card.accent}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-semibold text-gray-900">{card.value}</p>
                        </div>
                        </div>
        ))}
            </div>

      <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
        <div className="flex flex-wrap gap-6 items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Erledigt</p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">{completionRate}%</span>
              <span className="text-sm text-gray-500">{progressLabel} Produkte</span>
                    </div>
                  </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm">
              <FiTrash2 className="text-red-500" />
              <span>
                {dashboard.actionSummary?.removeToday?.processed || 0} /{' '}
                {dashboard.actionSummary?.removeToday?.total || 0} entfernt
                      </span>
                    </div>
            <div className="flex items-center gap-2 text-sm">
              <FiTag className="text-amber-500" />
              <span>
                {dashboard.actionSummary?.labelSoon?.processed || 0} /{' '}
                {dashboard.actionSummary?.labelSoon?.total || 0} etikettiert
                      </span>
                    </div>
                    </div>
                          </div>
        <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all"
            style={{ width: `${completionRate}%` }}
          />
                    </div>
                </div>

      {(dashboard.categories?.length ?? 0) === 0 ? (
              <EmptyState
          icon={FiInfo}
          title="Keine Aufgaben heute"
          message="Es gibt aktuell keine Produkte innerhalb der nächsten Tage."
              />
            ) : (
        <div className="space-y-5">
          {dashboard.categories.map((category) => (
            <div key={category.id} className="bg-white rounded-2xl shadow border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold">
                    {category.productCount}
                        </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-xs text-gray-500">
                      {category.pendingCount} offen • {category.processedCount} erledigt
                    </p>
                        </div>
                        </div>
                <div className="flex gap-3 text-xs font-medium">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700">
                    <FiTrash2 className="w-3 h-3" />
                    {category.summary.removeToday.total}
                              </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                          <FiTag className="w-3 h-3" />
                    {category.summary.labelSoon.total}
                        </span>
                  </div>
                </div>
              <div className="divide-y">
                {category.products.map((product) => (
                  <div
                    key={product.id}
                    className={`p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-opacity ${
                      product.isProcessed ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="space-y-2 w-full min-w-0 md:min-w-[520px]">
                      <div className="flex items-center gap-3">
                        <p className="text-base font-semibold text-gray-900">{product.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {product.isProcessed && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                              <FiCheckCircle className="w-3 h-3" />
                              Erledigt
                        </span>
                      )}
                          {getActionBadge(product) && (() => {
                            const badge = getActionBadge(product);
                            const Icon = badge.icon;
                              return (
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${badge.className}`}>
                                <Icon className="w-3 h-3" />
                                {badge.label}
                                      </span>
                            );
                          })()}
                          {product.excludeFromExpiryCheck && !product.isProcessed && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-full">
                              <FiPower className="w-3 h-3" />
                                            Deaktiviert
                                          </span>
                                      )}
                                    </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                                  {product.barcode && (
                          <span className="inline-flex items-center gap-1">
                            <FiInfo className="w-4 h-4" /> {product.barcode}
                                  </span>
                        )}
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <FiCalendar className="w-4 h-4" />
                          {formatExpiryDate(product.expiryDate)}
                                  </span>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <FiClock className="w-4 h-4" />
                          {formatDaysUntil(product.daysUntilExpiry)}
                                  </span>
                                </div>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 md:flex-nowrap md:justify-end">
                      {product.taskType === 'reduzieren' ? (
                        <>
                                        <button
                            onClick={() => handleLabelProduct(product)}
                            disabled={pendingQuickAction === product.id || product.isProcessed}
                            className="w-full sm:flex-1 md:flex-none md:w-auto min-w-[120px] inline-flex justify-center items-center gap-1.5 px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60"
                                        >
                            <FiTag className="w-3.5 h-3.5" />
                            Reduzieren
                                        </button>
                                      <button
                            onClick={() => openActionDialog(product, 'date')}
                            className="w-full sm:flex-1 md:flex-none md:w-auto min-w-[120px] inline-flex justify-center items-center gap-1.5 px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                      >
                            <FiCalendar className="w-3.5 h-3.5" />
                                        Neues Datum
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                        <button
                            onClick={() => openActionDialog(product, 'remove')}
                            className="w-full sm:flex-1 md:flex-none md:w-auto min-w-[120px] inline-flex justify-center items-center gap-1.5 px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg text-white bg-red-500 hover:bg-red-600"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                                          Aussortieren
                                        </button>
                                        <button
                            onClick={() => handleDeactivateProduct(product)}
                            disabled={pendingDeactivateId === product.id}
                            className="w-full sm:flex-1 md:flex-none md:w-auto min-w-[120px] inline-flex justify-center items-center gap-1.5 px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                        >
                            <FiPower className="w-3.5 h-3.5" />
                                          Deaktivieren
                                        </button>
                                          <button
                            onClick={() => openActionDialog(product, 'date')}
                            className="w-full sm:flex-1 md:flex-none md:w-auto min-w-[120px] inline-flex justify-center items-center gap-1.5 px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <FiCalendar className="w-3.5 h-3.5" />
                                          Neues Datum
                                        </button>
                                      </>
                                    )}
                                  </div>
                            </div>
                ))}
                      </div>
              </div>
          ))}
            </div>
      )}

      {/* Action Dialog */}
      {actionDialog.type && actionDialog.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                <p className="text-sm text-gray-500">Produkt</p>
                <h4 className="text-lg font-semibold text-gray-900">{actionDialog.product.name}</h4>
                    </div>
              <button onClick={closeActionDialog} className="p-2 text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
                    </button>
                </div>
            <div className="px-5 py-4 space-y-4">
              {actionDialog.type === 'remove' && (
                <>
                  <label className="text-sm font-medium text-gray-700">Neues MHD *</label>
                  <input
                    type="date"
                    value={actionForm.newExpiryDate}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, newExpiryDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Notiz</label>
                  <textarea
                    value={actionForm.note || ''}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, note: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
          </>
        )}
              {actionDialog.type === 'date' && (
                <>
                  <label className="text-sm font-medium text-gray-700">Neues MHD *</label>
                  <input
                    type="date"
                    value={actionForm.newExpiryDate}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, newExpiryDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Notiz</label>
                  <textarea
                    value={actionForm.note || ''}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, note: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </>
              )}
                </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 justify-end">
                  <button
                onClick={closeActionDialog}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                disabled={savingAction}
                  >
                    Abbrechen
                  </button>
                  <button
                onClick={handleActionSubmit}
                disabled={savingAction}
                className="px-4 py-2 text-sm rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              >
                Speichern
                  </button>
                </div>
              </div>
        </div>
      )}

      {/* Settings Dialog */}
      {settingsDialogOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">MHD-Einstellungen</h3>
              <button onClick={() => setSettingsDialogOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
                  </button>
                </div>
            <div className="px-5 py-4 space-y-4">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={settingsForm.enabled}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                />
                Verwaltung aktiv
                    </label>
              <div>
                <label className="text-sm font-medium text-gray-700">Warnstufe (Tage)</label>
                    <input
                      type="number"
                  min={1}
                  value={settingsForm.warningDays}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, warningDays: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                <label className="text-sm font-medium text-gray-700">Kritische Stufe (Tage)</label>
                    <input
                      type="number"
                  min={0}
                  value={settingsForm.criticalDays}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, criticalDays: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tägliche Deadline</label>
                    <input
                  type="time"
                  value={settingsForm.processingDeadline}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, processingDeadline: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                </div>
                </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 justify-end">
                  <button
                onClick={() => setSettingsDialogOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                disabled={savingSettings}
                  >
                    Abbrechen
                  </button>
                  <button
                onClick={handleSettingsSave}
                disabled={savingSettings}
                className="px-4 py-2 text-sm rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Speichern
                  </button>
                </div>
              </div>
                </div>
      )}
    </div>
  );
}

export default ExpiryManagement;

