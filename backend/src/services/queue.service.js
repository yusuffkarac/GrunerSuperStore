import Queue from 'bull';
import emailService from './email.service.js';

/**
 * Queue Service
 * Bull ile asenkron mail gönderimi
 */
class QueueService {
  constructor() {
    this.emailQueue = null;
    this.initialized = false;
  }

  /**
   * Queue'yu başlat
   */
  initialize() {
    if (this.initialized) return;

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    };

    try {
      // Email queue oluştur
      this.emailQueue = new Queue('email', {
        redis: redisConfig,
        defaultJobOptions: {
          attempts: 3, // 3 deneme
          backoff: {
            type: 'exponential',
            delay: 5000, // İlk retry 5 saniye sonra, sonraki 10, 20...
          },
          removeOnComplete: true, // Başarılı job'ları temizle
          removeOnFail: false, // Başarısız job'ları sakla (debug için)
        },
      });

      // Process email jobs
      this.emailQueue.process(async (job) => {
        const { to, subject, template, data, metadata, attachments } = job.data;

        console.log(`📧 Mail gönderiliyor: ${to} - ${subject}`);

        const result = await emailService.sendMail({
          to,
          subject,
          template,
          data,
          metadata,
          attachments,
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        return result;
      });

      // Event listeners
      this.emailQueue.on('completed', (job, result) => {
        console.log(`✅ Mail job tamamlandı: ${job.id}`);
      });

      this.emailQueue.on('failed', (job, err) => {
        console.error(`❌ Mail job başarısız: ${job.id}`, err.message);
      });

      this.emailQueue.on('error', (error) => {
        console.error('❌ Queue hatası:', error);
      });

      this.initialized = true;
    } catch (error) {
      console.error('❌ Queue başlatma hatası:', error);
      // Redis bağlantısı yoksa hata verme, sadece log at
      console.warn('⚠️  Redis bağlantısı yapılamadı. Mail sistemi senkron çalışacak.');
    }
  }

  /**
   * Mail kuyruğuna ekle
   */
  async addEmailJob(emailData) {
    // Queue başlatılmamışsa veya başarısız olmuşsa, direkt gönder
    if (!this.initialized || !this.emailQueue) {
      console.warn('⚠️  Queue mevcut değil, mail senkron gönderiliyor...');
      return await emailService.sendMail(emailData);
    }

    try {
      const job = await this.emailQueue.add(emailData, {
        priority: emailData.priority || 5, // Düşük sayı = yüksek öncelik
      });

      console.log(`📬 Mail kuyruğa eklendi: ${job.id}`);

      return {
        success: true,
        jobId: job.id,
        message: 'E-Mail wurde zur Warteschlange hinzugefügt',
      };
    } catch (error) {
      console.error('Kuyruğa ekleme hatası:', error);
      // Queue hatası varsa, direkt gönder
      console.warn('⚠️  Kuyruğa eklenemedi, mail senkron gönderiliyor...');
      return await emailService.sendMail(emailData);
    }
  }

  /**
   * Kuyruktaki iş sayısını al
   */
  async getQueueStats() {
    if (!this.initialized || !this.emailQueue) {
      return { available: false };
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.emailQueue.getWaitingCount(),
        this.emailQueue.getActiveCount(),
        this.emailQueue.getCompletedCount(),
        this.emailQueue.getFailedCount(),
        this.emailQueue.getDelayedCount(),
      ]);

      return {
        available: true,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
      };
    } catch (error) {
      console.error('Queue stats hatası:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Başarısız job'ları yeniden dene
   */
  async retryFailedJobs() {
    if (!this.initialized || !this.emailQueue) {
      return { success: false, message: 'Queue mevcut değil' };
    }

    try {
      const failedJobs = await this.emailQueue.getFailed();

      for (const job of failedJobs) {
        await job.retry();
      }

      return {
        success: true,
        retriedCount: failedJobs.length,
        message: `${failedJobs.length} başarısız job yeniden deneniyor`,
      };
    } catch (error) {
      console.error('Retry hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kuyruğu temizle
   */
  async cleanQueue() {
    if (!this.initialized || !this.emailQueue) {
      return { success: false, message: 'Queue mevcut değil' };
    }

    try {
      await this.emailQueue.clean(24 * 3600 * 1000); // 24 saatten eski job'ları temizle
      await this.emailQueue.clean(0, 'completed'); // Tüm completed job'ları temizle

      return {
        success: true,
        message: 'Kuyruk temizlendi',
      };
    } catch (error) {
      console.error('Clean queue hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Queue'yu kapat
   */
  async close() {
    if (this.emailQueue) {
      await this.emailQueue.close();
      console.log('📪 Queue kapatıldı');
    }
  }
}

// Singleton instance
const queueService = new QueueService();

// Server başlangıcında initialize et
queueService.initialize();

export default queueService;
