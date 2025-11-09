import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { getGermanyDate } from '../utils/date.js';

class CampaignService {
  // Tüm kampanyaları listele (Admin için)
  async getAllCampaigns({
    page = 1,
    limit = 20,
    search,
    type,
    isActive,
    sortBy = 'priority',
    sortOrder = 'desc',
  }) {
    const skip = (page - 1) * limit;

    // Where koşulları
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    // Sıralama
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Kampanyaları getir
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      campaigns,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Aktif kampanyaları getir (Müşteri için)
  async getActiveCampaigns() {
    const now = getGermanyDate();

    const campaigns = await prisma.campaign.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // Usage limit kontrolünü JavaScript'te yap
    return campaigns.filter((campaign) => {
      if (campaign.usageLimit === null) return true;
      return campaign.usageCount < campaign.usageLimit;
    });
  }

  // Tek kampanya getir
  async getCampaignById(id) {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundError('Kampanya bulunamadı');
    }

    return campaign;
  }

  // Slug ile kampanya getir
  async getCampaignBySlug(slug) {
    const campaign = await prisma.campaign.findUnique({
      where: { slug },
    });

    if (!campaign) {
      throw new NotFoundError('Kampanya bulunamadı');
    }

    return campaign;
  }

  // Yeni kampanya oluştur
  async createCampaign(data) {
    // Validasyon
    this._validateCampaignData(data);

    // Slug kontrolü
    const existingCampaign = await prisma.campaign.findUnique({
      where: { slug: data.slug },
    });

    if (existingCampaign) {
      throw new ValidationError('Bu slug zaten kullanılıyor');
    }

    // Tarihleri Date objesine çevir
    const campaignData = {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    };

    const campaign = await prisma.campaign.create({
      data: campaignData,
    });

    return campaign;
  }

  // Kampanya güncelle
  async updateCampaign(id, data) {
    // Kampanya var mı kontrol et
    const existingCampaign = await this.getCampaignById(id);

    // Slug değişiyorsa, benzersizliği kontrol et
    if (data.slug && data.slug !== existingCampaign.slug) {
      const slugExists = await prisma.campaign.findUnique({
        where: { slug: data.slug },
      });

      if (slugExists) {
        throw new ValidationError('Bu slug zaten kullanılıyor');
      }
    }

    // Validasyon
    if (Object.keys(data).length > 0) {
      this._validateCampaignData({ ...existingCampaign, ...data });
    }

    // Tarihleri Date objesine çevir
    const updateData = { ...data };
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    return campaign;
  }

  // Kampanya sil
  async deleteCampaign(id) {
    // Kampanya var mı kontrol et
    await this.getCampaignById(id);

    await prisma.campaign.delete({
      where: { id },
    });

    return true;
  }

  // Belirli ürün/kategori için geçerli kampanyaları getir
  async getApplicableCampaigns({ productId, categoryId, cartTotal = 0 }) {
    const now = getGermanyDate();

    const where = {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    };

    // Minimum tutar kontrolü
    if (cartTotal > 0) {
      where.OR = [
        { minPurchase: null },
        { minPurchase: { lte: cartTotal } },
      ];
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // Usage limit ve hedefleme filtreleme
    const applicableCampaigns = campaigns.filter((campaign) => {
      // Usage limit kontrolü
      if (campaign.usageLimit !== null && campaign.usageCount >= campaign.usageLimit) {
        return false;
      }

      // Tüm mağazaya uygulanan kampanyalar
      if (campaign.applyToAll) {
        return true;
      }

      // Kategoriye özgü kampanyalar
      if (categoryId && campaign.categoryIds) {
        const categoryIds = Array.isArray(campaign.categoryIds)
          ? campaign.categoryIds
          : [];
        if (categoryIds.includes(categoryId)) {
          return true;
        }
      }

      // Ürüne özgü kampanyalar
      if (productId && campaign.productIds) {
        const productIds = Array.isArray(campaign.productIds)
          ? campaign.productIds
          : [];
        if (productIds.includes(productId)) {
          return true;
        }
      }

      return false;
    });

    return applicableCampaigns;
  }

  // Kampanya kullanım sayısını artır
  async incrementUsageCount(campaignId) {
    const campaign = await this.getCampaignById(campaignId);

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        usageCount: campaign.usageCount + 1,
      },
    });

    return true;
  }

  // Kampanya validasyonu
  _validateCampaignData(data) {
    const { type, discountPercent, discountAmount, buyQuantity, getQuantity, startDate, endDate } = data;

    // Tarih kontrolü
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        throw new ValidationError('Başlangıç tarihi, bitiş tarihinden önce olmalıdır');
      }
    }

    // Kampanya tipine göre gerekli alanları kontrol et
    if (type === 'PERCENTAGE') {
      if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
        throw new ValidationError('Yüzde indirim 0-100 arasında olmalıdır');
      }
    }

    if (type === 'FIXED_AMOUNT') {
      if (!discountAmount || discountAmount <= 0) {
        throw new ValidationError('Sabit tutar 0\'dan büyük olmalıdır');
      }
    }

    if (type === 'BUY_X_GET_Y') {
      if (!buyQuantity || !getQuantity || buyQuantity <= 0 || getQuantity <= 0) {
        throw new ValidationError('Alış ve ödeme miktarları 0\'dan büyük olmalıdır');
      }
      if (getQuantity >= buyQuantity) {
        throw new ValidationError('Ödeme miktarı, alış miktarından küçük olmalıdır');
      }
    }

    return true;
  }
}

export default new CampaignService();
