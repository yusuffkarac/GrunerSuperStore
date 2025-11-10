import express from 'express';
import campaignController from '../controllers/campaign.controller.js';
import { authenticateAdmin, requirePermission } from '../middleware/admin.js';

const router = express.Router();

// ===============================
// PUBLIC ENDPOINTS (Müşteri)
// ===============================

// GET /api/campaigns/active - Aktif kampanyaları getir
router.get('/active', campaignController.getActiveCampaigns);

// GET /api/campaigns/slug/:slug - Slug ile kampanya getir
router.get('/slug/:slug', campaignController.getCampaignBySlug);

// GET /api/campaigns/:id - ID ile kampanya getir
router.get('/:id', campaignController.getCampaignById);

// POST /api/campaigns/applicable - Belirli ürün/kategori için geçerli kampanyalar
router.post('/applicable', campaignController.getApplicableCampaigns);

// ===============================
// ADMIN ENDPOINTS
// ===============================

// Admin authentication gerekli
const adminRouter = express.Router();
adminRouter.use(authenticateAdmin);

// GET /api/admin/campaigns - Tüm kampanyaları listele
adminRouter.get('/', requirePermission('marketing_campaigns'), campaignController.getAllCampaigns);

// POST /api/admin/campaigns - Yeni kampanya oluştur
adminRouter.post('/', requirePermission('marketing_campaigns'), campaignController.createCampaign);

// GET /api/admin/campaigns/:id - Tek kampanya getir
adminRouter.get('/:id', requirePermission('marketing_campaigns'), campaignController.getAdminCampaignById);

// PUT /api/admin/campaigns/:id - Kampanya güncelle
adminRouter.put('/:id', requirePermission('marketing_campaigns'), campaignController.updateCampaign);

// DELETE /api/admin/campaigns/:id - Kampanya sil
adminRouter.delete('/:id', requirePermission('marketing_campaigns'), campaignController.deleteCampaign);

export { adminRouter as adminCampaignRouter };
export default router;
