import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validate.js';
import { cancelSubscriptionSchema, createSubscriptionSchema } from '../validations/subscription.validation.js';
import { requireUuidParams } from '../validations/common.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

// Everyone signed in can list / read; the service scopes Customers to their own records.
router.get('/', subscriptionController.listSubscriptions);
router.get('/:id', requireUuidParams('id'), subscriptionController.getSubscription);

// Staff-only: create and activate.
router.post('/', authorize(ROLES.ADMIN, ROLES.STAFF), validate(createSubscriptionSchema), subscriptionController.createSubscription);
router.post('/:id/activate', authorize(ROLES.ADMIN, ROLES.STAFF), requireUuidParams('id'), subscriptionController.activateSubscription);

// Self-service actions: staff on anything, customers on their own (ownership checked in the service).
router.post('/:id/pause', requireUuidParams('id'), subscriptionController.pauseSubscription);
router.post('/:id/resume', requireUuidParams('id'), subscriptionController.resumeSubscription);
router.post('/:id/cancel', requireUuidParams('id'), validate(cancelSubscriptionSchema), subscriptionController.cancelSubscription);
router.post('/:id/renew', requireUuidParams('id'), subscriptionController.renewSubscription);

export default router;
