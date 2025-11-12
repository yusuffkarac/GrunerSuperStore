import prisma from '../config/prisma.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Kayıtlı supplier email'lerini getir
 */
export const getSupplierEmails = async () => {
  const emails = await prisma.supplierEmail.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      admin: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  return emails;
};

/**
 * Yeni supplier email ekle
 */
export const addSupplierEmail = async (name, email, adminId) => {
  if (!email || !email.includes('@')) {
    throw new BadRequestError('Geçerli bir email adresi giriniz');
  }

  // Email zaten var mı kontrol et
  const existingEmail = await prisma.supplierEmail.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (existingEmail) {
    throw new BadRequestError('Bu email adresi zaten kayıtlı');
  }

  const supplierEmail = await prisma.supplierEmail.create({
    data: {
      name: name ? name.trim() : null,
      email: email.trim().toLowerCase(),
      createdBy: adminId,
    },
    include: {
      admin: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  return supplierEmail;
};

