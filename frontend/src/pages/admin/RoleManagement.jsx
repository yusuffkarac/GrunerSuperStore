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
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import { Add, Edit, Delete, Security } from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog states
  const [roleDialog, setRoleDialog] = useState({ open: false, mode: 'create', role: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });

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
    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [rolesRes, permissionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/roles`, config),
        axios.get(`${API_URL}/api/admin/permissions`, config),
      ]);

      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data.all || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, role = null) => {
    if (mode === 'edit' && role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        permissionIds: role.permissions.map(p => p.id),
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
        await axios.post(`${API_URL}/api/admin/roles`, formData, config);
        setSuccess('Rol başarıyla oluşturuldu');
      } else {
        await axios.patch(`${API_URL}/api/admin/roles/${roleDialog.role.id}`, formData, config);
        setSuccess('Rol başarıyla güncellendi');
      }

      handleCloseDialog();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'İşlem sırasında hata oluştu');
    }
  };

  const handleDeleteRole = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_URL}/api/admin/roles/${deleteDialog.role.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Rol başarıyla silindi');
      setDeleteDialog({ open: false, role: null });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Rol silinirken hata oluştu');
    }
  };

  const togglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  // İzinleri kategorilere göre grupla
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

  const categoryNames = {
    products: 'Ürün Yönetimi',
    orders: 'Sipariş Yönetimi',
    users: 'Kullanıcı Yönetimi',
    expiry: 'SKT Yönetimi',
    marketing: 'Pazarlama',
    settings: 'Ayarlar',
    admin: 'Admin Yönetimi',
    other: 'Diğer',
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
          Rol ve İzin Yönetimi
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog('create')}
        >
          Yeni Rol Oluştur
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

      <Paper sx={{ p: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rol Adı</TableCell>
                <TableCell>Açıklama</TableCell>
                <TableCell>İzin Sayısı</TableCell>
                <TableCell>Admin Sayısı</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {role.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{role.description || '-'}</TableCell>
                  <TableCell>
                    <Chip label={`${role.permissions?.length || 0} izin`} size="small" color="primary" />
                  </TableCell>
                  <TableCell>{role.adminCount || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={role.isActive ? 'Aktif' : 'Pasif'}
                      color={role.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Düzenle">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog('edit', role)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialog({ open: true, role })}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {roles.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary">
                      Henüz rol oluşturulmamış
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ROL OLUŞTUR/DÜZENLE DİALOGU */}
      <Dialog
        open={roleDialog.open}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {roleDialog.mode === 'create' ? 'Yeni Rol Oluştur' : 'Rolü Düzenle'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Rol Adı"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Açıklama"
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 3 }}
          />

          <Typography variant="h6" gutterBottom>
            İzinler
          </Typography>

          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <Box key={category} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {categoryNames[category] || category}
              </Typography>
              <Grid container spacing={1}>
                {perms.map((permission) => (
                  <Grid item xs={12} sm={6} md={4} key={permission.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.permissionIds.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                        />
                      }
                      label={permission.displayName}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button
            variant="contained"
            onClick={handleSaveRole}
            disabled={!formData.name}
          >
            {roleDialog.mode === 'create' ? 'Oluştur' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SİLME ONAYI DİALOGU */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, role: null })}
      >
        <DialogTitle>Rolü Sil</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteDialog.role?.name}</strong> rolünü silmek istediğinizden emin misiniz?
          </Typography>
          {deleteDialog.role?.adminCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Bu rol {deleteDialog.role.adminCount} admin tarafından kullanılıyor. Önce bu adminlerin rollerini değiştirmelisiniz.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, role: null })}>
            İptal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteRole}
            disabled={deleteDialog.role?.adminCount > 0}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default RoleManagement;
