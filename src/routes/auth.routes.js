import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { registerSchema, loginSchema, createStaffSchema } from '../validations/auth.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

/**
 * Public Authentication Routes (Rate limited)
 */
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * Authenticated User Routes
 */
router.get('/me', authenticate, authController.getMe);

/**
 * Admin Only: Create Staff Account
 */
router.post(
  '/staff',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(createStaffSchema),
  authController.createStaff
);

export default router;
