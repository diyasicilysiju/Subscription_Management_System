-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "allowEarlyClose" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowPause" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowRenew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoCloseOnEnd" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "taxes" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "templateId" UUID;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "paymentTermsDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "subscription_items" ADD COLUMN     "taxRate" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "quotation_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "planId" UUID NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "terms" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_template_items" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotation_templates_code_key" ON "quotation_templates"("code");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "quotation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_templates" ADD CONSTRAINT "quotation_templates_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_template_items" ADD CONSTRAINT "quotation_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "quotation_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_template_items" ADD CONSTRAINT "quotation_template_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

