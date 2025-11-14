import userService from '../services/user.service.js';
import routingService from '../services/routing.service.js';
import addressSearchService from '../services/addressSearch.service.js';
import settingsService from '../services/settings.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class UserController {
  // GET /api/user/profile
  getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  // PUT /api/user/profile
  updateProfile = asyncHandler(async (req, res) => {
    const { firstName, lastName, phone } = req.body;

    const user = await userService.updateProfile(req.user.id, {
      firstName,
      lastName,
      phone,
    });

    res.status(200).json({
      success: true,
      message: 'Profil erfolgreich aktualisiert',
      data: { user },
    });
  });

  // POST /api/user/request-email-change
  requestEmailChange = asyncHandler(async (req, res) => {
    const { newEmail } = req.body;

    const result = await userService.requestEmailChange(req.user.id, newEmail);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // POST /api/user/verify-email-change
  verifyEmailChange = asyncHandler(async (req, res) => {
    const { code } = req.body;

    const user = await userService.verifyEmailChange(req.user.id, code);

    res.status(200).json({
      success: true,
      message: 'E-Mail-Adresse erfolgreich geändert',
      data: { user },
    });
  });

  // PUT /api/user/password
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await userService.changePassword(req.user.id, {
      currentPassword,
      newPassword,
    });

    res.status(200).json({
      success: true,
      message: 'Passwort erfolgreich geändert',
    });
  });

  // GET /api/user/addresses
  getAddresses = asyncHandler(async (req, res) => {
    const addresses = await userService.getAddresses(req.user.id);

    res.status(200).json({
      success: true,
      data: { addresses },
    });
  });

  // POST /api/user/addresses
  createAddress = asyncHandler(async (req, res) => {
    const addressData = req.body;

    const address = await userService.createAddress(req.user.id, addressData);

    res.status(201).json({
      success: true,
      message: 'Adresse erfolgreich hinzugefügt',
      data: { address },
    });
  });

  // PUT /api/user/addresses/:id
  updateAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const addressData = req.body;

    const address = await userService.updateAddress(
      req.user.id,
      id,
      addressData
    );

    res.status(200).json({
      success: true,
      message: 'Adresse erfolgreich aktualisiert',
      data: { address },
    });
  });

  // DELETE /api/user/addresses/:id
  deleteAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await userService.deleteAddress(req.user.id, id);

    res.status(200).json({
      success: true,
      message: 'Adresse erfolgreich gelöscht',
    });
  });

  // PUT /api/user/addresses/:id/default
  setDefaultAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const address = await userService.setDefaultAddress(req.user.id, id);

    res.status(200).json({
      success: true,
      message: 'Standard-Adresse festgelegt',
      data: { address },
    });
  });

  // POST /api/user/calculate-distance
  calculateDistance = asyncHandler(async (req, res) => {
    console.log('[UserController] calculateDistance çağrıldı');
    const { originLat, originLon, destLat, destLon } = req.body;
    
    console.log('[UserController] Gelen parametreler:', {
      originLat,
      originLon,
      destLat,
      destLon,
      body: req.body
    });

    // Validasyon
    if (
      originLat === undefined ||
      originLon === undefined ||
      destLat === undefined ||
      destLon === undefined
    ) {
      console.warn('[UserController] Koordinatlar eksik');
      return res.status(400).json({
        success: false,
        message: 'Koordinatlar eksik',
      });
    }

    console.log('[UserController] RoutingService.calculateRoadDistance çağrılıyor...');
    // Yol mesafesini hesapla
    const result = await routingService.calculateRoadDistance(
      originLat,
      originLon,
      destLat,
      destLon
    );

    console.log('[UserController] RoutingService sonucu:', result);

    if (!result) {
      console.warn('[UserController] RoutingService null döndü - fallback mesajı gönderiliyor');
      return res.status(200).json({
        success: true,
        data: {
          distance: null,
          duration: null,
          message: 'Yol mesafesi hesaplanamadı. Havadan mesafe kullanılabilir.',
        },
      });
    }

    console.log('[UserController] Başarılı sonuç döndürülüyor:', {
      distance: result.distance,
      duration: result.duration
    });

    res.status(200).json({
      success: true,
      data: {
        distance: result.distance,
        duration: result.duration,
      },
    });
  });

  // GET /api/user/search-address
  searchAddress = asyncHandler(async (req, res) => {
    const { q, limit = 5, city } = req.query;

    // Settings'ten varsayılan şehirleri al
    const settings = await settingsService.getSettings();
    const defaultCities = settings?.storeSettings?.defaultCities || [];
    
    // Eğer query'de city varsa kullan, yoksa defaultCities kullan
    // city string veya comma-separated string olabilir
    // Eğer hiç şehir yoksa (boş array), şehir filtresi uygulanmaz ve tüm sonuçlar gösterilir
    let searchCities = null; // null = şehir filtresi yok, tüm sonuçlar gösterilir
    if (city) {
      // Query'de city varsa kullan
      searchCities = typeof city === 'string' 
        ? city.split(',').map(c => c.trim()).filter(c => c)
        : Array.isArray(city) ? city : [city];
    } else if (defaultCities && defaultCities.length > 0) {
      // Query'de city yoksa ama defaultCities varsa onu kullan
      searchCities = defaultCities;
    }
    // Eğer ikisi de yoksa searchCities null kalır ve tüm sonuçlar gösterilir

    console.log('[UserController] searchAddress çağrıldı:', { 
      q, 
      limit, 
      city, 
      defaultCities, 
      searchCities,
      willFilterByCity: searchCities !== null && searchCities.length > 0
    });

    if (!q || q.trim().length < 3) {
      console.log('[UserController] Query çok kısa, boş sonuç döndürülüyor');
      return res.status(200).json({
        success: true,
        data: { addresses: [] },
      });
    }

    const addresses = await addressSearchService.searchAddress(q, { 
      limit: parseInt(limit),
      city: searchCities // null veya array - null ise tüm sonuçlar gösterilir
    });

    console.log('[UserController] Adres arama sonucu:', {
      query: q,
      foundCount: addresses.length,
      addresses: addresses.map(a => a.displayName)
    });

    res.status(200).json({
      success: true,
      data: { addresses },
    });
  });

  // GET /api/user/reverse-geocode
  reverseGeocode = asyncHandler(async (req, res) => {
    const { lat, lon } = req.query;

    console.log('[UserController] reverseGeocode çağrıldı:', { lat, lon });

    if (!lat || !lon) {
      console.log('[UserController] Lat veya lon eksik');
      return res.status(400).json({
        success: false,
        message: 'Latitude ve longitude gereklidir',
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.log('[UserController] Geçersiz lat/lon değerleri');
      return res.status(400).json({
        success: false,
        message: 'Geçersiz latitude veya longitude',
      });
    }

    const address = await addressSearchService.reverseGeocode(latitude, longitude);

    if (!address) {
      console.log('[UserController] Adres bulunamadı');
      return res.status(404).json({
        success: false,
        message: 'Adres bulunamadı',
      });
    }

    console.log('[UserController] Reverse geocoding sonucu:', {
      street: address.address.street,
      city: address.address.city,
    });

    res.status(200).json({
      success: true,
      data: { address },
    });
  });
}

export default new UserController();
