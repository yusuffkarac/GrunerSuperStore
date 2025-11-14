import cartService from '../services/cart.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

class CartController {
  // GET /api/cart
  getCart = asyncHandler(async (req, res) => {
    const cart = await cartService.getCart(req.user.id);

    res.status(200).json({
      success: true,
      data: cart,
    });
  });

  // POST /api/cart
  addToCart = asyncHandler(async (req, res) => {
    const { productId, variantId, quantity } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Nicht autorisiert',
      });
    }

    const cartItem = await cartService.addToCart(req.user.id, {
      productId,
      variantId,
      quantity,
    });

    // Log kaydı - asenkron yap (fire-and-forget) - ana işlemi bloke etmesin
    activityLogService.createLog({
      userId: req.user.id,
      action: 'cart.add',
      entityType: 'product',
      entityId: productId,
      level: 'info',
      message: `Produkt zum Warenkorb hinzugefügt: Produkt ${productId} (Menge: ${quantity})`,
      metadata: { 
        productId, 
        variantId: variantId || null, 
        quantity, 
        cartItemId: cartItem?.id || null 
      },
      req,
    }).catch((logError) => {
      console.error('❌ [CART.ADD] Log kaydı hatası (async):', {
        error: logError.message || logError,
        userId: req.user.id,
        productId,
        quantity,
      });
    });

    res.status(201).json({
      success: true,
      message: 'Produkt zum Warenkorb hinzugefügt',
      data: { cartItem },
    });
  });

  // PUT /api/cart/:id
  updateCartItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Nicht autorisiert',
      });
    }

    const cartItem = await cartService.updateCartItem(req.user.id, id, {
      quantity,
    });

    // Log kaydı - asenkron yap (fire-and-forget)
    activityLogService.createLog({
      userId: req.user.id,
      action: 'cart.update',
      entityType: 'cart',
      entityId: id,
      level: 'info',
      message: `Warenkorb wurde aktualisiert: Artikel ${id} (Menge: ${quantity})`,
      metadata: { 
        cartItemId: id, 
        quantity,
        productId: cartItem?.productId || null,
      },
      req,
    }).catch((logError) => {
      console.error('❌ [CART.UPDATE] Log kaydı hatası (async):', {
        error: logError.message || logError,
        userId: req.user.id,
        cartItemId: id,
      });
    });

    res.status(200).json({
      success: true,
      message: 'Warenkorb aktualisiert',
      data: { cartItem },
    });
  });

  // DELETE /api/cart/:id
  deleteCartItem = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Nicht autorisiert',
      });
    }

    // Önce cartItem bilgisini al (log için)
    const cartItemBeforeDelete = await cartService.getCart(req.user.id);
    const itemToDelete = cartItemBeforeDelete.items?.find(item => item.id === id);

    const result = await cartService.deleteCartItem(req.user.id, id);

    // Log kaydı - asenkron yap (fire-and-forget)
    activityLogService.createLog({
      userId: req.user.id,
      action: 'cart.remove',
      entityType: 'cart',
      entityId: id,
      level: 'info',
      message: `Produkt aus Warenkorb entfernt: ${itemToDelete?.product?.name || id}`,
      metadata: { 
        cartItemId: id,
        productId: itemToDelete?.product?.id || null,
        productName: itemToDelete?.product?.name || null,
      },
      req,
    }).catch((logError) => {
      console.error('❌ [CART.REMOVE] Log kaydı hatası (async):', {
        error: logError.message || logError,
        userId: req.user.id,
        cartItemId: id,
      });
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // DELETE /api/cart
  clearCart = asyncHandler(async (req, res) => {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Nicht autorisiert',
      });
    }

    // Önce cart bilgisini al (log için item sayısı)
    const cartBeforeClear = await cartService.getCart(req.user.id);
    const itemCount = cartBeforeClear.items?.length || 0;

    const result = await cartService.clearCart(req.user.id);

    // Log kaydı - asenkron yap (fire-and-forget)
    activityLogService.createLog({
      userId: req.user.id,
      action: 'cart.clear',
      entityType: 'cart',
      entityId: null,
      level: 'info',
      message: `Warenkorb wurde geleert (${itemCount} Artikel entfernt)`,
      metadata: { 
        itemCount,
      },
      req,
    }).catch((logError) => {
      console.error('❌ [CART.CLEAR] Log kaydı hatası (async):', {
        error: logError.message || logError,
        userId: req.user.id,
        itemCount,
      });
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });
}

export default new CartController();
