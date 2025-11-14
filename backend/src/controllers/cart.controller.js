import cartService from '../services/cart.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

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

    const cartItem = await cartService.addToCart(req.user.id, {
      productId,
      variantId,
      quantity,
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

    const cartItem = await cartService.updateCartItem(req.user.id, id, {
      quantity,
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

    const result = await cartService.deleteCartItem(req.user.id, id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // DELETE /api/cart
  clearCart = asyncHandler(async (req, res) => {
    const result = await cartService.clearCart(req.user.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });
}

export default new CartController();
