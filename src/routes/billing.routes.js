import { Router } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validate.js';
import { runBillingSchema } from '../validations/billing.validation.js';
import { requireUuidParams } from '../validations/common.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

// Only the Admin can trigger billing manually; Staff may inspect past runs.
router.post('/run', authorize(ROLES.ADMIN), validate(runBillingSchema), billingController.runBilling);
router.get('/runs', authorize(ROLES.ADMIN, ROLES.STAFF), billingController.listBillingRuns);
router.get('/runs/:id', authorize(ROLES.ADMIN, ROLES.STAFF), requireUuidParams('id'), billingController.getBillingRun);

export default router;
