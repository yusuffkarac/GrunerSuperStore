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

  // Fatura PDF indir
  downloadInvoice: async (id, orderNo) => {
    try {
      const response = await api.get(`/orders/${id}/invoice`, {
        responseType: 'blob',
      });

      // Blob URL oluştur ve indir
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rechnung-${orderNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('PDF indirme hatası:', error);
      throw error;
    }
  },
};

export default orderService;
