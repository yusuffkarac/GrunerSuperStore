import productService from '../services/product.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class ProductController {
  // GET /api/products
  getProducts = asyncHandler(async (req, res) => {
    const {
      categoryId,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      isFeatured,
    } = req.query;

    const result = await productService.getProducts({
      categoryId,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      isFeatured,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  // GET /api/products/:id
  getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await productService.getProductById(id);

    res.status(200).json({
      success: true,
      data: { product },
    });
  });

  // GET /api/products/slug/:slug
  getProductBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const product = await productService.getProductBySlug(slug);

    res.status(200).json({
      success: true,
      data: { product },
    });
  });

  // GET /api/products/featured
  getFeaturedProducts = asyncHandler(async (req, res) => {
    const { limit } = req.query;

    const products = await productService.getFeaturedProducts(limit);

    res.status(200).json({
      success: true,
      data: { products },
    });
  });
}

export default new ProductController();
