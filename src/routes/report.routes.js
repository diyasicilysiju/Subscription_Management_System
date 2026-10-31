import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roleCheck.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.STAFF));

router.get('/summary', reportController.getSummary); // ?from=&to=
router.get('/metrics', reportController.getMetrics); // dashboard KPIs + chart series
router.get('/revenue', reportController.getRevenueReport); // ?timeframe=monthly|quarterly|yearly or ?from=&to=

export default router;
