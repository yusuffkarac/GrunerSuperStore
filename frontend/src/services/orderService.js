import api from './api';

const orderService = {
  // Sipariş oluştur
  createOrder: async (orderData) => {
    return await api.post('/orders', orderData);
  },

  // Kullanıcının siparişlerini listele
  getOrders: async (params = {}) => {
    return await api.get('/orders', { params });
  },

  // Sipariş detayı
  getOrderById: async (id) => {
    return await api.get(`/orders/${id}`);
  },

  // Sipariş iptal et
  cancelOrder: async (id) => {
    return await api.put(`/orders/${id}/cancel`);
  },

  // Sipariş için review oluştur
  createReview: async (id, reviewData) => {
    return await api.post(`/orders/${id}/review`, reviewData);
  },

  // Sipariş review'ını getir
  getReview: async (id) => {
    return await api.get(`/orders/${id}/review`);
  },
};

export default orderService;
