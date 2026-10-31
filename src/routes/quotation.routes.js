import { Router } from 'express';
import * as quotationController from '../controllers/quotation.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validate.js';
import { convertQuotationSchema, createQuotationSchema } from '../validations/quotation.validation.js';
import { requireUuidParams } from '../validations/common.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();
const staff = authorize(ROLES.ADMIN, ROLES.STAFF);

router.use(authenticate);

// Customers may read (sent) quotations addressed to them and accept / reject them.
router.get('/', quotationController.listQuotations);
router.get('/:id', requireUuidParams('id'), quotationController.getQuotation);
router.post('/:id/accept', requireUuidParams('id'), quotationController.acceptQuotation);
router.post('/:id/reject', requireUuidParams('id'), quotationController.rejectQuotation);

// Staff-only
router.post('/', staff, validate(createQuotationSchema), quotationController.createQuotation);
router.post('/:id/send', staff, requireUuidParams('id'), quotationController.sendQuotation);
router.post('/:id/convert', staff, requireUuidParams('id'), validate(convertQuotationSchema), quotationController.convertQuotation);

export default router;
