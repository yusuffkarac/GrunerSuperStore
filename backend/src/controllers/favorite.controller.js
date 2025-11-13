import favoriteService from '../services/favorite.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

class FavoriteController {
  // GET /api/favorites - Favori ürünleri listele
  getFavorites = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await favoriteService.getFavorites(userId, filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/favorites/ids - Favori ID'lerini getir
  getFavoriteIds = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const favoriteIds = await favoriteService.getFavoriteIds(userId);

    res.status(200).json({
      success: true,
      data: { favoriteIds },
    });
  });

  // POST /api/favorites/:productId - Favorilere ekle
  addFavorite = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;

    const favorite = await favoriteService.addFavorite(userId, productId);

    // Log kaydı
    await activityLogService.createLog({
      userId,
      action: 'favorite.add',
      entityType: 'product',
      entityId: productId,
      level: 'info',
      message: `Produkt zu Favoriten hinzugefügt: Produkt ${productId}`,
      metadata: { productId },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Produkt zu Favoriten hinzugefügt',
      data: { favorite },
    });
  });

  // DELETE /api/favorites/:productId - Favorilerden çıkar
  removeFavorite = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;

    await favoriteService.removeFavorite(userId, productId);

    // Log kaydı
    await activityLogService.createLog({
      userId,
      action: 'favorite.remove',
      entityType: 'product',
      entityId: productId,
      level: 'info',
      message: `Produkt aus Favoriten entfernt: Produkt ${productId}`,
      metadata: { productId },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Produkt aus Favoriten entfernt',
    });
  });

  // GET /api/favorites/check/:productId - Ürün favorilerde mi kontrol et
  checkFavorite = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { productId } = req.params;

    const result = await favoriteService.isFavorite(userId, productId);

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}

export default new FavoriteController();
