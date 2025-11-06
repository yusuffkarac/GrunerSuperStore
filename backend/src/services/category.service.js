import prisma from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';

class CategoryService {
  // Admin: Tüm kategorileri getir (isActive filtresi olmadan)
  async getCategoriesForAdmin({ isActive, search, sortBy = 'sortOrder', sortOrder = 'asc' }) {
    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const categories = await prisma.category.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return categories;
  }

  // Admin: Kategori oluştur
  async createCategory(data) {
    // Slug oluştur
    let slug = data.slug;
    if (!slug && data.name) {
      slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Slug'un benzersiz olduğundan emin ol
    if (slug) {
      const existingCategory = await prisma.category.findUnique({
        where: { slug },
      });

      if (existingCategory) {
        throw new Error('Eine Kategorie mit diesem Slug existiert bereits');
      }
    }

    const category = await prisma.category.create({
      data: {
        ...data,
        ...(slug && { slug }),
        sortOrder: data.sortOrder ? parseInt(data.sortOrder) : null,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return category;
  }

  // Admin: Kategori güncelle
  async updateCategory(id, data) {
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundError('Kategorie nicht gefunden');
    }

    // Slug güncelleme
    let slug = data.slug;
    if (data.name && !slug) {
      slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Slug'un benzersiz olduğundan emin ol (kendi ID'si hariç)
    if (slug && slug !== existingCategory.slug) {
      const slugExists = await prisma.category.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      });

      if (slugExists) {
        throw new Error('Eine Kategorie mit diesem Slug existiert bereits');
      }
    }

    const updateData = {
      ...data,
      ...(slug && { slug }),
    };

    if (data.sortOrder !== undefined) {
      updateData.sortOrder = data.sortOrder ? parseInt(data.sortOrder) : null;
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return category;
  }

  // Admin: Kategori sil
  async deleteCategory(id) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Kategorie nicht gefunden');
    }

    // Ürünlerde kullanılıyorsa silme
    if (category._count.products > 0) {
      // Ürünlerde kullanılıyorsa sadece isActive=false yap
      await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'Kategorie wurde deaktiviert (wird in Produkten verwendet)' };
    }

    // Ürünlerde kullanılmıyorsa tamamen sil
    await prisma.category.delete({
      where: { id },
    });

    return { message: 'Kategorie wurde gelöscht' };
  }
}

export default new CategoryService();

