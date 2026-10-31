# BRIGHTLOOP SUBSCRIPTION MANAGEMENT SYSTEM — DATABASE DESIGN

## 1. Overview
This document defines the unified, relational database architecture for the Brightloop Subscription Management System, implemented using **PostgreSQL** and **Prisma ORM**.

All members (**Member 2: Backend/Auth/Products/Plans** and **Member 4: Subscriptions/Invoices/Payments**) must strictly adhere to these table names, column names, data types, and enum values.

---

## 2. Shared Database Connection & Client

### Connection String (`.env`)
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/subscription_management?schema=public"
```

### Shared Prisma Singleton Client
All backend services and controllers must import the singleton Prisma instance:
```javascript
import prisma from './config/db.js';
// or from 'src/config/db.js'
```

---

## 3. Enumerations

### `Role`
Used in `users.role` for role-based authorization:
- `ADMIN`: Full system administrative access; can manage staff, users, plans, and system configs.
- `STAFF`: Internal operational staff; can manage customers, products, quotations, and process billing.
- `CUSTOMER`: External customer user; portal access strictly restricted to own customer records.

### `CustomerStatus`
Used in `customers.status`:
- `ACTIVE`
- `INACTIVE`

### `BillingInterval`
Used in `plans.billingInterval` and `subscriptions.billingInterval`:
- `DAILY`
- `WEEKLY`
- `MONTHLY`
- `YEARLY`

### `QuotationStatus`
Used in `quotations.status`:
- `DRAFT`: Initial quote creation.
- `SENT`: Delivered to customer.
- `ACCEPTED`: Customer accepted quote.
- `REJECTED`: Declined quote.
- `CONVERTED`: Converted to a subscription.
- `EXPIRED`: Validity period ended.

### `SubscriptionStatus`
Used in `subscriptions.status`:
- `PENDING`: Quote converted / customer signed up; awaiting initial payment clearance.
- `TRIALING`: In free trial period.
- `ACTIVE`: Active recurring billing subscription.
- `PAUSED`: Temporarily suspended subscription.
- `CANCELLED`: Cancelled by customer or staff.
- `EXPIRED`: End of term reached without renewal.

### `InvoiceStatus`
Used in `invoices.status`:
- `DRAFT`: Generated, not yet finalized.
- `ISSUED`: Finalized and billed to customer.
- `PAID`: Fully paid.
- `PARTIALLY_PAID`: Part of invoice paid.
- `OVERDUE`: Past due date.
- `VOID`: Voided invoice.
- `CANCELLED`: Cancelled invoice.

### `DiscountType`
Used in `discounts.type`:
- `PERCENTAGE`: Percentage deduction (e.g., 15.00%).
- `FIXED_AMOUNT`: Fixed currency deduction (e.g., $20.00).

### `DiscountApplicationStatus`
Used in `discount_applications.status`:
- `APPLIED`: Discount currently applied to quotation or invoice.
- `REVERTED`: Discount was voided, refunded, or removed.

### `BillingRunStatus`
Used in `billing_runs.status`:
- `STARTED`: Batch run has initiated.
- `COMPLETED`: Batch run completed all due invoices.
- `FAILED`: Batch run encountered fatal execution error.
- `PARTIAL`: Some invoices succeeded, some failed.

### `PaymentMethod`
Used in `payments.paymentMethod`:
- `CREDIT_CARD`
- `BANK_TRANSFER`
- `CASH`
- `STRIPE`
- `OTHER`

### `PaymentStatus`
Used in `payments.status`:
- `PENDING`
- `COMPLETED`
- `FAILED`
- `REFUNDED`

---

## 4. Entity Schema & Field Specifications

### 4.1. Users (`users`)
| Column | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `email` | `TEXT` | `@unique` | User login email |
| `password` | `TEXT` | | Bcrypt hash |
| `role` | `Role` | `@default(CUSTOMER)` | User role |
| `firstName` | `TEXT` | | First name |
| `lastName` | `TEXT` | | Last name |
| `phone` | `TEXT?` | Nullable | Phone number |
| `isActive` | `BOOLEAN` | `@default(true)` | Active status |
| `createdAt` | `TIMESTAMP` | `@default(now())` | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | `@updatedAt` | Update timestamp |

---

### 4.2. Customers (`customers`)
| Column | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `userId` | `UUID?` | `@unique`, Nullable | Linked portal user (FK `users.id`) |
| `companyName` | `TEXT?` | Nullable | Company / business name |
| `contactName` | `TEXT` | | Primary contact person |
| `email` | `TEXT` | `@unique` | Primary billing contact email |
| `phone` | `TEXT?` | Nullable | Contact phone number |
| `billingAddress` | `TEXT?` | Nullable | Billing address |
| `shippingAddress` | `TEXT?` | Nullable | Shipping address |
| `taxNumber` | `TEXT?` | Nullable | Tax ID / VAT number |
| `status` | `CustomerStatus` | `@default(ACTIVE)` | Account status |
| `createdAt` | `TIMESTAMP` | `@default(now())` | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | `@updatedAt` | Update timestamp |

---

### 4.3. Products (`products`)
| Column | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `name` | `TEXT` | | Product catalog name |
| `description` | `TEXT?` | Nullable | Product details |
| `sku` | `TEXT?` | `@unique`, Nullable | Master SKU |
| `salesPrice` | `DECIMAL(12, 2)` | `@default(0.00)` | Default base selling price |
| `costPrice` | `DECIMAL(12, 2)` | `@default(0.00)` | Base cost of service (for profit reports) |
| `isActive` | `BOOLEAN` | `@default(true)` | Availability status |
| `createdAt` | `TIMESTAMP` | `@default(now())` | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | `@updatedAt` | Update timestamp |

---

### 4.4. Product Variants (`product_variants`)
| Column | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `productId` | `UUID` | FK `products.id` | Foreign key to Product |
| `name` | `TEXT` | | Variant title (e.g. Standard, Pro) |
| `sku` | `TEXT` | `@unique` | Unique variant SKU |
| `price` | `DECIMAL(12, 2)` | | **Final / effective selling price** for this variant |
| `costPrice` | `DECIMAL(12, 2)?`| Nullable | Variant cost price (margin analysis) |
| `priceAdjustment` | `DECIMAL(12, 2)?`| Nullable | Delta adjustment relative to `Product.salesPrice` |
| `attributes` | `JSONB?` | Nullable | Custom variant attributes (e.g. limits) |
| `isActive` | `BOOLEAN` | `@default(true)` | Availability flag |
| `createdAt` | `TIMESTAMP` | `@default(now())` | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | `@updatedAt` | Update timestamp |

> **Pricing Convention (Member 2 Note):**
> `ProductVariant.price` is the authoritative selling price. `ProductVariant.priceAdjustment` documents the delta against `Product.salesPrice` (`price = Product.salesPrice + priceAdjustment`).

---

### 4.5. Subscription Plans (`plans`)
| Column | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `name` | `TEXT` | | Plan display name |
| `code` | `TEXT` | `@unique` | Unique plan code |
| `description` | `TEXT?` | Nullable | Plan description |
| `billingInterval` | `BillingInterval` | | DAILY, WEEKLY, MONTHLY, YEARLY |
| `intervalCount` | `INTEGER` | `@default(1)` | Multiplier (e.g. 1 month, 3 months) |
| `price` | `DECIMAL(12, 2)` | | Recurring base price |
| `currency` | `TEXT` | `@default("USD")` | ISO currency code |
| `trialDays` | `INTEGER` | `@default(0)` | Free trial days count |
| `minQuantity` | `INTEGER` | `@default(1)` | Minimum seats/units required |
| `availableFrom` | `TIMESTAMP?` | Nullable | Scheduled launch date |
| `availableTo` | `TIMESTAMP?` | Nullable | Scheduled sunset/retirement date |
| `isActive` | `BOOLEAN` | `@default(true)` | Available for new signups |
| `allowPause` | `BOOLEAN` | `@default(true)` | Subscribers of this plan may pause |
| `allowEarlyClose` | `BOOLEAN` | `@default(true)` | Subscribers may cancel before the end date |
| `allowRenew` | `BOOLEAN` | `@default(true)` | Subscribers may renew |
| `autoCloseOnEnd` | `BOOLEAN` | `@default(true)` | Subscriptions expire automatically at their end date |
| `createdAt` | `TIMESTAMP` | `@default(now())` | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | `@updatedAt` | Update timestamp |

---

### 4.6. Taxes (`taxes`)
| Column | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `name` | `TEXT` | | Tax display name |
| `code` | `TEXT` | `@unique` | Unique tax identifier |
| `rate` | `DECIMAL(5, 2)` | | Tax percentage (e.g. 8.25 for 8.25%) |
| `description` | `TEXT?` | Nullable | Tax description |
| `isCompound` | `BOOLEAN` | `@default(false)` | Compound calculation flag |
| `isDefault` | `BOOLEAN` | `@default(false)` | Applied automatically to lines with no explicit rate; at most one (enforced in the service) |
| `isActive` | `BOOLEAN` | `@default(true)` | Active status |
| `createdAt` | `TIMESTAMP` | `@default(now())` | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | `@updatedAt` | Update timestamp |

---

### 4.7. Discounts (`discounts`)
| Column | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `name` | `TEXT` | | Promo / discount name |
| `code` | `TEXT` | `@unique` | Coupon code |
| `type` | `DiscountType` | `@default(PERCENTAGE)` | PERCENTAGE or FIXED_AMOUNT |
| `value` | `DECIMAL(12, 2)` | | Rate percentage or currency amount |
| `minPurchaseAmount` | `DECIMAL(12, 2)?` | Nullable | Minimum invoice/quote subtotal required |
| `minQuantity` | `INTEGER?` | Nullable | Minimum total items required |
| `maxUsesPerCustomer` | `INTEGER?` | Nullable | Max redemptions allowed per customer |
| `validFrom` | `TIMESTAMP?` | Nullable | Activation start time |
| `validTo` | `TIMESTAMP?` | Nullable | Expiration time |
| `maxUses` | `INTEGER?` | Nullable | Maximum total redemptions system-wide |
| `usedCount` | `INTEGER` | `@default(0)` | Redemptions counter |
| `isActive` | `BOOLEAN` | `@default(true)` | Active status |
| `createdAt` | `TIMESTAMP` | `@default(now())` | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | `@updatedAt` | Update timestamp |

---

### 4.8. Discount Eligibility & Applications (M:N Models)

#### `DiscountProduct` (`discount_products`)
Restricts discount eligibility to specific products.
- `id`: `UUID` (`@id`)
- `discountId`: `UUID` (FK `discounts.id`, `onDelete: Cascade`)
- `productId`: `UUID` (FK `products.id`, `onDelete: Cascade`)
- `createdAt`: `TIMESTAMP`
- `@@unique([discountId, productId])`

#### `DiscountPlan` (`discount_plans`)
Restricts discount eligibility to specific subscription plans.
- `id`: `UUID` (`@id`)
- `discountId`: `UUID` (FK `discounts.id`, `onDelete: Cascade`)
- `planId`: `UUID` (FK `plans.id`, `onDelete: Cascade`)
- `createdAt`: `TIMESTAMP`
- `@@unique([discountId, planId])`

#### `DiscountApplication` (`discount_applications`)
Tracks every discount redemption against a customer, invoice, or quotation.
- `id`: `UUID` (`@id`)
- `discountId`: `UUID` (FK `discounts.id`, `onDelete: Restrict`)
- `customerId`: `UUID` (FK `customers.id`, `onDelete: Restrict`)
- `invoiceId`: `UUID?` (FK `invoices.id`, nullable)
- `quotationId`: `UUID?` (FK `quotations.id`, nullable)
- `appliedAmount`: `DECIMAL(12, 2)`
- `status`: `DiscountApplicationStatus` (`@default(APPLIED)`)
- `appliedAt`: `TIMESTAMP` (`@default(now())`)

> **Validation Requirement for Billing Team (Member 4):**
> A `DiscountApplication` must reference either an `invoiceId` OR a `quotationId`, but never both simultaneously, and never neither (strict logical XOR: `(invoiceId != null && quotationId == null) || (invoiceId == null && quotationId != null)`). This business constraint must be validated in the service layer / Zod schema during discount redemption.


---

### 4.9. Quotations & Quotation Items

#### `Quotation` (`quotations`)
- `id`: `UUID` (`@id`)
- `quotationNumber`: `TEXT` (`@unique`, e.g. `QUO-2026-0001`)
- `customerId`: `UUID` (FK `customers.id`)
- `createdById`: `UUID` (FK `users.id`)
- `status`: `QuotationStatus` (`@default(DRAFT)`)
- `issueDate`: `TIMESTAMP`
- `validUntil`: `TIMESTAMP`
- `subtotal`: `DECIMAL(12, 2)`
- `discountAmount`: `DECIMAL(12, 2)`
- `taxAmount`: `DECIMAL(12, 2)`
- `totalAmount`: `DECIMAL(12, 2)`
- `notes`: `TEXT?`
- `terms`: `TEXT?`
- `convertedSubscriptionId`: `UUID?` (`@unique`, FK `subscriptions.id`)
- `templateId`: `UUID?` (FK `quotation_templates.id`, `onDelete: SetNull`) — the template the quotation was started from

#### `QuotationItem` (`quotation_items`)
- `id`: `UUID` (`@id`)
- `quotationId`: `UUID` (FK `quotations.id`, `onDelete: Cascade`)
- `description`: `TEXT`
- `variantId`: `UUID?` (FK `product_variants.id`)
- `planId`: `UUID?` (FK `plans.id`)
- `quantity`: `INTEGER` (`@default(1)`)
- `unitPrice`: `DECIMAL(12, 2)`
- `discountAmount`: `DECIMAL(12, 2)`
- `taxRate`: `DECIMAL(5, 2)`
- `totalAmount`: `DECIMAL(12, 2)`

---

### 4.9a. Quotation Templates

#### `QuotationTemplate` (`quotation_templates`)
A reusable starting point for quotations: the right plan and product lines, valid for a set number of days.
- `id`: `UUID` (`@id`)
- `name`: `TEXT`, `code`: `TEXT` (`@unique`), `description`: `TEXT?`
- `planId`: `UUID` (FK `plans.id`, `onDelete: Restrict`)
- `validityDays`: `INTEGER` (`@default(30)`) — a quotation started from it is valid for this many days
- `notes`: `TEXT?`, `terms`: `TEXT?`, `isActive`: `BOOLEAN` (`@default(true)`)

#### `QuotationTemplateItem` (`quotation_template_items`)
- `id`: `UUID` (`@id`)
- `templateId`: `UUID` (FK `quotation_templates.id`, `onDelete: Cascade`)
- `variantId`: `UUID` (FK `product_variants.id`, `onDelete: Restrict`)
- `description`: `TEXT?`, `quantity`: `INTEGER` (`@default(1)`)
- `unitPrice`: `DECIMAL(12, 2)?` (nullable: `null` = the variant's current price)

---

### 4.10. Subscriptions & Subscription Items

#### `Subscription` (`subscriptions`)
| Column | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `subscriptionNumber` | `TEXT` | `@unique` | e.g. `SUB-2026-0001` |
| `customerId` | `UUID` | FK `customers.id` | Subscriber |
| `planId` | `UUID` | FK `plans.id` | Plan |
| `status` | `SubscriptionStatus`| `@default(ACTIVE)` | PENDING, TRIALING, ACTIVE, PAUSED, CANCELLED, EXPIRED |
| `billingInterval` | `BillingInterval` | | DAILY, WEEKLY, MONTHLY, YEARLY |
| `startDate` | `TIMESTAMP` | `@default(now())` | Subscription commencement date |
| `currentPeriodStart` | `TIMESTAMP` | | Current period start |
| `currentPeriodEnd` | `TIMESTAMP` | | Current period end |
| `trialEndsAt` | `TIMESTAMP?` | Nullable | End of free trial |
| `nextBillingDate` | `TIMESTAMP` | | Next scheduled billing date |
| `endDate` | `TIMESTAMP?` | Nullable | Scheduled contract termination / end date |
| `autoRenew` | `BOOLEAN` | `@default(true)` | Auto-renewal flag |
| `pausedAt` | `TIMESTAMP?` | Nullable | Timestamp of pause |
| `resumedAt` | `TIMESTAMP?` | Nullable | Timestamp of resumption |
| `cancelledAt` | `TIMESTAMP?` | Nullable | Timestamp of cancellation |
| `cancellationReason`| `TEXT?` | Nullable | Cancellation reason |
| `paymentTermsDays` | `INTEGER` | `@default(30)` | Days from invoice issue date to due date |
| `notes` | `TEXT?` | Nullable | Notes |

#### `SubscriptionItem` (`subscription_items`)
- `id`: `UUID` (`@id`)
- `subscriptionId`: `UUID` (FK `subscriptions.id`, `onDelete: Cascade`)
- `variantId`: `UUID` (FK `product_variants.id`)
- `quantity`: `INTEGER`
- `unitPrice`: `DECIMAL(12, 2)`
- `taxRate`: `DECIMAL(5, 2)?` (nullable: `null` = use the default tax when billing, `0` = tax exempt)

---

### 4.11. Billing Runs (`billing_runs`)
Represents an automated recurring billing engine batch execution.
| Column | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid())` | Primary key |
| `runDate` | `TIMESTAMP` | `@default(now())` | Batch execution timestamp |
| `targetBillingDate` | `TIMESTAMP` | | Cutoff date for due subscriptions |
| `status` | `BillingRunStatus`| `@default(STARTED)` | STARTED, COMPLETED, FAILED, PARTIAL |
| `subscriptionsEvaluated` | `INTEGER` | `@default(0)` | Subscriptions checked |
| `invoicesGenerated` | `INTEGER` | `@default(0)` | Invoices successfully created |
| `totalAmountBilled` | `DECIMAL(12, 2)` | `@default(0.00)` | Total sum billed |
| `executionTimeMs` | `INTEGER?` | Nullable | Total execution duration in ms |
| `errorLog` | `JSONB?` | Nullable | Failure diagnostics / unbilled items |
| `createdAt` | `TIMESTAMP` | `@default(now())` | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | `@updatedAt` | Update timestamp |

---

### 4.12. Invoices & Invoice Items

#### `Invoice` (`invoices`)
- `id`: `UUID` (`@id`)
- `invoiceNumber`: `TEXT` (`@unique`, e.g. `INV-2026-0001`)
- `customerId`: `UUID` (FK `customers.id`)
- `subscriptionId`: `UUID?` (FK `subscriptions.id`, nullable)
- `quotationId`: `UUID?` (FK `quotations.id`, nullable)
- `billingRunId`: `UUID?` (FK `billing_runs.id`, nullable)
- `status`: `InvoiceStatus` (`@default(ISSUED)`)
- `issueDate`: `TIMESTAMP`
- `dueDate`: `TIMESTAMP`
- `billingPeriodStart`: `TIMESTAMP?`
- `billingPeriodEnd`: `TIMESTAMP?`
- `subtotal`: `DECIMAL(12, 2)`
- `discountAmount`: `DECIMAL(12, 2)`
- `taxAmount`: `DECIMAL(12, 2)`
- `totalAmount`: `DECIMAL(12, 2)`
- `amountPaid`: `DECIMAL(12, 2)`
- `amountDue`: `DECIMAL(12, 2)`
- `paidAt`: `TIMESTAMP?`
- `notes`: `TEXT?`

> **Duplicate Prevention Index:**
> ```prisma
> @@unique([subscriptionId, billingPeriodStart, billingPeriodEnd], name: "unique_recurring_subscription_period")
> ```

#### `InvoiceItem` (`invoice_items`)
- `id`: `UUID` (`@id`)
- `invoiceId`: `UUID` (FK `invoices.id`, `onDelete: Cascade`)
- `description`: `TEXT`
- `variantId`: `UUID?` (FK `product_variants.id`)
- `quantity`: `INTEGER`
- `unitPrice`: `DECIMAL(12, 2)`
- `discountAmount`: `DECIMAL(12, 2)`
- `taxRate`: `DECIMAL(5, 2)` (`@default(0.00)`) -> **Immutable frozen tax-rate snapshot**
- `taxAmount`: `DECIMAL(12, 2)`
- `totalAmount`: `DECIMAL(12, 2)`

---

### 4.13. Payments & Allocations

#### `Payment` (`payments`)
- `id`: `UUID` (`@id`)
- `paymentNumber`: `TEXT` (`@unique`)
- `customerId`: `UUID` (FK `customers.id`)
- `amount`: `DECIMAL(12, 2)`
- `paymentMethod`: `PaymentMethod`
- `status`: `PaymentStatus`
- `transactionReference`: `TEXT?`
- `paymentDate`: `TIMESTAMP`
- `notes`: `TEXT?`

#### `PaymentAllocation` (`payment_allocations`)
- `id`: `UUID` (`@id`)
- `paymentId`: `UUID` (FK `payments.id`, `onDelete: Cascade`)
- `invoiceId`: `UUID` (FK `invoices.id`)
- `amount`: `DECIMAL(12, 2)`
- `allocatedAt`: `TIMESTAMP`

---

### 4.14. Audit Log (`audit_logs`)
- `id`: `UUID` (`@id`)
- `userId`: `UUID?` (FK `users.id`)
- `action`: `TEXT`
- `entity`: `TEXT`
- `entityId`: `TEXT?`
- `details`: `JSONB?`
- `ipAddress`: `TEXT?`
- `createdAt`: `TIMESTAMP`

---

## 5. Seed Test Credentials

All passwords are encrypted with bcrypt (`Password123!`):

| Role | Email | Password | Associated Customer Record |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@brightloop.io` | `Password123!` | System administrator |
| **Staff** | `staff@brightloop.io` | `Password123!` | Operational staff |
| **Customer 1** | `john.doe@acme.com` | `Password123!` | Acme Corporation (`SUB-2026-0001`, `INV-2026-0001`, `INV-2026-0002`) |
| **Customer 2** | `jane.smith@globex.com` | `Password123!` | Globex Logistics (`SUB-2026-0002`, `SUB-2026-0004`, `QUO-2026-0002`) |
