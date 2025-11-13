import campaignService from '../services/campaign.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

class CampaignController {
  // ===============================
  // PUBLIC ENDPOINTS (Müşteri)
  // ===============================

  // GET /api/campaigns/active - Aktif kampanyaları getir
  getActiveCampaigns = asyncHandler(async (req, res) => {
    const campaigns = await campaignService.getActiveCampaigns();

    res.status(200).json({
      success: true,
      data: { campaigns },
    });
  });

  // GET /api/campaigns/:id - Tek kampanya getir (ID)
  getCampaignById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const campaign = await campaignService.getCampaignById(id);

    res.status(200).json({
      success: true,
      data: { campaign },
    });
  });

  // GET /api/campaigns/slug/:slug - Tek kampanya getir (slug)
  getCampaignBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const campaign = await campaignService.getCampaignBySlug(slug);

    res.status(200).json({
      success: true,
      data: { campaign },
    });
  });

  // POST /api/campaigns/applicable - Belirli ürün/kategori için geçerli kampanyalar
  getApplicableCampaigns = asyncHandler(async (req, res) => {
    const { productId, categoryId, cartTotal } = req.body;

    const campaigns = await campaignService.getApplicableCampaigns({
      productId,
      categoryId,
      cartTotal,
    });

    res.status(200).json({
      success: true,
      data: { campaigns },
    });
  });

  // ===============================
  // ADMIN ENDPOINTS
  // ===============================

  // GET /api/admin/campaigns - Tüm kampanyaları listele
  getAllCampaigns = asyncHandler(async (req, res) => {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      type: req.query.type,
      isActive: req.query.isActive,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await campaignService.getAllCampaigns(filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // POST /api/admin/campaigns - Yeni kampanya oluştur
  createCampaign = asyncHandler(async (req, res) => {
    const adminId = req.admin.id;
    const campaign = await campaignService.createCampaign(req.body);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'campaign.create',
      entityType: 'campaign',
      entityId: campaign.id,
      level: 'success',
      message: `Kampagne wurde erstellt: ${campaign.name} (${campaign.type})`,
      metadata: { campaignId: campaign.id, name: campaign.name, type: campaign.type },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Kampanya başarıyla oluşturuldu',
      data: { campaign },
    });
  });

  // PUT /api/admin/campaigns/:id - Kampanya güncelle
  updateCampaign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin.id;
    const campaign = await campaignService.updateCampaign(id, req.body);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'campaign.update',
      entityType: 'campaign',
      entityId: campaign.id,
      level: 'info',
      message: `Kampagne wurde aktualisiert: ${campaign.name}`,
      metadata: { campaignId: campaign.id, name: campaign.name },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Kampanya başarıyla güncellendi',
      data: { campaign },
    });
  });

  // DELETE /api/admin/campaigns/:id - Kampanya sil
  deleteCampaign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin.id;
    
    // Önce kampanya bilgisini al (log için)
    const campaign = await campaignService.getCampaignById(id);
    
    await campaignService.deleteCampaign(id);

    // Log kaydı
    await activityLogService.createLog({
      adminId,
      action: 'campaign.delete',
      entityType: 'campaign',
      entityId: id,
      level: 'warning',
      message: `Kampagne wurde gelöscht: ${campaign?.name || id}`,
      metadata: { campaignId: id, name: campaign?.name },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Kampanya başarıyla silindi',
    });
  });

  // GET /api/admin/campaigns/:id - Tek kampanya getir (admin için)
  getAdminCampaignById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const campaign = await campaignService.getCampaignById(id);

    res.status(200).json({
      success: true,
      data: { campaign },
    });
  });
}

export default new CampaignController();
