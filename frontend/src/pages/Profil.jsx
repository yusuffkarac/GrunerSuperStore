import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMapPin, FiLogOut, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiPackage } from 'react-icons/fi';
import useAuthStore from '../store/authStore';
import userService from '../services/userService';
import { useAlert } from '../contexts/AlertContext';
import { cleanRequestData } from '../utils/requestUtils';

function Profil() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const returnTo = location.state?.returnTo;
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [saving, setSaving] = useState(false);
  const { user, logout } = useAuthStore();
  const { showConfirm } = useAlert();

  // Adres form state
  const [formData, setFormData] = useState({
    title: '',
    street: '',
    houseNumber: '',
    addressLine2: '',
    district: '',
    postalCode: '',
    city: '',
    state: '',
    description: '',
    isDefault: false,
  });

  useEffect(() => {
    if (activeTab === 'addresses') {
      loadAddresses();
    }
  }, [activeTab]);

  // Modal kapandığında adresleri yeniden yükle
  useEffect(() => {
    if (!showAddressModal && activeTab === 'addresses') {
      // Modal kapandıktan sonra adresleri yeniden yükle
      const timer = setTimeout(() => {
        loadAddresses();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddressModal, activeTab]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const response = await userService.getAddresses();
      console.log('Adres response:', response);
      // API interceptor response.data döndüğü için direkt response'u kontrol et
      const addressesList = response?.data?.addresses || response?.addresses || [];
      console.log('Adres listesi:', addressesList);
      setAddresses(addressesList);
      if (addressesList.length === 0) {
        console.log('Keine Adressen gefunden');
      }
    } catch (error) {
      console.error('Adres yükleme hatası:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Fehler beim Laden der Adressen';
      toast.error(errorMessage);
      setAddresses([]); // Hata durumunda listeyi temizle
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm('Möchten Sie sich wirklich abmelden?');
    if (confirmed) {
      logout();
      navigate('/');
      toast.success('Erfolgreich abgemeldet');
    }
  };

  const handleDeleteAddress = async (id) => {
    const confirmed = await showConfirm('Adresse wirklich löschen?');
    if (confirmed) {
      try {
        await userService.deleteAddress(id);
        toast.success('Adresse gelöscht');
        loadAddresses();
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await userService.setDefaultAddress(id);
      toast.success('Standard-Adresse festgelegt');
      loadAddresses();
    } catch (error) {
      toast.error('Fehler');
    }
  };

  // Modal aç/kapat
  const openAddModal = () => {
    setEditingAddress(null);
    setFormData({
      title: '',
      street: '',
      houseNumber: '',
      addressLine2: '',
      district: '',
      postalCode: '',
      city: '',
      state: '',
      description: '',
      isDefault: false,
    });
    setShowAddressModal(true);
  };

  const openEditModal = (address) => {
    setEditingAddress(address);
    setFormData({
      title: address.title || '',
      street: address.street || '',
      houseNumber: address.houseNumber || '',
      addressLine2: address.addressLine2 || '',
      district: address.district || '',
      postalCode: address.postalCode || '',
      city: address.city || '',
      state: address.state || '',
      description: address.description || '',
      isDefault: address.isDefault || false,
    });
    setShowAddressModal(true);
  };

  const closeModal = () => {
    setShowAddressModal(false);
    setEditingAddress(null);
  };

  // Form değişiklikleri
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Adres kaydet
  const handleSaveAddress = async () => {
    // Validasyon
    if (!formData.title.trim()) {
      toast.error('Adresstitel ist erforderlich');
      return;
    }
    if (!formData.street.trim()) {
      toast.error('Straße ist erforderlich');
      return;
    }
    if (!formData.houseNumber.trim()) {
      toast.error('Hausnummer ist erforderlich');
      return;
    }
    if (!formData.postalCode.trim() || !/^\d{5}$/.test(formData.postalCode)) {
      toast.error('PLZ muss 5 Ziffern haben');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('Stadt ist erforderlich');
      return;
    }
    if (!formData.state.trim()) {
      toast.error('Bundesland ist erforderlich');
      return;
    }

    setSaving(true);

    try {
      // Boş string'leri, null ve undefined değerleri temizle
      const cleanedData = cleanRequestData(formData);

      if (editingAddress) {
        // Güncelle
        const response = await userService.updateAddress(editingAddress.id, cleanedData);
        console.log('Adres güncellendi:', response);
        toast.success('Adresse aktualisiert');
      } else {
        // Yeni ekle
        const response = await userService.createAddress(cleanedData);
        console.log('Adres eklendi:', response);
        toast.success('Adresse hinzugefügt');
      }
      closeModal();
      // Modal kapandıktan sonra kısa bir gecikme ile adresleri yükle
      setTimeout(() => {
        loadAddresses();
        // Eğer returnTo varsa (SiparisVer'den geldiyse), geri dön
        if (returnTo) {
          navigate(returnTo, { state: { refreshAddresses: true } });
        }
      }, 300);
    } catch (error) {
      console.error('Adres kaydetme hatası:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Fehler beim Speichern';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-mobile py-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mein Profil</h1>

      {/* Siparişlerim kısayolu */}
      <button
        onClick={() => navigate('/siparislerim')}
        className="w-full mb-4 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <FiPackage />
        Siparişlerim
      </button>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'profile'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600'
          }`}
        >
          <FiUser className="inline mr-2" />
          Profil
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'addresses'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600'
          }`}
        >
          <FiMapPin className="inline mr-2" />
          Adressen
        </button>
      </div>

      {/* Profil Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500">Name</label>
              <p className="font-medium">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">E-Mail</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Telefon</label>
              <p className="font-medium">{user?.phone || '-'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-6 bg-red-50 text-red-600 py-3 rounded-lg font-medium hover:bg-red-100 flex items-center justify-center gap-2"
          >
            <FiLogOut />
            Abmelden
          </button>
        </div>
      )}

      {/* Adres Tab */}
      {activeTab === 'addresses' && (
        <div>
          <button
            onClick={openAddModal}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2 mb-4"
          >
            <FiPlus />
            Neue Adresse
          </button>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <FiMapPin className="mx-auto text-4xl mb-2 text-gray-400" />
              <p>Keine Adressen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{address.title}</p>
                      {address.isDefault && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                          <FiCheck /> Standard
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(address)}
                        className="text-gray-400 hover:text-green-600"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {address.street} {address.houseNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.postalCode} {address.city}, {address.state}
                  </p>
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="text-sm text-green-600 mt-2 hover:text-green-700"
                    >
                      Als Standard festlegen
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Adres Ekleme/Düzenleme Modal */}
      <AnimatePresence>
        {showAddressModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-x-0 bottom-0 z-[9999] bg-white rounded-t-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingAddress ? 'Adresse bearbeiten' : 'Neue Adresse'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Adresstitel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Adresstitel <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="z.B. Zuhause, Büro"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Straße */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Straße <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="Straßenname"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Hausnummer ve Adresszeile 2 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Hausnummer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="houseNumber"
                      value={formData.houseNumber}
                      onChange={handleInputChange}
                      placeholder="Nr."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Adresszeile 2
                    </label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* PLZ und Stadt */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      PLZ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="12345"
                      maxLength={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Stadt <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Stadt"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Bezirk und Bundesland */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Bezirk
                    </label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Bundesland <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Bundesland"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Beschreibung */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Beschreibung
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Weitere Hinweise (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>

                {/* Als Standard festlegen */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isDefault"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">
                    Als Standard-Adresse festlegen
                  </label>
                </div>

                {/* Butonlar */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Speichern...
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-4 h-4" />
                        Speichern
                      </>
                    )}
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

export default Profil;
