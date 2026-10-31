import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validate.js';
import { recordPaymentSchema } from '../validations/payment.validation.js';
import { requireUuidParams } from '../validations/common.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

// Customers see their own payment history; the service enforces ownership.
router.get('/', paymentController.listPayments);
router.get('/:id', requireUuidParams('id'), paymentController.getPayment);

// Only Admin / Staff record payments.
router.post('/', authorize(ROLES.ADMIN, ROLES.STAFF), validate(recordPaymentSchema), paymentController.recordPayment);

export default router;
