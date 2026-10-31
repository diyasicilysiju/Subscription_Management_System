import { Router } from 'express';
import * as customerController from '../controllers/customer.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize, authorizeOwnerOrStaff } from '../middlewares/roleCheck.js';
import { createCustomerSchema, updateCustomerSchema } from '../validations/customer.validation.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

// Staff and Admin can view all customers
router.get('/', authorize(ROLES.ADMIN, ROLES.STAFF), customerController.getCustomers);

// Customers can view their own record; Staff/Admin can view any customer
router.get('/:id', authorizeOwnerOrStaff('id'), customerController.getCustomer);

// Staff and Admin can create customers
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(createCustomerSchema),
  customerController.createCustomer
);

// Staff and Admin can update customers
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(updateCustomerSchema),
  customerController.updateCustomer
);

export default router;
