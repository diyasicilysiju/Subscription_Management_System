import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { createProductSchema, updateProductSchema } from '../validations/product.validation.js';
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

export default router;
