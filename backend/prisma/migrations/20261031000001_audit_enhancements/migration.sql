-- CreateEnum
CREATE TYPE "DiscountApplicationStatus" AS ENUM ('APPLIED', 'REVERTED');

-- CreateEnum
CREATE TYPE "BillingRunStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'PARTIAL');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "discounts" ADD COLUMN     "maxUsesPerCustomer" INTEGER,
ADD COLUMN     "minPurchaseAmount" DECIMAL(12,2),
ADD COLUMN     "minQuantity" INTEGER;

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "billingRunId" UUID;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "availableTo" TIMESTAMP(3),
ADD COLUMN     "minQuantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "costPrice" DECIMAL(12,2),
ADD COLUMN     "priceAdjustment" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "salesPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "resumedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "discount_products" (
    "id" UUID NOT NULL,
    "discountId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_plans" (
    "id" UUID NOT NULL,
    "discountId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_applications" (
    "id" UUID NOT NULL,
    "discountId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "invoiceId" UUID,
    "quotationId" UUID,
    "appliedAmount" DECIMAL(12,2) NOT NULL,
    "status" "DiscountApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_runs" (
    "id" UUID NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetBillingDate" TIMESTAMP(3) NOT NULL,
    "status" "BillingRunStatus" NOT NULL DEFAULT 'STARTED',
    "subscriptionsEvaluated" INTEGER NOT NULL DEFAULT 0,
    "invoicesGenerated" INTEGER NOT NULL DEFAULT 0,
    "totalAmountBilled" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "executionTimeMs" INTEGER,
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_products_discountId_productId_key" ON "discount_products"("discountId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "discount_plans_discountId_planId_key" ON "discount_plans"("discountId", "planId");

-- AddForeignKey
ALTER TABLE "discount_products" ADD CONSTRAINT "discount_products_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_products" ADD CONSTRAINT "discount_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_plans" ADD CONSTRAINT "discount_plans_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_plans" ADD CONSTRAINT "discount_plans_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_applications" ADD CONSTRAINT "discount_applications_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_applications" ADD CONSTRAINT "discount_applications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_applications" ADD CONSTRAINT "discount_applications_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_applications" ADD CONSTRAINT "discount_applications_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billingRunId_fkey" FOREIGN KEY ("billingRunId") REFERENCES "billing_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

