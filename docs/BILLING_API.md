# Brightloop — Quotations, Subscriptions, Billing, Invoices, Payments, Taxes, Discounts & Reports (Member 4)

This document is the API contract for Member 4's modules. It supersedes the one-line stub in section 6 of `API_CONTRACT.md`
(which lives on `feature/backend-foundation`); Member 1 / Member 2 should link to it from there.

Base URL `http://localhost:5000/api/v1`. Code: `src/routes/{quotation,subscription,billing,invoice,payment,tax,discount,report}.routes.js`.
Tests: `npm run test:billing` (needs the seeded database).

## 0. Conventions
- **Lists** return `data: { <plural>: [...], total }` plus `meta: { page, limit, total, totalPages }`; query `?page=&limit=` (default 20, max 100). Single records return `data: { <singular>: {...} }`.
- **Money is a JSON number** (2 dp), calculated server-side with Decimal arithmetic. The frontend must not calculate totals.
- **Customers** (role `CUSTOMER`) only ever see their own records; another customer's record is a `404`. Customers never see `DRAFT` invoices or quotations.
- **IDs must be UUIDs** (otherwise `400`). Errors use the standard envelope plus these `code`s: `INVALID_SUBSCRIPTION_TRANSITION`, `INVALID_INVOICE_TRANSITION`, `INVALID_QUOTATION_TRANSITION`, `QUOTATION_ALREADY_CONVERTED`, `QUOTATION_NOT_CONVERTIBLE`, `PLAN_MIN_QUANTITY_NOT_MET`, `INVOICE_NOT_PAYABLE`, `PAYMENT_EXCEEDS_BALANCE`, `ALLOCATION_EXCEEDS_PAYMENT`, `PLAN_DOES_NOT_ALLOW_*`.
- ⚠️ **Frontend note:** `frontend/src/api/*` falls back to mock data on any `404`/`501`. A real "not found" from these endpoints (e.g. an unknown invoice id) therefore looks like mock data in the UI. Test with the API directly.

## 1. Quotations — `/quotations`
| Method & path | Roles | Notes |
| :--- | :--- | :--- |
| `GET /` , `GET /:id` | all (customers: own, non-draft) | `?status=&search=&customerId=` |
| `POST /` | Admin, Staff | Body below. Totals/tax computed server-side. Starts `DRAFT`. |
| `POST /:id/send` | Admin, Staff | `DRAFT → SENT` |
| `POST /:id/accept`, `/:id/reject` | Staff, or the owning customer | `SENT → ACCEPTED`; `DRAFT/SENT → REJECTED` |
| `POST /:id/convert` | Admin, Staff | Body `{ activate?: true, startDate?, endDate?, autoRenew? }` → `201 { quotation, subscription }`. One-shot; `409 QUOTATION_ALREADY_CONVERTED` on repeat. Expired/rejected quotes → `409`. |

```json
POST /quotations
{
  "customerId": "uuid",
  "planId": "uuid",
  "validDays": 30,
  "items": [
    { "variantId": "uuid", "quantity": 5, "unitPrice": 99.00, "discountAmount": 0, "taxRate": 8.25 }
  ],
  "notes": "...", "terms": "..."
}
```
**Start from a template:** `{ "customerId": "uuid", "templateId": "uuid" }` takes the plan, lines, validity days, notes and terms from the template (see 1.1); anything you send explicitly overrides it. Send either `items` or a `templateId`.

`planId` is the default plan for every line (or set `items[].planId`); give `validDays` or `validUntil`. `unitPrice` defaults to the variant (or plan) price and `taxRate` to the default tax. `Plan.minQuantity` and availability are enforced (`PLAN_MIN_QUANTITY_NOT_MET`). **To convert, every line needs a `variantId` and all lines the same plan** (otherwise `422`). The current frontend form sends a free-text customer name and item — it must send `customerId`, `planId` and `variantId`.

### 1.1 Quotation templates — `/quotation-templates`
"Start from a template that already has the right plan and product lines and stays valid for a set number of days."

| Method & path | Roles | Notes |
| :--- | :--- | :--- |
| `GET /`, `GET /:id` | Admin, Staff | `?isActive=&planId=&search=`; includes `plan` and `items[].variant` |
| `POST /` | **Admin** | `{ name, code, planId, validityDays?: 30, items:[{variantId, quantity, description?, unitPrice?}], notes?, terms?, isActive? }`. The lines must satisfy `Plan.minQuantity` (`400 PLAN_MIN_QUANTITY_NOT_MET`); `unitPrice` omitted = the variant's current price. |
| `PUT /:id` | **Admin** | Any field; sending `items` replaces all lines |
| `DELETE /:id` | **Admin** | Deactivates; an inactive template cannot start a quotation (`400`) |

## 2. Subscriptions — `/subscriptions`
Lifecycle (brief → schema): Draft/Quotation = quotation `DRAFT`/`SENT`; Confirmed = `PENDING`; Active = `TRIALING`/`ACTIVE`; Paused = `PAUSED`; Closed = `CANCELLED` (early close) or `EXPIRED` (end date reached).

| Method & path | Roles | Transition |
| :--- | :--- | :--- |
| `GET /`, `GET /:id` | all (customers: own) | `?status=&planId=&customerId=&search=` |
| `POST /` | Admin, Staff | `{ customerId, planId, items:[{variantId, quantity, unitPrice?, taxRate?}], startDate?, endDate?, autoRenew?, paymentTermsDays?: 30, notes?, activate?: true }`. A line's `taxRate` omitted = the default tax at billing time, `0` = tax exempt; a quote's rate is carried over on conversion. `activate:false` → `PENDING`. Enforces `Plan.minQuantity`. A customer's first subscription on a plan with `trialDays` starts `TRIALING`. |
| `POST /:id/activate` | Admin, Staff | `PENDING → ACTIVE/TRIALING` (the frontend has no button for this yet; creation and conversion activate by default) |
| `POST /:id/pause` | staff or owner | `ACTIVE/TRIALING → PAUSED` |
| `POST /:id/resume` | staff or owner | `PAUSED → ACTIVE/TRIALING`; billing dates move out by the paused time (paused time is never billed) |
| `POST /:id/cancel` | staff or owner | `PENDING/ACTIVE/TRIALING/PAUSED → CANCELLED`; body `{ reason? }` |
| `POST /:id/renew` | staff or owner | `EXPIRED → ACTIVE` (restarts), or extends a fixed `endDate` by one interval. `409` if there is no end date (already auto-renews). |

Response includes `plan`, `customer`, `items[]` (`description, quantity, unitPrice, taxRate, totalAmount`), `paymentTermsDays` and `totalAmount` (recurring amount per period).

**Per-plan switches** — `PATCH /plans/:id/lifecycle` (**Admin**) with any of `{ allowPause, allowEarlyClose, allowRenew, autoCloseOnEnd }` (all default `true`; mounted beside Member 2's `/plans` routes so their plan CRUD is untouched). A disabled action returns `409 PLAN_DOES_NOT_ALLOW_PAUSE | _CANCEL | _RENEW` for everyone, customers and staff alike. With `autoCloseOnEnd: false` a subscription is **not** expired at its end date and keeps billing until someone closes it.

## 3. Billing — `/billing`
| Method & path | Roles | Notes |
| :--- | :--- | :--- |
| `POST /run` | **Admin** | `{ targetDate?, subscriptionId?, autoConfirm?: false }` → `201 { billingRun, summary, invoices }` |
| `GET /runs`, `GET /runs/:id` | Admin, Staff | Run history: counts, amount billed, `errorLog` |

Rules
- Billing is **in advance**: a subscription is due when `nextBillingDate <= targetDate`; the invoice covers `[nextBillingDate, + one interval)`. `plan.intervalCount` is honoured and month-ends clamp without drifting (Jan 31 → Feb 28 → Mar 31).
- Missed periods are caught up, never skipped.
- **Nothing is billed twice**: per-subscription row lock + existing-period check + the DB unique constraint `(subscriptionId, billingPeriodStart, billingPeriodEnd)`. A retry after a crash just advances the schedule.
- One failing subscription never stops a run (`status: PARTIAL`, details in `BillingRun.errorLog`).
- Only `ACTIVE` — and `TRIALING` once the trial has ended — are billed. Subscriptions past `endDate` become `EXPIRED`.
- Invoices are created `DRAFT` unless `autoConfirm`.
- Billing is triggered by `POST /billing/run`. `startBillingScheduler()` in `src/services/billing.service.js` can run the very same service on a timer, but it is **not wired into `server.js`** (that file is Member 2's); call it from there if the team wants automatic runs.

## 4. Invoices — `/invoices`
| Method & path | Roles | Notes |
| :--- | :--- | :--- |
| `GET /`, `GET /:id` | all (customers: own, non-draft) | `?status=&customerId=&subscriptionId=&search=&from=&to=`. Includes `items` (tax-rate snapshot per line), `allocations`, applied discounts. |
| `POST /:id/confirm` | Admin, Staff | `DRAFT → ISSUED` |
| `POST /:id/cancel` | Admin, Staff | `DRAFT/ISSUED/OVERDUE → CANCELLED` if nothing is paid; gives discount uses back |
| `POST /:id/send` | Admin, Staff | **No email provider is configured**: the request is audit-logged and the response has `emailSent:false`. |

Status flow `DRAFT → ISSUED → PARTIALLY_PAID → PAID`; `OVERDUE` is set automatically once a balance outlives `dueDate` (checked on every read/report). Due date = issue date + the subscription's `paymentTermsDays` (default 30). **An invoice is PAID only when payment allocations cover its total.**

## 5. Payments — `/payments`
| Method & path | Roles |
| :--- | :--- |
| `GET /`, `GET /:id` | all (customers: own) — `?search=&customerId=&invoiceId=&paymentMethod=&from=&to=` |
| `POST /` | Admin, Staff |

```jsonc
// exactly ONE of invoiceId | invoice.invoiceNumber | allocations
{ "invoiceId": "uuid", "amount": 50.00, "paymentMethod": "BANK_TRANSFER",
  "paymentDate": "2026-10-31", "transactionReference": "WIRE-889", "notes": "..." }
{ "invoice": { "invoiceNumber": "INV-2026-0002" }, "amount": 5, "paymentMethod": "Wire Transfer" }   // the frontend form
{ "amount": 30, "paymentMethod": "CASH", "allocations": [ { "invoiceId": "uuid", "amount": 20 } ] }    // split / multiple
```
Partial payments are supported. Overpaying an invoice → `422 PAYMENT_EXCEEDS_BALANCE`; allocating more than the payment → `422 ALLOCATION_EXCEEDS_PAYMENT`; the invoice must be `ISSUED/PARTIALLY_PAID/OVERDUE` (`409 INVOICE_NOT_PAYABLE`); all invoices in one payment must share a customer. Invoice rows are locked while a payment is applied, so simultaneous payments cannot over-allocate. The response `payment` carries `allocations`, `invoiceId`, `invoice.invoiceNumber`, `allocatedAmount`, `unallocatedAmount`.
Online card payment from the customer portal is **not** implemented (no payment provider); only staff record payments.

## 6. Taxes — `/taxes`, Discounts — `/discounts`
- **Taxes** — read: Admin, Staff; `POST` / `PUT /:id`: **Admin only**. `{ name, code, rate (0–100), description?, isCompound?, isDefault?, isActive? }`. Changing a rate never alters existing invoices (each line stores its own `taxRate`). **`isDefault`** marks the tax applied automatically to lines with no explicit rate: at most one (promoting a tax demotes the previous default), and the default cannot be deactivated. If no tax is flagged, the active tax whose code is `DEFAULT_TAX_CODE` (default `TAX-US-STD`) is used.
- **Discounts** — read: Admin, Staff; `POST` / `PUT /:id` / `DELETE /:id` (deactivate): **Admin only**.
  `{ name, code, type: PERCENTAGE|FIXED_AMOUNT, value, minPurchaseAmount?, minQuantity?, maxUses?, maxUsesPerCustomer?, validFrom?, validTo?, productIds?, planIds?, isActive? }`.
  The frontend's names `minOrderAmount`, `maxRedemptions`, `startDate`, `endDate` are accepted as aliases, and responses carry both spellings plus `timesRedeemed`.
  Billing applies the **single best** valid discount automatically (no stacking): active, inside its dates, minimums met, usage left and — if product/plan eligibility is set — only to the matching lines. `maxUses` is enforced atomically in SQL, so concurrent invoices can never exceed it. Cancelling an invoice reverts the use. A discount application always references an invoice **xor** a quotation.

## 7. Reports — `/reports` (Admin, Staff)
- `GET /summary?from=&to=` — subscriptions by status/plan, MRR, revenue received/invoiced, payments, outstanding, overdue, ageing buckets.
- `GET /metrics` — dashboard KPIs and chart series (`mrr`, `mrrGrowth`, `activeSubscriptions`, `totalRevenue`, `overdueAmount`, `overdueCount`, `churnRate`, `revenueTrend[6]`, `planDistribution`).
- `GET /revenue?timeframe=monthly|quarterly|yearly` (or `from` / `to`) — gross/net/tax/discounts/collected, AR overdue, `recentCollections`.

All use SQL aggregates. Measured with 3,000 subscriptions and 3,000 invoices: every list and report endpoint answered in under 110 ms.

## 8. Schema changes and what is still open
**Added** in migration `20261031000002_billing_lifecycle_templates_tax` (additive only: every new column has a default, so existing rows are untouched):
1. `Plan.allowPause`, `allowEarlyClose`, `allowRenew`, `autoCloseOnEnd` (Boolean, default true) — set with `PATCH /plans/:id/lifecycle`.
2. `QuotationTemplate` + `QuotationTemplateItem`, and `Quotation.templateId` — see 1.1.
3. `Subscription.paymentTermsDays` (Int, default 30).
4. `Tax.isDefault` (Boolean, default false) and `SubscriptionItem.taxRate` (Decimal(5,2), nullable: null = default tax, 0 = exempt).

**Still open**
5. `Tax.country` / `isInclusive`: the Taxes page sends them but they are not stored. `isInclusive` changes how prices are calculated (tax-inclusive pricing), so it needs a product decision before it is added.
6. `prisma/migrations/20261031000000_init/migration.sql` starts with a UTF-8 BOM, which PostgreSQL rejects on `prisma migrate deploy` (a fresh database fails; `prisma db push` works). Re-saving it without the BOM changes its checksum, so anyone who already applied it must run `prisma migrate resolve` — Member 3 should decide how to roll that out. The new migration is BOM-free and was verified by applying all three migrations (with the BOM stripped from the first) to an empty database and diffing against `schema.prisma`: no difference.

## 9. Environment variables
`DEFAULT_TAX_CODE` (fallback when no tax is flagged `isDefault`), `DEFAULT_PAYMENT_TERMS_DAYS` (given to new subscriptions that do not specify `paymentTermsDays`) — see `.env.example`. (`BILLING_INTERVAL_MINUTES` and `BILLING_AUTO_CONFIRM` are read only if the scheduler is wired in.)
