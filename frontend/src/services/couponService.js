import api from './api';
import { adminApi } from './adminService';

const couponService = {
  // Kupon kodunu doğrula (Müşteri için)
  async validateCoupon(code, cartItems, subtotal) {
    // api.js interceptor zaten response.data döndürüyor
    // Yani response = { success: true, data: {...} } formatında
    const response = await api.post('/coupons/validate', {
      code,
      cartItems,
      subtotal,
    });
    return response; // response.data değil, direkt response
  },

  // Admin: Tüm kuponları listele
  async getCoupons(params = {}) {
    const response = await adminApi.get('/coupons', { params });
    return response.data;
  },

  // Admin: Kupon detayı
  async getCouponById(id) {
    const response = await adminApi.get(`/coupons/${id}`);
    return response.data;
  },

  // Admin: Kupon oluştur
  async createCoupon(data) {
    const response = await adminApi.post('/coupons', data);
    return response.data;
  },

  // Admin: Kupon güncelle
  async updateCoupon(id, data) {
    const response = await adminApi.put(`/coupons/${id}`, data);
    return response.data;
  },

  // Admin: Kupon sil
  async deleteCoupon(id) {
    const response = await adminApi.delete(`/coupons/${id}`);
    return response.data;
  },

  // Admin: Rastgele kupon kodu oluştur
  async generateCouponCode(length = 8) {
    const response = await adminApi.get('/coupons/generate-code', {
      params: { length },
    });
    return response.data;
  },

  // Admin: Kupon istatistikleri
  async getCouponStats(id) {
    const response = await adminApi.get(`/coupons/${id}/stats`);
    return response.data;
  },
};

export default couponService;

