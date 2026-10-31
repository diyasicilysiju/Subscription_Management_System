import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import customerRoutes from './customer.routes.js';
import productRoutes from './product.routes.js';
import planRoutes from './plan.routes.js';
import quotationRoutes from './quotation.routes.js';
import quotationTemplateRoutes from './quotationTemplate.routes.js';
import planLifecycleRoutes from './planLifecycle.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import invoiceRoutes from './invoice.routes.js';
import paymentRoutes from './payment.routes.js';
import billingRoutes from './billing.routes.js';
import reportRoutes from './report.routes.js';
import taxRoutes from './tax.routes.js';
import discountRoutes from './discount.routes.js';

const apiRouter = Router();

// Route mounting
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/plans', planRoutes);

// Subscriptions, billing & finance (Member 4)
apiRouter.use('/plans', planLifecycleRoutes); // PATCH /plans/:id/lifecycle (sits beside Member 2's plan routes)
apiRouter.use('/quotation-templates', quotationTemplateRoutes);
apiRouter.use('/quotations', quotationRoutes);
apiRouter.use('/subscriptions', subscriptionRoutes);
apiRouter.use('/invoices', invoiceRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/billing', billingRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/taxes', taxRoutes);
apiRouter.use('/discounts', discountRoutes);

export default apiRouter;
