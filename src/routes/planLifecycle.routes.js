import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validate.js';
import { requireUuidParams } from '../validations/common.validation.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/appError.js';
import { plain } from '../utils/money.js';
import { ROLES } from '../constants/roles.js';

/**
 * Per-plan lifecycle switches (Member 4): which actions subscribers of a plan may take
 * and whether its subscriptions close on their own at the end date. Mounted next to
 * Member 2's /plans routes so their plan CRUD stays untouched.
 */
const lifecycleSchema = z
  .object({
    allowPause: z.boolean().optional(),
    allowEarlyClose: z.boolean().optional(),
    allowRenew: z.boolean().optional(),
    autoCloseOnEnd: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Send at least one of allowPause, allowEarlyClose, allowRenew, autoCloseOnEnd' });

const router = Router();

router.patch(
  '/:id/lifecycle',
  authenticate,
  authorize(ROLES.ADMIN),
  requireUuidParams('id'),
  validate(lifecycleSchema),
  asyncHandler(async (req, res) => {
    const exists = await prisma.plan.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!exists) throw new NotFoundError('Subscription plan not found');
    const plan = await prisma.plan.update({ where: { id: req.params.id }, data: req.body });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'PLAN_LIFECYCLE_UPDATED', entity: 'Plan', entityId: plan.id, details: req.body } });
    return sendSuccess(res, { message: 'Plan lifecycle settings updated', data: plain({ plan }) });
  })
);

export default router;
