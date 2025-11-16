import prisma from '../config/prisma.js';
import { defaultFAQs } from '../data/defaultFAQs.js';

class FAQService {
  // Tüm FAQ'ları getir (Admin için - aktif/pasif hepsi)
  async getAllFAQs() {
    const faqs = await prisma.faq.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    return faqs;
  }

  // Aktif FAQ'ları getir (User için)
  async getActiveFAQs() {
    const faqs = await prisma.faq.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Kategorilere göre grupla
    const grouped = faqs.reduce((acc, faq) => {
      const category = faq.category || 'Allgemein';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(faq);
      return acc;
    }, {});

    return {
      faqs,
      grouped,
      categories: Object.keys(grouped),
    };
  }

  // ID'ye göre FAQ getir
  async getFAQById(id) {
    const faq = await prisma.faq.findUnique({
      where: { id },
    });

    if (!faq) {
      throw new Error('FAQ nicht gefunden');
    }

    return faq;
  }

  // Yeni FAQ oluştur
  async createFAQ(data) {
    const { question, answer, category, sortOrder, isActive } = data;

    if (!question || !answer) {
      throw new Error('Frage und Antwort sind erforderlich');
    }

    const faq = await prisma.faq.create({
      data: {
        question,
        answer,
        category: category || null,
        sortOrder: sortOrder !== undefined ? sortOrder : 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return faq;
  }

  // FAQ güncelle
  async updateFAQ(id, data) {
    const { question, answer, category, sortOrder, isActive } = data;

    // FAQ var mı kontrol et
    await this.getFAQById(id);

    const updateData = {};
    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (category !== undefined) updateData.category = category || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const faq = await prisma.faq.update({
      where: { id },
      data: updateData,
    });

    return faq;
  }

  // FAQ sil
  async deleteFAQ(id) {
    // FAQ var mı kontrol et
    await this.getFAQById(id);

    await prisma.faq.delete({
      where: { id },
    });

    return { message: 'FAQ erfolgreich gelöscht' };
  }

  // Aktif/Pasif değiştir
  async toggleActive(id) {
    const faq = await this.getFAQById(id);

    const updated = await prisma.faq.update({
      where: { id },
      data: {
        isActive: !faq.isActive,
      },
    });

    return updated;
  }

  // Default FAQ'ları yükle (tüm mevcut FAQ'ları sil ve default'ları ekle)
  async resetToDefaults() {
    // Tüm mevcut FAQ'ları sil
    await prisma.faq.deleteMany({});

    // Default FAQ'ları ekle
    const createdFAQs = await Promise.all(
      defaultFAQs.map((faq) =>
        prisma.faq.create({
          data: {
            question: faq.question,
            answer: faq.answer,
            category: faq.category || null,
            sortOrder: faq.sortOrder || 0,
            isActive: faq.isActive !== undefined ? faq.isActive : true,
          },
        })
      )
    );

    return createdFAQs;
  }

  // Bulk import - Birden fazla FAQ'ı toplu olarak ekle/güncelle
  async bulkImport(faqs, options = {}) {
    const { replaceAll = false } = options;

    if (!Array.isArray(faqs) || faqs.length === 0) {
      throw new Error('FAQ-Liste ist erforderlich');
    }

    // Validasyon
    for (const faq of faqs) {
      if (!faq.question || !faq.answer) {
        throw new Error('Jede FAQ muss Frage und Antwort haben');
      }
    }

    // Eğer replaceAll true ise, tüm mevcut FAQ'ları sil
    if (replaceAll) {
      await prisma.faq.deleteMany({});
    }

    // FAQ'ları oluştur
    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const faqData of faqs) {
      try {
        const { question, answer, category, sortOrder, isActive } = faqData;

        await prisma.faq.create({
          data: {
            question,
            answer,
            category: category || null,
            sortOrder: sortOrder !== undefined ? sortOrder : 0,
            isActive: isActive !== undefined ? isActive : true,
          },
        });

        results.created++;
      } catch (error) {
        results.errors.push({
          question: faqData.question,
          error: error.message,
        });
      }
    }

    return results;
  }
}

export default new FAQService();

