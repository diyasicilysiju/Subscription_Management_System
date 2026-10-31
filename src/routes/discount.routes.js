import { Router } from 'express';
import * as discountController from '../controllers/discount.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validate.js';
import { createDiscountSchema, updateDiscountSchema } from '../validations/discount.validation.js';
import { requireUuidParams } from '../validations/common.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

// Admin and Staff can read discount rules; only the Admin can create or change them.
router.get('/', authorize(ROLES.ADMIN, ROLES.STAFF), discountController.listDiscounts);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.STAFF), requireUuidParams('id'), discountController.getDiscount);
router.post('/', authorize(ROLES.ADMIN), validate(createDiscountSchema), discountController.createDiscount);
router.put('/:id', authorize(ROLES.ADMIN), requireUuidParams('id'), validate(updateDiscountSchema), discountController.updateDiscount);
router.delete('/:id', authorize(ROLES.ADMIN), requireUuidParams('id'), discountController.deactivateDiscount);

export default router;
