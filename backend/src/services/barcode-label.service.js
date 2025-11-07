import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

class BarcodeLabelService {
  // Tüm barkod etiketlerini listele
  async getAllBarcodeLabels({
    page = 1,
    limit = 50,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;

    // Where koşulları
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Sıralama
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Barkod etiketlerini getir
    const [labels, total] = await Promise.all([
      prisma.barcodeLabel.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.barcodeLabel.count({ where }),
    ]);

    return {
      labels,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Tek barkod etiketi getir
  async getBarcodeLabelById(id) {
    const label = await prisma.barcodeLabel.findUnique({
      where: { id },
    });

    if (!label) {
      throw new NotFoundError('Barkod etiketi bulunamadı');
    }

    return label;
  }

  // Birden fazla barkod etiketi getir (toplu yazdırma için)
  async getBarcodeLabelsByIds(ids) {
    const labels = await prisma.barcodeLabel.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return labels;
  }

  // Barkod etiketi oluştur
  async createBarcodeLabel(data) {
    const { name, price, unit, barcode } = data;

    // Barkod kontrolü
    const existingLabel = await prisma.barcodeLabel.findFirst({
      where: { barcode },
    });

    if (existingLabel) {
      throw new ValidationError('Bu barkod numarası zaten kullanılıyor');
    }

    const label = await prisma.barcodeLabel.create({
      data: {
        name,
        price,
        unit,
        barcode,
      },
    });

    return label;
  }

  // Barkod etiketi güncelle
  async updateBarcodeLabel(id, data) {
    const { name, price, unit, barcode } = data;

    // Etiketin var olup olmadığını kontrol et
    const existingLabel = await this.getBarcodeLabelById(id);

    // Eğer barkod değiştiriliyorsa, başka bir etikette kullanılıp kullanılmadığını kontrol et
    if (barcode && barcode !== existingLabel.barcode) {
      const duplicateLabel = await prisma.barcodeLabel.findFirst({
        where: {
          barcode,
          id: { not: id },
        },
      });

      if (duplicateLabel) {
        throw new ValidationError('Bu barkod numarası zaten kullanılıyor');
      }
    }

    const label = await prisma.barcodeLabel.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(price !== undefined && { price }),
        ...(unit !== undefined && { unit }),
        ...(barcode && { barcode }),
      },
    });

    return label;
  }

  // Barkod etiketi sil
  async deleteBarcodeLabel(id) {
    // Etiketin var olup olmadığını kontrol et
    await this.getBarcodeLabelById(id);

    await prisma.barcodeLabel.delete({
      where: { id },
    });

    return { message: 'Barkod etiketi başarıyla silindi' };
  }

  // Toplu barkod etiketi sil
  async deleteBarcodeLabels(ids) {
    const result = await prisma.barcodeLabel.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return {
      message: 'Barkod etiketleri başarıyla silindi',
      deletedCount: result.count
    };
  }
}

export default new BarcodeLabelService();
