import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { requireUuidParams } from '../validations/common.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();
const staff = authorize(ROLES.ADMIN, ROLES.STAFF);

router.use(authenticate);

// Customers read their own (non-draft) invoices; the service enforces ownership.
router.get('/', invoiceController.listInvoices);
router.get('/:id', requireUuidParams('id'), invoiceController.getInvoice);

router.post('/:id/confirm', staff, requireUuidParams('id'), invoiceController.confirmInvoice);
router.post('/:id/cancel', staff, requireUuidParams('id'), invoiceController.cancelInvoice);
router.post('/:id/send', staff, requireUuidParams('id'), invoiceController.sendInvoice);

export default router;
