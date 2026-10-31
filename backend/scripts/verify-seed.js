import prisma from '../src/config/db.js';

async function verify() {
  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    plans: await prisma.plan.count(),
    taxes: await prisma.tax.count(),
    discounts: await prisma.discount.count(),
    discountProducts: await prisma.discountProduct.count(),
    discountPlans: await prisma.discountPlan.count(),
    discountApplications: await prisma.discountApplication.count(),
    quotations: await prisma.quotation.count(),
    quotationItems: await prisma.quotationItem.count(),
    subscriptions: await prisma.subscription.count(),
    subscriptionItems: await prisma.subscriptionItem.count(),
    billingRuns: await prisma.billingRun.count(),
    invoices: await prisma.invoice.count(),
    invoiceItems: await prisma.invoiceItem.count(),
    payments: await prisma.payment.count(),
    paymentAllocations: await prisma.paymentAllocation.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('--- ENHANCED DATABASE RECORD COUNTS ---');
  console.table(counts);

  // 1. Verify Product & Variant pricing fields
  const products = await prisma.product.findMany({
    select: {
      name: true,
      salesPrice: true,
      costPrice: true,
      variants: {
        select: {
          name: true,
          price: true,
          costPrice: true,
          priceAdjustment: true,
        },
      },
    },
  });
  console.log('Product & Variant Pricing Verification:', JSON.stringify(products, null, 2));

  // 2. Verify Plans with minQuantity and availability
  const plans = await prisma.plan.findMany({
    select: { name: true, billingInterval: true, price: true, minQuantity: true, availableFrom: true },
  });
  console.log('Plans Verification:', plans);

  // 3. Verify Subscriptions including PENDING status
  const subscriptions = await prisma.subscription.findMany({
    select: { subscriptionNumber: true, status: true, billingInterval: true },
  });
  console.log('Subscription Statuses Verification:', subscriptions);

  // 4. Verify InvoiceItem frozen taxRate snapshot & BillingRun link
  const sampleInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: 'INV-2026-0001' },
    include: {
      billingRun: true,
      items: true,
    },
  });
  console.log('Sample Invoice Details (BillingRun & Frozen TaxRate Snapshot):', {
    invoiceNumber: sampleInvoice.invoiceNumber,
    billingRunStatus: sampleInvoice.billingRun?.status,
    itemDescription: sampleInvoice.items[0]?.description,
    unitPrice: sampleInvoice.items[0]?.unitPrice,
    taxRateSnapshot: sampleInvoice.items[0]?.taxRate,
    taxAmount: sampleInvoice.items[0]?.taxAmount,
  });

  // 5. Verify Discount Application & Eligibility
  const discountApp = await prisma.discountApplication.findFirst({
    include: { discount: true, customer: true, quotation: true },
  });
  console.log('Discount Application Verification:', {
    discountCode: discountApp?.discount?.code,
    customer: discountApp?.customer?.companyName,
    quotationNumber: discountApp?.quotation?.quotationNumber,
    appliedAmount: discountApp?.appliedAmount,
    status: discountApp?.status,
  });

  await prisma.$disconnect();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
