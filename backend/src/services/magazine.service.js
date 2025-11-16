import prisma from '../config/prisma.js';

class MagazineService {
  // Tüm dergileri getir (Admin için - aktif/pasif hepsi)
  async getAllMagazines() {
    const magazines = await prisma.weeklyMagazine.findMany({
      orderBy: {
        startDate: 'desc',
      },
    });
    return magazines;
  }

  // Aktif dergileri getir (User için)
  async getActiveMagazines() {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Sadece tarihi karşılaştır

    const magazines = await prisma.weeklyMagazine.findMany({
      where: {
        isActive: true,
        startDate: {
          lte: now,
        },
        endDate: {
          gte: now,
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return magazines;
  }

  // ID'ye göre dergi getir
  async getMagazineById(id) {
    const magazine = await prisma.weeklyMagazine.findUnique({
      where: { id },
    });

    if (!magazine) {
      throw new Error('Magazin nicht gefunden');
    }

    return magazine;
  }

  // Yeni dergi oluştur
  async createMagazine(data) {
    const { title, pdfUrl, startDate, endDate, isActive } = data;

    // Tarih validasyonu - sadece tarih kısmını karşılaştır (saat bilgisini normalize et)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (end <= start) {
      throw new Error('Das Enddatum muss nach dem Startdatum liegen');
    }

    const magazine = await prisma.weeklyMagazine.create({
      data: {
        title,
        pdfUrl,
        startDate: start,
        endDate: end,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return magazine;
  }

  // Dergi güncelle
  async updateMagazine(id, data) {
    const { title, pdfUrl, startDate, endDate, isActive } = data;

    // Dergi var mı kontrol et
    await this.getMagazineById(id);

    // Tarih validasyonu - sadece tarih kısmını karşılaştır (saat bilgisini normalize et)
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);

      if (end <= start) {
        throw new Error('Das Enddatum muss nach dem Startdatum liegen');
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (pdfUrl !== undefined) updateData.pdfUrl = pdfUrl;
    if (startDate !== undefined) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      updateData.startDate = start;
    }
    if (endDate !== undefined) {
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      updateData.endDate = end;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const magazine = await prisma.weeklyMagazine.update({
      where: { id },
      data: updateData,
    });

    return magazine;
  }

  // Dergi sil
  async deleteMagazine(id) {
    // Dergi var mı kontrol et
    await this.getMagazineById(id);

    await prisma.weeklyMagazine.delete({
      where: { id },
    });

    return { message: 'Magazin erfolgreich gelöscht' };
  }

  // Aktif/Pasif değiştir
  async toggleActive(id) {
    const magazine = await this.getMagazineById(id);

    const updated = await prisma.weeklyMagazine.update({
      where: { id },
      data: {
        isActive: !magazine.isActive,
      },
    });

    return updated;
  }
}

export default new MagazineService();
