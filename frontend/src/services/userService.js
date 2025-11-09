import api from './api';

const userService = {
  // Profil bilgilerini getir
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  // Profil güncelle
  updateProfile: async (data) => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  // Şifre değiştir
  changePassword: async (data) => {
    const response = await api.put('/user/password', data);
    return response.data;
  },

  // Adresleri getir
  getAddresses: async () => {
    const response = await api.get('/user/addresses');
    return response.data;
  },

  // Yeni adres ekle
  createAddress: async (data) => {
    const response = await api.post('/user/addresses', data);
    return response.data;
  },

  // Adres güncelle
  updateAddress: async (id, data) => {
    const response = await api.put(`/user/addresses/${id}`, data);
    return response.data;
  },

  // Adres sil
  deleteAddress: async (id) => {
    const response = await api.delete(`/user/addresses/${id}`);
    return response.data;
  },

  // Varsayılan adres olarak işaretle
  setDefaultAddress: async (id) => {
    const response = await api.put(`/user/addresses/${id}/default`);
    return response.data;
  },

  // Yol mesafesi hesapla
  calculateDistance: async (data) => {
    // api.post zaten response.data döndürüyor (interceptor'dan dolayı)
    // Bu yüzden direkt response'u döndürüyoruz
    const response = await api.post('/user/calculate-distance', data);
    return response;
  },
};

export default userService;
