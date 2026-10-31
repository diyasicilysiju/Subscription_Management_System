import { Router } from 'express';
import * as taxController from '../controllers/tax.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validate.js';
import { createTaxSchema, updateTaxSchema } from '../validations/tax.validation.js';
import { requireUuidParams } from '../validations/common.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

// Admin and Staff can read tax rules; only the Admin configures them.
router.get('/', authorize(ROLES.ADMIN, ROLES.STAFF), taxController.listTaxes);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.STAFF), requireUuidParams('id'), taxController.getTax);
router.post('/', authorize(ROLES.ADMIN), validate(createTaxSchema), taxController.createTax);
router.put('/:id', authorize(ROLES.ADMIN), requireUuidParams('id'), validate(updateTaxSchema), taxController.updateTax);

export default router;
