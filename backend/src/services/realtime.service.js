/**
 * Real-time bildirim servisi (Server-Sent Events)
 */

class RealtimeService {
  constructor() {
    // userId -> response mapping
    this.clients = new Map();
  }

  /**
   * SSE bağlantısı ekle
   */
  addClient(userId, response) {
    // SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // Nginx için

    // Mevcut bağlantıyı kapat (varsa)
    if (this.clients.has(userId)) {
      this.removeClient(userId);
    }

    this.clients.set(userId, response);

    // Bağlantı kapandığında temizle
    response.on('close', () => {
      this.removeClient(userId);
    });

    // İlk heartbeat gönder
    this.sendHeartbeat(userId);

    // Her 30 saniyede bir heartbeat gönder
    const heartbeatInterval = setInterval(() => {
      if (this.clients.has(userId)) {
        this.sendHeartbeat(userId);
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    console.log(`✅ SSE bağlantısı eklendi: userId=${userId}, Toplam: ${this.clients.size}`);
  }

  /**
   * SSE bağlantısını kaldır
   */
  removeClient(userId) {
    const response = this.clients.get(userId);
    if (response && !response.headersSent) {
      try {
        response.end();
      } catch (error) {
        // Bağlantı zaten kapalı olabilir
      }
    }
    this.clients.delete(userId);
    console.log(`❌ SSE bağlantısı kaldırıldı: userId=${userId}, Toplam: ${this.clients.size}`);
  }

  /**
   * Belirli kullanıcıya bildirim gönder
   */
  broadcastNotification(userId, notification) {
    const response = this.clients.get(userId);
    if (response && !response.headersSent) {
      try {
        response.write(`data: ${JSON.stringify({ type: 'notification', data: notification })}\n\n`);
      } catch (error) {
        console.error(`❌ Bildirim gönderilemedi (userId=${userId}):`, error.message);
        this.removeClient(userId);
      }
    }
  }

  /**
   * Tüm kullanıcılara bildirim gönder
   */
  broadcastToAll(notification) {
    this.clients.forEach((response, userId) => {
      if (!response.headersSent) {
        try {
          response.write(`data: ${JSON.stringify({ type: 'notification', data: notification })}\n\n`);
        } catch (error) {
          console.error(`❌ Bildirim gönderilemedi (userId=${userId}):`, error.message);
          this.removeClient(userId);
        }
      }
    });
  }

  /**
   * Okunmamış sayıyı güncelle
   */
  broadcastUnreadCount(userId, count) {
    const response = this.clients.get(userId);
    if (response && !response.headersSent) {
      try {
        response.write(`data: ${JSON.stringify({ type: 'unread_count', data: { count } })}\n\n`);
      } catch (error) {
        console.error(`❌ Okunmamış sayı gönderilemedi (userId=${userId}):`, error.message);
        this.removeClient(userId);
      }
    }
  }

  /**
   * Heartbeat gönder (bağlantıyı canlı tutmak için)
   */
  sendHeartbeat(userId) {
    const response = this.clients.get(userId);
    if (response && !response.headersSent) {
      try {
        response.write(`: heartbeat\n\n`);
      } catch (error) {
        this.removeClient(userId);
      }
    }
  }

  /**
   * Aktif bağlantı sayısı
   */
  getActiveConnectionsCount() {
    return this.clients.size;
  }
}

export default new RealtimeService();

