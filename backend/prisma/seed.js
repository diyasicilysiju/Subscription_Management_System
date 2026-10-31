import {
  PrismaClient,
  Role,
  CustomerStatus,
  BillingInterval,
  QuotationStatus,
  SubscriptionStatus,
  InvoiceStatus,
  DiscountType,
  PaymentMethod,
  PaymentStatus,
  BillingRunStatus,
  DiscountApplicationStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting enhanced database seeding...');

  // 1. CLEAN UP EXISTING RECORDS SAFELY (REVERSE DEPENDENCY ORDER)
  console.log('Cleaning up existing records...');
  await prisma.auditLog.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.discountApplication.deleteMany();
  await prisma.discountProduct.deleteMany();
  await prisma.discountPlan.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.billingRun.deleteMany();
  await prisma.subscriptionItem.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 2. USERS
  console.log('Seeding users...');
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('Password123!', salt);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@brightloop.io',
      password: defaultPasswordHash,
      role: Role.ADMIN,
      firstName: 'Brightloop',
      lastName: 'Admin',
      phone: '+1-555-0100',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@brightloop.io',
      password: defaultPasswordHash,
      role: Role.STAFF,
      firstName: 'Sarah',
      lastName: 'Stafford',
      phone: '+1-555-0101',
    },
  });

  const customerUser1 = await prisma.user.create({
    data: {
      email: 'john.doe@acme.com',
      password: defaultPasswordHash,
      role: Role.CUSTOMER,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1-555-0102',
    },
  });

  const customerUser2 = await prisma.user.create({
    data: {
      email: 'jane.smith@globex.com',
      password: defaultPasswordHash,
      role: Role.CUSTOMER,
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1-555-0103',
    },
  });

  // 3. CUSTOMERS
  console.log('Seeding customers...');
  const acmeCustomer = await prisma.customer.create({
    data: {
      userId: customerUser1.id,
      companyName: 'Acme Corporation',
      contactName: 'John Doe',
      email: 'john.doe@acme.com',
      phone: '+1-555-0102',
      billingAddress: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
      shippingAddress: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
      taxNumber: 'US-EIN-987654321',
      status: CustomerStatus.ACTIVE,
    },
  });

  const globexCustomer = await prisma.customer.create({
    data: {
      userId: customerUser2.id,
      companyName: 'Globex Logistics',
      contactName: 'Jane Smith',
      email: 'jane.smith@globex.com',
      phone: '+1-555-0103',
      billingAddress: '500 Logistics Parkway, Austin, TX 78701',
      shippingAddress: '500 Logistics Parkway, Austin, TX 78701',
      taxNumber: 'US-EIN-123456789',
      status: CustomerStatus.ACTIVE,
    },
  });

  const initechCustomer = await prisma.customer.create({
    data: {
      companyName: 'Initech Industries',
      contactName: 'Peter Gibbons',
      email: 'billing@initech.com',
      phone: '+1-555-0199',
      billingAddress: '4120 Freemont Blvd, Dallas, TX 75201',
      shippingAddress: '4120 Freemont Blvd, Dallas, TX 75201',
      taxNumber: 'US-EIN-555666777',
      status: CustomerStatus.ACTIVE,
    },
  });

  // 4. PRODUCTS & VARIANTS (WITH COST, SALES PRICE, & PRICE ADJUSTMENTS)
  console.log('Seeding products & variants...');
  const cloudPlatform = await prisma.product.create({
    data: {
      name: 'Brightloop Cloud Platform',
      description: 'Enterprise subscription platform for workflow automation and analytics.',
      sku: 'PROD-BL-PLATFORM',
      salesPrice: 49.00, // Base sales price
      costPrice: 15.00,  // Base cost of service
      variants: {
        create: [
          {
            name: 'Standard Edition',
            sku: 'VAR-BL-PLAT-STD',
            price: 49.00, // Effective final price
            costPrice: 15.00,
            priceAdjustment: 0.00, // Delta from base
            attributes: { maxUsers: 5, storageGb: 50 },
          },
          {
            name: 'Professional Edition',
            sku: 'VAR-BL-PLAT-PRO',
            price: 99.00, // Effective final price
            costPrice: 28.00,
            priceAdjustment: 50.00, // Delta (+50)
            attributes: { maxUsers: 25, storageGb: 250 },
          },
          {
            name: 'Enterprise Edition',
            sku: 'VAR-BL-PLAT-ENT',
            price: 299.00, // Effective final price
            costPrice: 75.00,
            priceAdjustment: 250.00, // Delta (+250)
            attributes: { maxUsers: 'unlimited', storageGb: 1000 },
          },
        ],
      },
    },
    include: { variants: true },
  });

  const analyticsModule = await prisma.product.create({
    data: {
      name: 'Brightloop AI Analytics',
      description: 'Predictive revenue forecasting and customer retention intelligence.',
      sku: 'PROD-BL-ANALYTICS',
      salesPrice: 39.00,
      costPrice: 10.00,
      variants: {
        create: [
          {
            name: 'Standard Analytics',
            sku: 'VAR-BL-AN-STD',
            price: 39.00,
            costPrice: 10.00,
            priceAdjustment: 0.00,
            attributes: { frequency: 'daily', reports: 10 },
          },
          {
            name: 'Real-Time Predictive Suite',
            sku: 'VAR-BL-AN-PRED',
            price: 89.00,
            costPrice: 22.00,
            priceAdjustment: 50.00,
            attributes: { frequency: 'realtime', reports: 'unlimited' },
          },
        ],
      },
    },
    include: { variants: true },
  });

  // 5. SUBSCRIPTION PLANS (DAILY, WEEKLY, MONTHLY, YEARLY WITH MIN QUANTITY & AVAILABILITY)
  console.log('Seeding subscription plans...');
  const dailyPlan = await prisma.plan.create({
    data: {
      name: 'Daily Sandbox Plan',
      code: 'PLAN-DAILY',
      description: 'Short-term development and staging sandbox access.',
      billingInterval: BillingInterval.DAILY,
      intervalCount: 1,
      price: 5.00,
      currency: 'USD',
      trialDays: 1,
      minQuantity: 1,
      availableFrom: new Date('2026-01-01'),
    },
  });

  const weeklyPlan = await prisma.plan.create({
    data: {
      name: 'Weekly Sprint Plan',
      code: 'PLAN-WEEKLY',
      description: 'Ideal for short burst projects and sprint reviews.',
      billingInterval: BillingInterval.WEEKLY,
      intervalCount: 1,
      price: 25.00,
      currency: 'USD',
      trialDays: 3,
      minQuantity: 1,
      availableFrom: new Date('2026-01-01'),
    },
  });

  const starterMonthlyPlan = await prisma.plan.create({
    data: {
      name: 'Monthly Starter Plan',
      code: 'PLAN-MONTHLY-STARTER',
      description: 'Standard plan for early stage and small teams.',
      billingInterval: BillingInterval.MONTHLY,
      intervalCount: 1,
      price: 49.00,
      currency: 'USD',
      trialDays: 14,
      minQuantity: 1,
      availableFrom: new Date('2026-01-01'),
    },
  });

  const proMonthlyPlan = await prisma.plan.create({
    data: {
      name: 'Monthly Professional Plan',
      code: 'PLAN-MONTHLY-PRO',
      description: 'Comprehensive features for growing organizations.',
      billingInterval: BillingInterval.MONTHLY,
      intervalCount: 1,
      price: 99.00,
      currency: 'USD',
      trialDays: 14,
      minQuantity: 1,
      availableFrom: new Date('2026-01-01'),
    },
  });

  const yearlyEnterprisePlan = await prisma.plan.create({
    data: {
      name: 'Yearly Enterprise Plan',
      code: 'PLAN-YEARLY-ENT',
      description: 'Full enterprise package billed annually with 2 months free.',
      billingInterval: BillingInterval.YEARLY,
      intervalCount: 1,
      price: 990.00,
      currency: 'USD',
      trialDays: 30,
      minQuantity: 5, // Enterprise requires min 5 seats
      availableFrom: new Date('2026-01-01'),
    },
  });

  // 6. TAXES & DISCOUNTS (WITH MIN PURCHASE, ELIGIBILITY & USAGE LIMITS)
  console.log('Seeding taxes and discounts...');
  const usSalesTax = await prisma.tax.create({
    data: {
      name: 'US Standard Sales Tax',
      code: 'TAX-US-STD',
      rate: 8.25,
      description: 'Standard state and local sales tax',
    },
  });

  const euVatTax = await prisma.tax.create({
    data: {
      name: 'EU Standard VAT',
      code: 'TAX-EU-VAT',
      rate: 20.00,
      description: 'European Union Standard Value Added Tax',
    },
  });

  await prisma.tax.create({
    data: {
      name: 'Zero Tax / Tax Exempt',
      code: 'TAX-EXEMPT',
      rate: 0.00,
      description: 'B2B international export tax exemption',
    },
  });

  const earlyBirdDiscount = await prisma.discount.create({
    data: {
      name: 'Early Bird Special',
      code: 'EARLYBIRD15',
      type: DiscountType.PERCENTAGE,
      value: 15.00,
      minPurchaseAmount: 50.00,
      minQuantity: 1,
      maxUsesPerCustomer: 1,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      maxUses: 100,
      usedCount: 1,
      eligiblePlans: {
        create: [{ planId: starterMonthlyPlan.id }, { planId: proMonthlyPlan.id }],
      },
      eligibleProducts: {
        create: [{ productId: cloudPlatform.id }],
      },
    },
  });

  const promoCreditDiscount = await prisma.discount.create({
    data: {
      name: 'Direct Credit Promo',
      code: 'PROMO20',
      type: DiscountType.FIXED_AMOUNT,
      value: 20.00,
      minPurchaseAmount: 75.00,
      maxUsesPerCustomer: 2,
      maxUses: 50,
      usedCount: 0,
    },
  });

  // 7. SUBSCRIPTIONS (COVERING PENDING, TRIALING, ACTIVE, PAUSED)
  console.log('Seeding subscriptions...');
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const acmeSubscription = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0001',
      customerId: acmeCustomer.id,
      planId: proMonthlyPlan.id,
      status: SubscriptionStatus.ACTIVE,
      billingInterval: BillingInterval.MONTHLY,
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDaysLater,
      nextBillingDate: thirtyDaysLater,
      autoRenew: true,
      items: {
        create: [
          {
            variantId: cloudPlatform.variants[1].id, // Professional
            quantity: 1,
            unitPrice: 99.00,
          },
        ],
      },
    },
  });

  const globexSubscription = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0002',
      customerId: globexCustomer.id,
      planId: starterMonthlyPlan.id,
      status: SubscriptionStatus.TRIALING,
      billingInterval: BillingInterval.MONTHLY,
      startDate: now,
      trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDaysLater,
      nextBillingDate: thirtyDaysLater,
      autoRenew: true,
    },
  });

  await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0003',
      customerId: initechCustomer.id,
      planId: yearlyEnterprisePlan.id,
      status: SubscriptionStatus.PAUSED,
      billingInterval: BillingInterval.YEARLY,
      startDate: new Date('2026-01-01'),
      currentPeriodStart: new Date('2026-01-01'),
      currentPeriodEnd: new Date('2027-01-01'),
      nextBillingDate: new Date('2027-01-01'),
      pausedAt: new Date(),
      autoRenew: false,
      notes: 'Customer requested temporary hold during internal restructuring.',
    },
  });

  const pendingSubscription = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0004',
      customerId: globexCustomer.id,
      planId: proMonthlyPlan.id,
      status: SubscriptionStatus.PENDING,
      billingInterval: BillingInterval.MONTHLY,
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDaysLater,
      nextBillingDate: thirtyDaysLater,
      autoRenew: true,
      notes: 'Quotation converted, awaiting initial payment clearance.',
    },
  });

  // 8. QUOTATIONS & CONVERSION LINK
  console.log('Seeding quotations...');
  const quo1 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QUO-2026-0001',
      customerId: acmeCustomer.id,
      createdById: staffUser.id,
      status: QuotationStatus.CONVERTED,
      issueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      validUntil: thirtyDaysLater,
      subtotal: 99.00,
      discountAmount: 0.00,
      taxAmount: 8.17,
      totalAmount: 107.17,
      convertedSubscriptionId: acmeSubscription.id,
      terms: 'Standard net 30 payment terms.',
      items: {
        create: [
          {
            description: 'Monthly Professional Plan + Platform',
            planId: proMonthlyPlan.id,
            variantId: cloudPlatform.variants[1].id,
            quantity: 1,
            unitPrice: 99.00,
            discountAmount: 0.00,
            taxRate: 8.25,
            totalAmount: 107.17,
          },
        ],
      },
    },
  });

  const quo2 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QUO-2026-0002',
      customerId: globexCustomer.id,
      createdById: staffUser.id,
      status: QuotationStatus.SENT,
      issueDate: now,
      validUntil: thirtyDaysLater,
      subtotal: 138.00,
      discountAmount: 20.70, // 15% discount
      taxAmount: 9.68,
      totalAmount: 126.98,
      notes: 'Custom bundled discount offered for early signup.',
      items: {
        create: [
          {
            description: 'Monthly Starter Plan',
            planId: starterMonthlyPlan.id,
            quantity: 1,
            unitPrice: 49.00,
            discountAmount: 7.35,
            taxRate: 8.25,
            totalAmount: 45.09,
          },
          {
            description: 'Real-Time Predictive Suite Analytics',
            variantId: analyticsModule.variants[1].id,
            quantity: 1,
            unitPrice: 89.00,
            discountAmount: 13.35,
            taxRate: 8.25,
            totalAmount: 81.89,
          },
        ],
      },
    },
  });

  // Track quotation discount application
  await prisma.discountApplication.create({
    data: {
      discountId: earlyBirdDiscount.id,
      customerId: globexCustomer.id,
      quotationId: quo2.id,
      appliedAmount: 20.70,
      status: DiscountApplicationStatus.APPLIED,
    },
  });

  // 9. BILLING RUN (BATCH SCHEDULING OBSERVED RUN)
  console.log('Seeding billing run...');
  const billingRun1 = await prisma.billingRun.create({
    data: {
      targetBillingDate: now,
      status: BillingRunStatus.COMPLETED,
      subscriptionsEvaluated: 3,
      invoicesGenerated: 1,
      totalAmountBilled: 107.17,
      executionTimeMs: 420,
    },
  });

  // 10. INVOICES (RECURRING WITH FROZEN TAX RATE SNAPSHOTS & BILLING RUN)
  console.log('Seeding invoices...');
  const pastCycleStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const pastCycleEnd = now;

  const paidInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      customerId: acmeCustomer.id,
      subscriptionId: acmeSubscription.id,
      billingRunId: billingRun1.id,
      status: InvoiceStatus.PAID,
      issueDate: pastCycleStart,
      dueDate: new Date(pastCycleStart.getTime() + 15 * 24 * 60 * 60 * 1000),
      billingPeriodStart: pastCycleStart,
      billingPeriodEnd: pastCycleEnd,
      subtotal: 99.00,
      discountAmount: 0.00,
      taxAmount: 8.17,
      totalAmount: 107.17,
      amountPaid: 107.17,
      amountDue: 0.00,
      paidAt: new Date(pastCycleStart.getTime() + 2 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            description: 'Brightloop Platform - Professional Edition (Monthly)',
            variantId: cloudPlatform.variants[1].id,
            quantity: 1,
            unitPrice: 99.00,
            discountAmount: 0.00,
            taxRate: 8.25, // Frozen tax-rate snapshot
            taxAmount: 8.17,
            totalAmount: 107.17,
          },
        ],
      },
    },
  });

  const activeInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      customerId: acmeCustomer.id,
      subscriptionId: acmeSubscription.id,
      status: InvoiceStatus.ISSUED,
      issueDate: now,
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      billingPeriodStart: now,
      billingPeriodEnd: thirtyDaysLater,
      subtotal: 99.00,
      discountAmount: 0.00,
      taxAmount: 8.17,
      totalAmount: 107.17,
      amountPaid: 0.00,
      amountDue: 107.17,
      items: {
        create: [
          {
            description: 'Brightloop Platform - Professional Edition (Monthly Renewal)',
            variantId: cloudPlatform.variants[1].id,
            quantity: 1,
            unitPrice: 99.00,
            discountAmount: 0.00,
            taxRate: 8.25, // Frozen tax-rate snapshot
            taxAmount: 8.17,
            totalAmount: 107.17,
          },
        ],
      },
    },
  });

  // 11. PAYMENTS & ALLOCATIONS
  console.log('Seeding payments and allocations...');
  const payment1 = await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-0001',
      customerId: acmeCustomer.id,
      amount: 107.17,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.COMPLETED,
      transactionReference: 'ch_stripe_mock_948290384234',
      paymentDate: new Date(pastCycleStart.getTime() + 2 * 24 * 60 * 60 * 1000),
      notes: 'Automated recurring payment via Stripe.',
      allocations: {
        create: [
          {
            invoiceId: paidInvoice.id,
            amount: 107.17,
          },
        ],
      },
    },
  });

  // 12. AUDIT LOGS
  console.log('Seeding audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'SYSTEM_INITIALIZED',
        entity: 'Database',
        details: { version: '1.1.0', initializedBy: adminUser.email },
      },
      {
        userId: staffUser.id,
        action: 'QUOTATION_CONVERTED',
        entity: 'Quotation',
        entityId: 'QUO-2026-0001',
        details: { quotationNumber: 'QUO-2026-0001', convertedSubscription: 'SUB-2026-0001' },
      },
      {
        userId: customerUser1.id,
        action: 'INVOICE_PAID',
        entity: 'Invoice',
        entityId: paidInvoice.id,
        details: { invoiceNumber: paidInvoice.invoiceNumber, amount: 107.17, paymentMethod: 'CREDIT_CARD' },
      },
    ],
  });

  console.log('✅ Enhanced database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
