import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMapPin, FiLogOut, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiPackage, FiMail, FiSave, FiInfo, FiAlertCircle } from 'react-icons/fi';
import useAuthStore from '../store/authStore';
import userService from '../services/userService';
import settingsService from '../services/settingsService';
import { useAlert } from '../contexts/AlertContext';
import { cleanRequestData } from '../utils/requestUtils';
import { calculateDistance } from '../utils/distance';
import addressSearchService from '../services/addressSearch.service';
import Switch from '../components/common/Switch';

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
  const { user, logout, isAuthenticated } = useAuthStore();
  const { showConfirm } = useAlert();
  const [storeLocation, setStoreLocation] = useState(null);
  const [distanceToStore, setDistanceToStore] = useState(null);
  const [roadDistance, setRoadDistance] = useState(null);
  const [loadingDistance, setLoadingDistance] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [emailChangeData, setEmailChangeData] = useState({
    newEmail: '',
    code: '',
  });
  const [emailChangeStep, setEmailChangeStep] = useState('request'); // 'request' veya 'verify'
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);

  // Giriş kontrolü - giriş yapmayan kullanıcıları login sayfasına yönlendir
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!isAuthenticated && !token && !user) {
      navigate('/anmelden', { state: { from: '/profil' } });
    }
  }, [isAuthenticated, user, navigate]);

  // Desktop-Prüfung
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Profil bilgilerini yükle (sayfa yüklendiğinde)
  useEffect(() => {
    const loadProfile = async () => {
      // Token kontrolü - token yoksa refresh yapma
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Token bulunamadı, profil yenileme atlandı');
        return;
      }

      try {
        await useAuthStore.getState().refreshProfile();
      } catch (error) {
        console.error('Profil yükleme hatası:', error);
        // Hata durumunda logout yapma - API interceptor zaten yapıyor
      }
    };
    loadProfile();
  }, []);

  // Profil formunu kullanıcı bilgileriyle doldur
  useEffect(() => {
    if (user) {
      setProfileFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Adressformular-State
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
    latitude: null,
    longitude: null,
    isDefault: false,
  });

  useEffect(() => {
    if (activeTab === 'addresses') {
      loadAddresses();
      loadStoreLocation();
    }
  }, [activeTab]);

  // Marktstandort laden
  const loadStoreLocation = async () => {
    try {
      const response = await settingsService.getSettings();
      const storeLoc = response?.data?.settings?.storeSettings?.storeLocation;
      if (storeLoc?.latitude && storeLoc?.longitude) {
        setStoreLocation({
          latitude: storeLoc.latitude,
          longitude: storeLoc.longitude,
        });
      }
      } catch (error) {
        console.error('Marktstandort konnte nicht geladen werden:', error);
      }
  };

  // Marktstandort laden, wenn Modal geöffnet wird
  useEffect(() => {
    if (showAddressModal && !storeLocation) {
      loadStoreLocation();
    }
  }, [showAddressModal]);

  // Straßenentfernung berechnen
  const calculateRoadDistance = useCallback(async () => {
    if (
      !storeLocation ||
      formData.latitude === null ||
      formData.latitude === undefined ||
      formData.longitude === null ||
      formData.longitude === undefined
    ) {
      return;
    }

    setLoadingDistance(true);
    try {
      const response = await userService.calculateDistance({
        originLat: formData.latitude,
        originLon: formData.longitude,
        destLat: storeLocation.latitude,
        destLon: storeLocation.longitude,
      });
      
      console.log('[Profil] calculateRoadDistance Antwort:', response);
      console.log('[Profil] response:', response);
      console.log('[Profil] response.data:', response?.data);
      console.log('[Profil] response.data?.distance:', response?.data?.distance);
      
      // api interceptor zaten response.data döndürüyor, bu yüzden response = { success: true, data: { distance: ... } }
      if (response?.success && response?.data?.distance !== null && response?.data?.distance !== undefined) {
        console.log('[Profil] roadDistance wird gesetzt:', response.data.distance);
        setRoadDistance(response.data.distance);
      } else {
        console.warn('[Profil] roadDistance null - Antwort:', response);
        setRoadDistance(null);
      }
    } catch (error) {
      console.error('[Profil] Straßenentfernung konnte nicht berechnet werden:', error);
      setRoadDistance(null);
    } finally {
      setLoadingDistance(false);
    }
  }, [storeLocation, formData.latitude, formData.longitude]);

  // Entfernung berechnen (wenn latitude/longitude sich ändern)
  useEffect(() => {
    if (
      storeLocation &&
      formData.latitude !== null &&
      formData.latitude !== undefined &&
      formData.longitude !== null &&
      formData.longitude !== undefined
    ) {
      // Luftlinie berechnen (sofort)
      const distance = calculateDistance(
        formData.latitude,
        formData.longitude,
        storeLocation.latitude,
        storeLocation.longitude
      );
      setDistanceToStore(Math.round(distance * 100) / 100); // Auf 2 Dezimalstellen runden

      // Straßenentfernung berechnen (mit OpenRouteService)
      calculateRoadDistance();
    } else {
      setDistanceToStore(null);
      setRoadDistance(null);
    }
  }, [formData.latitude, formData.longitude, storeLocation, calculateRoadDistance]);

  // Adressen neu laden, wenn Modal geschlossen wird
  useEffect(() => {
    if (!showAddressModal && activeTab === 'addresses') {
      // Adressen nach dem Schließen des Modals neu laden
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
      console.log('Adress-Response:', response);
      // API interceptor response.data döndüğü için direkt response'u kontrol et
      const addressesList = response?.data?.addresses || response?.addresses || [];
      console.log('Adressliste:', addressesList);
      setAddresses(addressesList);
      if (addressesList.length === 0) {
        console.log('Keine Adressen gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Adressen:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Fehler beim Laden der Adressen';
      toast.error(errorMessage);
      setAddresses([]); // Liste bei Fehler leeren
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

  // Profil düzenleme
  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    // Formu kullanıcı bilgileriyle sıfırla
    if (user) {
      setProfileFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await userService.updateProfile(profileFormData);
      // API interceptor zaten response.data döndürüyor
      // Backend'den gelen: { success: true, message: '...', data: { user: {...} } }
      // Interceptor'dan gelen: { success: true, message: '...', data: { user: {...} } }
      // userService.updateProfile() direkt response döndürüyor
      if (response?.data?.user) {
        const { user: updatedUser } = response.data;
        useAuthStore.getState().setUser(updatedUser);
        // Profil bilgilerini yeniden yükle (güncel bilgiler için)
        await useAuthStore.getState().refreshProfile();
        toast.success('Profil erfolgreich aktualisiert');
        setIsEditingProfile(false);
      } else {
        // Debug için log ekle
        console.error('Unexpected response format:', response);
        throw new Error('Ungültige Antwort vom Server');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Fehler beim Aktualisieren des Profils';
      toast.error(errorMessage);
    } finally {
      setSavingProfile(false);
    }
  };

  // Email değişikliği
  const handleRequestEmailChange = async () => {
    // Email validasyonu - daha sıkı kontrol
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailChangeData.newEmail || !emailRegex.test(emailChangeData.newEmail)) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    // Email formatını normalize et (küçük harfe çevir, trim)
    const normalizedEmail = emailChangeData.newEmail.toLowerCase().trim();
    const currentEmail = user?.email ? user.email.toLowerCase().trim() : '';

    // Debug: Email karşılaştırması
    console.log('Email karşılaştırması:', {
      newEmail: normalizedEmail,
      currentEmail: currentEmail,
      areEqual: normalizedEmail === currentEmail,
      userEmail: user?.email
    });

    // Mevcut email ile aynı olup olmadığını kontrol et
    if (currentEmail && normalizedEmail === currentEmail) {
      toast.error('Die neue E-Mail-Adresse muss sich von der aktuellen unterscheiden');
      return;
    }

    setSendingEmailCode(true);
    try {
      await userService.requestEmailChange(normalizedEmail);
      toast.success('Bestätigungscode wurde an die neue E-Mail-Adresse gesendet');
      setEmailChangeStep('verify');
      // Normalize edilmiş email'i state'e kaydet
      setEmailChangeData(prev => ({ ...prev, newEmail: normalizedEmail }));
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Fehler beim Senden des Bestätigungscodes';
      toast.error(errorMessage);
    } finally {
      setSendingEmailCode(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    if (!emailChangeData.code || emailChangeData.code.length !== 6) {
      toast.error('Bitte geben Sie den 6-stelligen Bestätigungscode ein');
      return;
    }

    setVerifyingEmailCode(true);
    try {
      const response = await userService.verifyEmailChange(emailChangeData.code);
      // API interceptor zaten response.data döndürüyor
      // Backend'den gelen: { success: true, message: '...', data: { user: {...} } }
      // Interceptor'dan gelen: { success: true, message: '...', data: { user: {...} } }
      // userService.verifyEmailChange() direkt response döndürüyor
      if (response?.data?.user) {
        const { user: updatedUser } = response.data;
        useAuthStore.getState().setUser(updatedUser);
        // Profil bilgilerini yeniden yükle (güncel email için)
        await useAuthStore.getState().refreshProfile();
        toast.success('E-Mail-Adresse erfolgreich geändert');
        setShowEmailChangeModal(false);
        setEmailChangeStep('request');
        setEmailChangeData({ newEmail: '', code: '' });
      } else {
        // Debug için log ekle
        console.error('Unexpected response format:', response);
        throw new Error('Ungültige Antwort vom Server');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Fehler beim Bestätigen der E-Mail-Adresse';
      toast.error(errorMessage);
      
      // Eğer "Keine E-Mail-Änderungsanfrage gefunden" hatası varsa, request adımına dön
      if (errorMessage.includes('Keine E-Mail-Änderungsanfrage gefunden')) {
        setEmailChangeStep('request');
        setEmailChangeData({ newEmail: '', code: '' });
        toast.info('Bitte fordern Sie zuerst eine E-Mail-Änderung an');
      } else {
        // Diğer hatalarda newEmail'i koru, sadece kodu temizle
        setEmailChangeData(prev => ({ ...prev, code: '' }));
      }
    } finally {
      setVerifyingEmailCode(false);
    }
  };

  const handleCloseEmailChangeModal = () => {
    // Modal kapatıldığında her şeyi sıfırla
    setShowEmailChangeModal(false);
    setEmailChangeStep('request');
    setEmailChangeData({ newEmail: '', code: '' });
  };

  // Modal açıldığında state'i sıfırla
  const handleOpenEmailChangeModal = () => {
    setEmailChangeStep('request');
    setEmailChangeData({ newEmail: '', code: '' });
    setShowEmailChangeModal(true);
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

  // Modal öffnen/schließen
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
      latitude: null,
      longitude: null,
      isDefault: false,
    });
    setDistanceToStore(null);
    setRoadDistance(null);
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
      latitude: address.latitude || null,
      longitude: address.longitude || null,
      isDefault: address.isDefault || false,
    });
    setShowAddressModal(true);
  };

  const closeModal = () => {
    setShowAddressModal(false);
    setEditingAddress(null);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  };

  // Formularänderungen
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Automatische Suche, wenn Straßenname geändert wird
    if (name === 'street' && value.length >= 3) {
      handleStreetSearch(value);
    } else if (name === 'street' && value.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Straßenname-Suche (mit Debounce)
  const handleStreetSearch = async (query) => {
    // Vorherigen Timeout löschen
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Neuen Timeout erstellen (500ms Debounce)
    const timeout = setTimeout(async () => {
      if (!query || query.trim().length < 3) {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setSearchingAddress(true);
      try {
        const results = await addressSearchService.searchAddress(query, { limit: 5 });
        setAddressSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('[Profil] Adres arama hatası:', error);
        setAddressSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setSearchingAddress(false);
      }
    }, 500);

    setSearchTimeout(timeout);
  };

  // Adressvorschlag auswählen
  const handleSelectAddress = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      street: suggestion.address.street || prev.street,
      houseNumber: suggestion.address.houseNumber || prev.houseNumber,
      postalCode: suggestion.address.postalCode || prev.postalCode,
      city: suggestion.address.city || prev.city,
      district: suggestion.address.district || prev.district,
      state: suggestion.address.state || prev.state,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    }));
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  // Standort abrufen
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation wird von Ihrem Browser nicht unterstützt');
      return;
    }

    setSearchingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Önce koordinatları set et
        setFormData((prev) => ({
          ...prev,
          latitude: latitude,
          longitude: longitude,
        }));

        // Reverse geocoding ile adres bilgilerini al
        try {
          const addressData = await addressSearchService.reverseGeocode(latitude, longitude);

          if (addressData && addressData.address) {
            // Adres bilgilerini form'a doldur
            setFormData((prev) => ({
              ...prev,
              street: addressData.address.street || prev.street,
              houseNumber: addressData.address.houseNumber || prev.houseNumber,
              postalCode: addressData.address.postalCode || prev.postalCode,
              city: addressData.address.city || prev.city,
              district: addressData.address.district || prev.district,
              state: addressData.address.state || prev.state,
              latitude: latitude,
              longitude: longitude,
            }));
            toast.success('Standort und Adresse erfolgreich erfasst');
          } else {
            toast.success('Standort erfolgreich erfasst');
          }
        } catch (error) {
          console.error('[Profil] Reverse geocoding hatası:', error);
          toast.success('Standort erfolgreich erfasst');
        } finally {
          setSearchingAddress(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Standort konnte nicht abgerufen werden';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Standortberechtigung wurde verweigert';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Standortinformationen nicht verfügbar';
            break;
          case error.TIMEOUT:
            errorMessage = 'Zeitüberschreitung beim Abrufen des Standorts';
            break;
        }
        toast.error(errorMessage);
        setSearchingAddress(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Adresse speichern
  const handleSaveAddress = async () => {
    // Validierung
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

    setSaving(true);

    try {
      // Leere Strings, null und undefined Werte bereinigen
      const cleanedData = cleanRequestData(formData);

      if (editingAddress) {
        // Aktualisieren
        const response = await userService.updateAddress(editingAddress.id, cleanedData);
        console.log('Adresse aktualisiert:', response);
        toast.success('Adresse aktualisiert');
      } else {
        // Neu hinzufügen
        const response = await userService.createAddress(cleanedData);
        console.log('Adresse hinzugefügt:', response);
        toast.success('Adresse hinzugefügt');
      }
      closeModal();
      // Adressen nach kurzer Verzögerung neu laden, nachdem Modal geschlossen wurde
      setTimeout(() => {
        loadAddresses();
        // Wenn returnTo vorhanden ist (von SiparisVer gekommen), zurückkehren
        if (returnTo) {
          navigate(returnTo, { state: { refreshAddresses: true } });
        }
      }, 300);
    } catch (error) {
      console.error('Fehler beim Speichern der Adresse:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Fehler beim Speichern';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-mobile py-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mein Profil</h1>

      {/* Schnellzugriff auf Bestellungen */}
      <button
        onClick={() => navigate('/meine-bestellungen')}
        className="w-full mb-4 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <FiPackage />
        Meine Bestellungen
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
          {!isEditingProfile ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500">Name</label>
                  <p className="font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">E-Mail</label>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{user?.email}</p>
                    <button
                      onClick={handleOpenEmailChangeModal}
                      className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
                    >
                      <FiMail className="w-4 h-4" />
                      Ändern
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Telefon</label>
                  <p className="font-medium">{user?.phone || '-'}</p>
                </div>
              </div>

              <button
                onClick={handleEditProfile}
                className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <FiEdit2 />
                Profil bearbeiten
              </button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vorname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={profileFormData.firstName}
                    onChange={handleProfileInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nachname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={profileFormData.lastName}
                    onChange={handleProfileInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileFormData.phone}
                    onChange={handleProfileInputChange}
                    placeholder="+49..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">E-Mail</label>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{user?.email}</p>
                    <button
                      onClick={handleOpenEmailChangeModal}
                      className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
                    >
                      <FiMail className="w-4 h-4" />
                      Ändern
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancelEditProfile}
                  disabled={savingProfile}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingProfile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Speichern...
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </>
          )}

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
            className=" w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2 mb-4"
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
              className={`fixed z-[9999] ${
                isDesktop 
                  ? 'inset-0 flex items-center justify-center p-4' 
                  : 'left-4 right-4 top-20 bottom-20'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`bg-white rounded-xl shadow-2xl h-full overflow-y-auto w-full ${
                isDesktop ? 'max-w-2xl max-h-[80vh]' : ''
              }`}>
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

              <div className="p-4 pb-6 space-y-4">
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

                {/* Aktuelle Position Butonu */}
                <div>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={searchingAddress}
                    className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {searchingAddress ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Standort wird abgerufen...</span>
                      </>
                    ) : (
                      <>
                        <FiMapPin className="w-4 h-4" />
                        Aktuelle Position verwenden
                      </>
                    )}
                  </button>
                </div>

                {/* Straße - Autocomplete (devre dışı) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Straße <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="Straßenname eingeben..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {/* Autocomplete spinner devre dışı */}
                    {/* {searchingAddress && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )} */}
                  </div>
                  
                  {/* Autocomplete Dropdown - devre dışı */}
                  {/* {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {addressSuggestions.map((suggestion, index) => {
                        const isStreet = suggestion.address.street && suggestion.address.street.length > 0;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectAddress(suggestion)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              isStreet ? 'bg-green-50 hover:bg-green-100' : ''
                            }`}
                          >
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {isStreet && <FiMapPin className="w-4 h-4 text-green-600" />}
                              {suggestion.address.street || suggestion.displayName.split(',')[0]}
                              {suggestion.address.houseNumber && ` ${suggestion.address.houseNumber}`}
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              {suggestion.address.postalCode && `${suggestion.address.postalCode} `}
                              {suggestion.address.city || suggestion.address.district}
                              {suggestion.address.state && `, ${suggestion.address.state}`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )} */}
                </div>

                {/* Hausnummer und Adresszeile 2 */}
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
                      Bundesland
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Optional"
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

                {/* Standortinformationen */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Standortinformationen
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2 hidden">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Breitengrad</label>
                      <input
                        type="number"
                        step="0.00000001"
                        inputMode="decimal"
                        name="latitude"
                        value={formData.latitude ?? ''}
                        onChange={handleInputChange}
                        placeholder="Latitude"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Längengrad</label>
                      <input
                        type="number"
                        step="0.00000001"
                        inputMode="decimal"
                        name="longitude"
                        value={formData.longitude ?? ''}
                        onChange={handleInputChange}
                        placeholder="Longitude"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 hidden" >
                    Standortinformationen werden für die Entfernungsberechnung verwendet. Sie können Ihre aktuelle Position automatisch abrufen oder manuell eingeben.
                  </p>
                  {distanceToStore !== null && storeLocation && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FiMapPin className="w-4 h-4 text-green-600" />
                        <div className="flex-1">
                          {loadingDistance ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm text-green-700">Entfernung wird berechnet...</span>
                            </div>
                          ) : roadDistance ? (
                            <>
                              <span className="text-sm font-medium text-green-800">
                                Entfernung zum Markt: <strong>{roadDistance} km</strong>
                              </span>
                             
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-green-800">
                                Entfernung zum Markt: <strong>{distanceToStore} km</strong>
                              </span>
                              
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Als Standard festlegen */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="isDefault"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    color="green"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">
                    Als Standard-Adresse festlegen
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2 pb-4">
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
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Email Değişikliği Modal */}
      <AnimatePresence>
        {showEmailChangeModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                // Verify adımındaysa modal'ı kapatma, sadece request adımındaysa kapat
                if (emailChangeStep === 'request') {
                  handleCloseEmailChangeModal();
                }
              }}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`fixed z-[9999] ${
                isDesktop 
                  ? 'inset-0 flex items-center justify-center p-6' 
                  : 'inset-x-4 top-[10%] max-h-[85vh]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`bg-white rounded-2xl shadow-xl w-full flex flex-col ${
                isDesktop ? 'max-w-lg max-h-[85vh]' : 'max-h-full'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
                  <h2 className="text-xl font-semibold text-gray-900">
                    E-Mail-Adresse ändern
                  </h2>
                  <button
                    onClick={handleCloseEmailChangeModal}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                  {emailChangeStep === 'request' ? (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Aktuelle E-Mail-Adresse
                        </label>
                        <p className="text-sm font-medium text-gray-900">{user?.email || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Neue E-Mail-Adresse <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={emailChangeData.newEmail}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEmailChangeData(prev => ({ ...prev, newEmail: value }));
                          }}
                          placeholder="neue@email.de"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          autoComplete="email"
                        />
                        {emailChangeData.newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailChangeData.newEmail) && (
                          <p className="text-xs text-red-500 mt-1">Bitte geben Sie eine gültige E-Mail-Adresse ein</p>
                        )}
                        {(() => {
                          if (!emailChangeData.newEmail || !user?.email) return null;
                          
                          const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailChangeData.newEmail);
                          if (!isValidEmail) return null;
                          
                          const newEmailNormalized = emailChangeData.newEmail.toLowerCase().trim();
                          const currentEmailNormalized = user.email.toLowerCase().trim();
                          const isSameEmail = newEmailNormalized === currentEmailNormalized;
                          
                          // Debug log
                          console.log('Email karşılaştırması (UI):', {
                            newEmail: newEmailNormalized,
                            currentEmail: currentEmailNormalized,
                            areEqual: isSameEmail,
                            userEmailRaw: user.email
                          });
                          
                          return isSameEmail ? (
                            <p className="text-xs text-red-500 mt-1">Die neue E-Mail-Adresse muss sich von der aktuellen unterscheiden</p>
                          ) : null;
                        })()}
                      </div>
                      <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                        <FiInfo className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Wir senden Ihnen einen Bestätigungscode an die neue E-Mail-Adresse.</span>
                      </p>
                      <button
                        onClick={handleRequestEmailChange}
                        disabled={sendingEmailCode || !emailChangeData.newEmail}
                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                      >
                        {sendingEmailCode ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Code wird gesendet...
                          </>
                        ) : (
                          <>
                            <FiMail className="w-4 h-4" />
                            Bestätigungscode senden
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Neue E-Mail-Adresse
                        </label>
                        <p className="text-sm font-medium text-gray-900">{emailChangeData.newEmail}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bestätigungscode <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={emailChangeData.code}
                          onChange={(e) => setEmailChangeData(prev => ({ ...prev, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                          placeholder="123456"
                          maxLength={6}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl font-mono tracking-widest transition-all"
                        />
                      </div>
                      <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                        <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span>Bitte geben Sie den 6-stelligen Code ein, den wir an {emailChangeData.newEmail} gesendet haben.</span>
                      </p>
                      <button
                        onClick={handleVerifyEmailChange}
                        disabled={verifyingEmailCode || emailChangeData.code.length !== 6}
                        className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {verifyingEmailCode ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Wird bestätigt...
                          </>
                        ) : (
                          <>
                            <FiCheck className="w-4 h-4" />
                            Bestätigen
                          </>
                        )}
                      </button>
                        <button
                          onClick={async () => {
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(emailChangeData.newEmail)) {
                              toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
                              return;
                            }
                            const normalizedEmail = emailChangeData.newEmail.toLowerCase().trim();
                            // Mevcut email ile aynı olup olmadığını kontrol et
                            const currentEmail = user?.email ? user.email.toLowerCase().trim() : '';
                            if (currentEmail && normalizedEmail === currentEmail) {
                              toast.error('Die neue E-Mail-Adresse muss sich von der aktuellen unterscheiden');
                              return;
                            }
                            setSendingEmailCode(true);
                            try {
                              await userService.requestEmailChange(normalizedEmail);
                              toast.success('Bestätigungscode wurde erneut gesendet');
                              setEmailChangeData(prev => ({ ...prev, code: '', newEmail: normalizedEmail }));
                            } catch (error) {
                              const errorMessage = error?.response?.data?.message || error?.message || 'Fehler beim Senden des Bestätigungscodes';
                              toast.error(errorMessage);
                            } finally {
                              setSendingEmailCode(false);
                            }
                          }}
                          disabled={sendingEmailCode}
                          className="px-4 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          {sendingEmailCode ? (
                            <>
                              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              Wird gesendet...
                            </>
                          ) : (
                            <>
                              <FiMail className="w-4 h-4" />
                              Code erneut senden
                            </>
                          )}
                        </button>
                    </>
                  )}
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
