import prisma from '../config/db.js';
import { AppError, NotFoundError } from '../utils/appError.js';

/**
 * Product Service
 * 
 * NOTE FOR MEMBER 3:
 * Awaits product & variant models in schema.prisma.
 */

export const getAllProducts = async () => {
  if (!prisma?.product) {
    throw new AppError('Product model awaiting Member 3 schema.prisma definition.', 503);
  }
  return prisma.product.findMany({ include: { variants: true } });
};

export const getProductById = async (id) => {
  if (!prisma?.product) {
    throw new AppError('Product model awaiting Member 3 schema.prisma definition.', 503);
  }
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!product) throw new NotFoundError('Product not found');
  return product;
};

export const createProduct = async (data) => {
  if (!prisma?.product) {
    throw new AppError('Product model awaiting Member 3 schema.prisma definition.', 503);
  }
  const { variants, ...productData } = data;
  return prisma.product.create({
    data: {
      ...productData,
      variants: variants && variants.length > 0 ? { create: variants } : undefined,
    },
    include: { variants: true },
  });
};

export const updateProduct = async (id, data) => {
  if (!prisma?.product) {
    throw new AppError('Product model awaiting Member 3 schema.prisma definition.', 503);
  }
  return prisma.product.update({ where: { id }, data });
};
