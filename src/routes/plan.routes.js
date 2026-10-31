import { Router } from 'express';
import * as planController from '../controllers/plan.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { createPlanSchema, updatePlanSchema } from '../validations/plan.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Publicly visible subscription plans (Daily, Weekly, Monthly, Yearly)
router.get('/', planController.getPlans);
router.get('/:id', planController.getPlan);

// Admin and Staff can create and manage subscription plans
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(createPlanSchema),
  planController.createPlan
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(updatePlanSchema),
  planController.updatePlan
);

export default router;
