import { Router } from 'express';
import * as templateController from '../controllers/quotationTemplate.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validate.js';
import { createTemplateSchema, updateTemplateSchema } from '../validations/quotation.validation.js';
import { requireUuidParams } from '../validations/common.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

// Admin and Staff read templates (sales reps start quotations from them); only the Admin manages them.
router.get('/', authorize(ROLES.ADMIN, ROLES.STAFF), templateController.listTemplates);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.STAFF), requireUuidParams('id'), templateController.getTemplate);
router.post('/', authorize(ROLES.ADMIN), validate(createTemplateSchema), templateController.createTemplate);
router.put('/:id', authorize(ROLES.ADMIN), requireUuidParams('id'), validate(updateTemplateSchema), templateController.updateTemplate);
router.delete('/:id', authorize(ROLES.ADMIN), requireUuidParams('id'), templateController.deactivateTemplate);

export default router;
