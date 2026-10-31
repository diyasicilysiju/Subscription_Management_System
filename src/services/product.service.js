import prisma from '../config/db.js';
import { NotFoundError, ConflictError } from '../utils/appError.js';

/**
 * Product & Variant Service
 * Uses the shared Prisma singleton client from src/config/db.js.
 */

/**
 * List products with optional search, filter, and pagination
 * @param {Object} query - { search, isActive, page, limit }
 */
export const getAllProducts = async ({ search = '', isActive, page = 1, limit = 20 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * take;

  const where = {};

  if (isActive !== undefined && isActive !== '') {
    where.isActive = String(isActive) === 'true';
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: {
          where: isActive !== undefined && isActive !== '' ? { isActive: String(isActive) === 'true' } : undefined,
          orderBy: { price: 'asc' },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    meta: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
};

/**
 * Get product by UUID including all variants
 * @param {string} id 
 */
export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: {
        orderBy: { price: 'asc' },
      },
    },
  });

  if (!product) {
    throw new NotFoundError(`Product with ID '${id}' not found`);
  }

  return product;
};

/**
 * Create a new product with optional variants
 * @param {Object} data 
 */
export const createProduct = async (data) => {
  const { variants = [], ...productData } = data;

  // Check SKU uniqueness if provided
  if (productData.sku) {
    const existing = await prisma.product.findUnique({
      where: { sku: productData.sku },
    });
    if (existing) {
      throw new ConflictError(`Product with SKU '${productData.sku}' already exists`);
    }
  }

  // Check variant SKUs for uniqueness
  if (variants.length > 0) {
    const skus = variants.map((v) => v.sku);
    const existingVariants = await prisma.productVariant.findMany({
      where: { sku: { in: skus } },
    });
    if (existingVariants.length > 0) {
      throw new ConflictError(`Variant with SKU '${existingVariants[0].sku}' already exists`);
    }
  }

  // Calculate pricing adjustments per Member 3 convention
  const formattedVariants = variants.map((v) => {
    const priceAdjustment =
      v.priceAdjustment !== undefined
        ? v.priceAdjustment
        : Number(v.price) - Number(productData.salesPrice || 0);

    return {
      name: v.name,
      sku: v.sku,
      price: v.price,
      costPrice: v.costPrice !== undefined ? v.costPrice : productData.costPrice || 0,
      priceAdjustment,
      attributes: v.attributes || null,
      isActive: v.isActive !== undefined ? v.isActive : true,
    };
  });

  return prisma.product.create({
    data: {
      name: productData.name,
      description: productData.description || null,
      sku: productData.sku || null,
      salesPrice: productData.salesPrice,
      costPrice: productData.costPrice || 0,
      isActive: productData.isActive !== undefined ? productData.isActive : true,
      variants: formattedVariants.length > 0 ? { create: formattedVariants } : undefined,
    },
    include: {
      variants: true,
    },
  });
};

/**
 * Update product details
 * @param {string} id 
 * @param {Object} data 
 */
export const updateProduct = async (id, data) => {
  await getProductById(id);

  const { variants, ...updateData } = data;

  if (updateData.sku) {
    const existing = await prisma.product.findFirst({
      where: { sku: updateData.sku, NOT: { id } },
    });
    if (existing) {
      throw new ConflictError(`Product with SKU '${updateData.sku}' already exists`);
    }
  }

  return prisma.product.update({
    where: { id },
    data: updateData,
    include: { variants: true },
  });
};

/**
 * Soft delete product (set isActive to false)
 * @param {string} id 
 */
export const deleteProduct = async (id) => {
  await getProductById(id);

  return prisma.$transaction([
    prisma.productVariant.updateMany({
      where: { productId: id },
      data: { isActive: false },
    }),
    prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: { variants: true },
    }),
  ]).then((results) => results[1]);
};

/**
 * Add a new variant to an existing product
 * @param {string} productId 
 * @param {Object} variantData 
 */
export const addVariant = async (productId, variantData) => {
  const product = await getProductById(productId);

  const existingVariant = await prisma.productVariant.findUnique({
    where: { sku: variantData.sku },
  });
  if (existingVariant) {
    throw new ConflictError(`Variant with SKU '${variantData.sku}' already exists`);
  }

  const priceAdjustment =
    variantData.priceAdjustment !== undefined
      ? variantData.priceAdjustment
      : Number(variantData.price) - Number(product.salesPrice);

  return prisma.productVariant.create({
    data: {
      productId,
      name: variantData.name,
      sku: variantData.sku,
      price: variantData.price,
      costPrice: variantData.costPrice !== undefined ? variantData.costPrice : product.costPrice,
      priceAdjustment,
      attributes: variantData.attributes || null,
      isActive: variantData.isActive !== undefined ? variantData.isActive : true,
    },
  });
};
