import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import {
  createProductSchema,
  updateProductSchema,
  productVariantSchema,
} from '../validations/product.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Publicly visible products catalogue
router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);

// Admin and Staff can create and manage products
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(createProductSchema),
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  productController.deleteProduct
);

// Admin and Staff can add variants
router.post(
  '/:id/variants',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(productVariantSchema),
  productController.addProductVariant
);

export default router;
