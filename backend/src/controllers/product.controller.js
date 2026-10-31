import * as productService from '../services/product.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getProducts = async (req, res, next) => {
  try {
    const { products, meta } = await productService.getAllProducts(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Products retrieved successfully',
      data: { products },
      meta,
    });
  } catch (error) {
    return next(error);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Product retrieved successfully',
      data: { product },
    });
  } catch (error) {
    return next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Product updated successfully',
      data: { product },
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await productService.deleteProduct(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Product deactivated successfully',
      data: { product },
    });
  } catch (error) {
    return next(error);
  }
};

export const addProductVariant = async (req, res, next) => {
  try {
    const variant = await productService.addVariant(req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Product variant added successfully',
      data: { variant },
    });
  } catch (error) {
    return next(error);
  }
};
