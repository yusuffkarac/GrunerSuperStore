import productService from '../services/product.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class CategoryController {
  // GET /api/categories
  getCategories = asyncHandler(async (req, res) => {
    const categories = await productService.getCategories();

    res.status(200).json({
      success: true,
      data: { categories },
    });
  });
}

export default new CategoryController();
