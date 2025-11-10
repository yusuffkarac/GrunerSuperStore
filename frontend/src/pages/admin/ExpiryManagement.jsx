import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlGroup,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Warning,
  Error,
  Label,
  Delete,
  Undo,
  History,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function ExpiryManagement() {
  const [criticalProducts, setCriticalProducts] = useState([]);
  const [warningProducts, setWarningProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({ enabled: true, warningDays: 3, criticalDays: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Dialog states
  const [removeDialog, setRemoveDialog] = useState({ open: false, product: null });
  const [labelDialog, setLabelDialog] = useState({ open: false, product: null });
  const [settingsDialog, setSettingsDialog] = useState(false);

  // Form states
  const [excludeFromCheck, setExcludeFromCheck] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [criticalRes, warningRes, historyRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/expiry/critical`, config),
        axios.get(`${API_URL}/api/admin/expiry/warning`, config),
        axios.get(`${API_URL}/api/admin/expiry/history?limit=50`, config),
        axios.get(`${API_URL}/api/admin/expiry/settings`, config),
      ]);

      setCriticalProducts(criticalRes.data);
      setWarningProducts(warningRes.data);
      setHistory(historyRes.data.actions || []);
      setSettings(settingsRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async () => {
    if (!removeDialog.product) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/api/admin/expiry/remove/${removeDialog.product.id}`,
        { excludeFromCheck, note },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Ürün başarıyla raftan kaldırıldı');
      setRemoveDialog({ open: false, product: null });
      setExcludeFromCheck(false);
      setNote('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'İşlem sırasında hata oluştu');
    }
  };

  const handleLabelProduct = async () => {
    if (!labelDialog.product) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/api/admin/expiry/label/${labelDialog.product.id}`,
        { note },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Ürün başarıyla etiketlendi');
      setLabelDialog({ open: false, product: null });
      setNote('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'İşlem sırasında hata oluştu');
    }
  };

  const handleUndoAction = async (actionId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${API_URL}/api/admin/expiry/undo/${actionId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('İşlem başarıyla geri alındı');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Geri alma sırasında hata oluştu');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `${API_URL}/api/admin/expiry/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Ayarlar başarıyla güncellendi');
      setSettingsDialog(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Ayarlar güncellenirken hata oluştu');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getActionTypeLabel = (type) => {
    const types = {
      labeled: 'Etiketlendi',
      removed: 'Kaldırıldı',
      undone: 'Geri Alındı',
    };
    return types[type] || type;
  };

  const getActionTypeColor = (type) => {
    const colors = {
      labeled: 'warning',
      removed: 'error',
      undone: 'info',
    };
    return colors[type] || 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Son Kullanma Tarihi (SKT) Yönetimi
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setSettingsDialog(true)}
        >
          Ayarlar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Kritik Ürünler (${criticalProducts.length})`} icon={<Error />} />
        <Tab label={`Uyarı Ürünleri (${warningProducts.length})`} icon={<Warning />} />
        <Tab label="İşlem Geçmişi" icon={<History />} />
      </Tabs>

      {/* KRİTİK ÜRÜNLER TABLOSU (KIRMIZI) */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3, border: '3px solid #d32f2f' }}>
          <Typography variant="h6" gutterBottom color="error" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Error /> Son Günü Gelen Ürünler (Raftan Kaldırılmalı)
          </Typography>

          {criticalProducts.length === 0 ? (
            <Alert severity="info">Kritik seviyede ürün bulunmuyor.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ürün Adı</TableCell>
                    <TableCell>Barkod</TableCell>
                    <TableCell>Kategori</TableCell>
                    <TableCell>SKT</TableCell>
                    <TableCell>Kalan Gün</TableCell>
                    <TableCell>Stok</TableCell>
                    <TableCell>Son İşlem</TableCell>
                    <TableCell align="right">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {criticalProducts.map((product) => (
                    <TableRow key={product.id} sx={{ bgcolor: '#ffebee' }}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.barcode || '-'}</TableCell>
                      <TableCell>{product.category?.name}</TableCell>
                      <TableCell>{formatDate(product.expiryDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${product.daysUntilExpiry} gün`}
                          color="error"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        {product.lastAction ? (
                          <Chip
                            label={getActionTypeLabel(product.lastAction.actionType)}
                            color={getActionTypeColor(product.lastAction.actionType)}
                            size="small"
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<Delete />}
                          onClick={() => setRemoveDialog({ open: true, product })}
                        >
                          Kaldırdım
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* UYARI ÜRÜNLERİ TABLOSU (TURUNCU) */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3, border: '3px solid #ed6c02' }}>
          <Typography variant="h6" gutterBottom color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning /> İndirim Etiketi Yapıştırılmalı
          </Typography>

          {warningProducts.length === 0 ? (
            <Alert severity="info">Uyarı seviyesinde ürün bulunmuyor.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ürün Adı</TableCell>
                    <TableCell>Barkod</TableCell>
                    <TableCell>Kategori</TableCell>
                    <TableCell>SKT</TableCell>
                    <TableCell>Kalan Gün</TableCell>
                    <TableCell>Stok</TableCell>
                    <TableCell>Son İşlem</TableCell>
                    <TableCell align="right">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {warningProducts.map((product) => (
                    <TableRow key={product.id} sx={{ bgcolor: '#fff3e0' }}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.barcode || '-'}</TableCell>
                      <TableCell>{product.category?.name}</TableCell>
                      <TableCell>{formatDate(product.expiryDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${product.daysUntilExpiry} gün`}
                          color="warning"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        {product.lastAction ? (
                          <Chip
                            label={getActionTypeLabel(product.lastAction.actionType)}
                            color={getActionTypeColor(product.lastAction.actionType)}
                            size="small"
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          startIcon={<Label />}
                          onClick={() => setLabelDialog({ open: true, product })}
                        >
                          Etiketledim
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* İŞLEM GEÇMİŞİ */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            İşlem Geçmişi
          </Typography>

          {history.length === 0 ? (
            <Alert severity="info">Henüz işlem kaydı bulunmuyor.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tarih</TableCell>
                    <TableCell>İşlem</TableCell>
                    <TableCell>Ürün</TableCell>
                    <TableCell>SKT</TableCell>
                    <TableCell>Kalan Gün</TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell>Not</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell align="right">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((action) => (
                    <TableRow key={action.id} sx={{ opacity: action.isUndone ? 0.5 : 1 }}>
                      <TableCell>{formatDate(action.createdAt)}</TableCell>
                      <TableCell>
                        <Chip
                          label={getActionTypeLabel(action.actionType)}
                          color={getActionTypeColor(action.actionType)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{action.product?.name}</TableCell>
                      <TableCell>{formatDate(action.expiryDate)}</TableCell>
                      <TableCell>{action.daysUntilExpiry} gün</TableCell>
                      <TableCell>{action.admin?.firstName}</TableCell>
                      <TableCell>{action.note || '-'}</TableCell>
                      <TableCell>
                        {action.isUndone ? (
                          <Chip label="Geri Alındı" color="default" size="small" />
                        ) : action.excludedFromCheck ? (
                          <Chip label="SKT Muaf" color="info" size="small" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {!action.isUndone && action.actionType !== 'undone' && (
                          <Tooltip title="Geri Al">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleUndoAction(action.id)}
                            >
                              <Undo />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* KALDIRMA DİALOGU */}
      <Dialog open={removeDialog.open} onClose={() => setRemoveDialog({ open: false, product: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Ürünü Raftan Kaldır</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            <strong>{removeDialog.product?.name}</strong> ürününü raftan kaldırdığınızı onaylıyor musunuz?
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={excludeFromCheck}
                onChange={(e) => setExcludeFromCheck(e.target.checked)}
              />
            }
            label="Bu ürünü SKT kontrollerinden muaf tut (deaktif et)"
            sx={{ mt: 2, mb: 2 }}
          />

          <TextField
            fullWidth
            label="Not (İsteğe bağlı)"
            multiline
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialog({ open: false, product: null })}>İptal</Button>
          <Button variant="contained" color="error" onClick={handleRemoveProduct}>
            Kaldırdım
          </Button>
        </DialogActions>
      </Dialog>

      {/* ETİKETLEME DİALOGU */}
      <Dialog open={labelDialog.open} onClose={() => setLabelDialog({ open: false, product: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Ürünü Etiketle</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            <strong>{labelDialog.product?.name}</strong> ürününe indirim etiketi yapıştırdığınızı onaylıyor musunuz?
          </Typography>

          <TextField
            fullWidth
            label="Not (İsteğe bağlı)"
            multiline
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLabelDialog({ open: false, product: null })}>İptal</Button>
          <Button variant="contained" color="warning" onClick={handleLabelProduct}>
            Etiketledim
          </Button>
        </DialogActions>
      </Dialog>

      {/* AYARLAR DİALOGU */}
      <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>SKT Yönetim Ayarları</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="number"
            label="Turuncu Uyarı (Kaç gün kala etiket yapıştırılsın?)"
            value={settings.warningDays}
            onChange={(e) => setSettings({ ...settings, warningDays: parseInt(e.target.value) })}
            sx={{ mt: 2, mb: 2 }}
          />

          <TextField
            fullWidth
            type="number"
            label="Kırmızı Kritik (Kaç gün kala raftan kaldırılsın?)"
            value={settings.criticalDays}
            onChange={(e) => setSettings({ ...settings, criticalDays: parseInt(e.target.value) })}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              />
            }
            label="SKT Yönetimi Aktif"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleUpdateSettings}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ExpiryManagement;
