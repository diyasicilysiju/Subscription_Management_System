import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { addInterval } from '../src/utils/dates.js';
import { computeLine } from '../src/services/pricing.service.js';
import { evaluateDiscount } from '../src/services/discount.service.js';
import { apiLimiter } from '../src/middlewares/rateLimiter.js';
import { D } from '../src/utils/money.js';

/**
 * Member 4 integration tests: quotations, subscription lifecycle, recurring billing,
 * discounts, invoices, payments and reports - against the real database
 * (needs `npm run seed` data and DATABASE_URL). Creates its own TESTBILL fixtures
 * and removes them afterwards.
 */

console.log('🧪 Starting Brightloop Billing, Subscription & Finance Tests...\n');

const RUN = Date.now().toString(36).toUpperCase();
const PLAN_CODE = `TESTBILL-${RUN}`;
const PLAN2_CODE = `TESTBILL2-${RUN}`;
const DISCOUNT_CODE = `TESTDISC-${RUN}`;
const LIMITED_CODE = `TESTLIM-${RUN}`;
const TAX_CODE = `TESTTAX-${RUN}`;

let server;
let baseUrl;
const tokens = {};
const ctx = {};

const startServer = () =>
  new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
      resolve();
    });
  });

// The app's API limiter allows 200 calls / 15 min per IP; this suite makes more, so clear
// the test client's counter periodically (no change to the app's own middleware).
let apiCalls = 0;
const resetRateLimit = () => ['127.0.0.1', '::ffff:127.0.0.1', '::1'].forEach((key) => apiLimiter.resetKey(key));

const api = async (method, path, token, body) => {
  if (apiCalls++ % 50 === 0) resetRateLimit();
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json, data: json.data };
};

const login = async (email) => {
  const res = await api('POST', '/auth/login', null, { email, password: 'Password123!' });
  assert.equal(res.status, 200, `login failed for ${email}`);
  return res.data.token;
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

async function cleanup() {
  const plans = await prisma.plan.findMany({ where: { code: { startsWith: 'TESTBILL' } }, select: { id: true } });
  const planIds = plans.map((p) => p.id);
  const subs = await prisma.subscription.findMany({ where: { planId: { in: planIds } }, select: { id: true } });
  const subIds = subs.map((s) => s.id);
  const invoices = await prisma.invoice.findMany({ where: { subscriptionId: { in: subIds } }, select: { id: true } });
  const invoiceIds = invoices.map((i) => i.id);
  const allocs = await prisma.paymentAllocation.findMany({ where: { invoiceId: { in: invoiceIds } }, select: { paymentId: true } });
  const discounts = await prisma.discount.findMany({ where: { code: { startsWith: 'TESTDISC' } }, select: { id: true } });
  const limited = await prisma.discount.findMany({ where: { code: { startsWith: 'TESTLIM' } }, select: { id: true } });
  const discountIds = [...discounts, ...limited].map((d) => d.id);

  // Give back any usage the tests consumed on pre-existing (seeded) discounts.
  const consumed = await prisma.discountApplication.groupBy({
    by: ['discountId'], where: { invoiceId: { in: invoiceIds }, status: 'APPLIED', discountId: { notIn: discountIds } }, _count: { _all: true },
  });
  for (const row of consumed) {
    await prisma.$executeRaw`UPDATE discounts SET "usedCount" = GREATEST("usedCount" - ${row._count._all}, 0) WHERE id = ${row.discountId}::uuid`;
  }
  await prisma.discountApplication.deleteMany({ where: { OR: [{ invoiceId: { in: invoiceIds } }, { discountId: { in: discountIds } }] } });
  await prisma.payment.deleteMany({ where: { id: { in: allocs.map((a) => a.paymentId) } } }); // allocations cascade
  await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  const quotes = await prisma.quotationItem.findMany({ where: { planId: { in: planIds } }, select: { quotationId: true } });
  await prisma.quotation.deleteMany({ where: { id: { in: quotes.map((q) => q.quotationId) } } });
  await prisma.subscription.deleteMany({ where: { id: { in: subIds } } });
  await prisma.quotationTemplate.deleteMany({ where: { code: { startsWith: 'TESTBILL' } } }); // items cascade; quotations keep a null templateId
  await prisma.discount.deleteMany({ where: { id: { in: discountIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  await prisma.tax.deleteMany({ where: { code: { startsWith: 'TESTTAX' } } });
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed += 1;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     Error:', err.message);
      failed += 1;
    }
  };

  // ---- fixtures ---------------------------------------------------------
  tokens.admin = await login('admin@brightloop.io');
  tokens.staff = await login('staff@brightloop.io');
  tokens.acme = await login('john.doe@acme.com');
  tokens.globex = await login('jane.smith@globex.com');
  const acmeUser = await prisma.user.findUnique({ where: { email: 'john.doe@acme.com' }, include: { customer: true } });
  const globexUser = await prisma.user.findUnique({ where: { email: 'jane.smith@globex.com' }, include: { customer: true } });
  ctx.acme = acmeUser.customer;
  ctx.globex = globexUser.customer;
  ctx.variant = await prisma.productVariant.findFirst({ where: { isActive: true }, include: { product: true } });
  assert.ok(ctx.acme && ctx.globex && ctx.variant, 'seed data is required: run `npm run seed`');

  const mkPlan = async (code, extra = {}) => {
    const res = await api('POST', '/plans', tokens.admin, {
      name: `Test Plan ${code}`, code, billingInterval: 'MONTHLY', price: 33.33, minQuantity: 3, trialDays: 0, ...extra,
    });
    assert.equal(res.status, 201, `plan create failed: ${JSON.stringify(res.body)}`);
    return res.data.plan ?? res.data;
  };
  ctx.plan = await mkPlan(PLAN_CODE);
  ctx.plan2 = await mkPlan(PLAN2_CODE);

  // ---- access control ---------------------------------------------------
  console.log('Access control');
  await test('Unauthenticated requests are rejected (401)', async () => {
    for (const p of ['/invoices', '/payments', '/subscriptions', '/quotations', '/reports/summary', '/taxes', '/discounts']) {
      assert.equal((await api('GET', p)).status, 401, p);
    }
  });
  await test('Only Admin can create taxes, discounts and run billing', async () => {
    assert.equal((await api('POST', '/taxes', tokens.staff, { name: 'x', code: 'xx', rate: 5 })).status, 403);
    assert.equal((await api('POST', '/discounts', tokens.staff, { name: 'x', code: 'xx', type: 'FIXED_AMOUNT', value: 5 })).status, 403);
    assert.equal((await api('POST', '/billing/run', tokens.staff, {})).status, 403);
    assert.equal((await api('POST', '/billing/run', tokens.acme, {})).status, 403);
  });
  await test('Customers cannot reach staff-only finance endpoints', async () => {
    assert.equal((await api('GET', '/reports/summary', tokens.acme)).status, 403);
    assert.equal((await api('GET', '/taxes', tokens.acme)).status, 403);
    assert.equal((await api('POST', '/payments', tokens.acme, { amount: 1, paymentMethod: 'CASH', invoiceId: ctx.plan.id })).status, 403);
  });
  await test('Malformed ids are rejected with 400 instead of crashing', async () => {
    assert.equal((await api('GET', '/invoices/not-a-uuid', tokens.admin)).status, 400);
  });

  // ---- taxes ------------------------------------------------------------
  console.log('\nTaxes');
  await test('Admin creates a tax; duplicates and bad rates are rejected', async () => {
    const res = await api('POST', '/taxes', tokens.admin, { name: 'Test Tax', code: TAX_CODE.toLowerCase(), rate: 5.5 });
    assert.equal(res.status, 201);
    assert.equal(res.data.tax.code, TAX_CODE);
    assert.equal(res.data.tax.rate, 5.5);
    assert.equal((await api('POST', '/taxes', tokens.admin, { name: 'Dup', code: TAX_CODE, rate: 1 })).status, 409);
    assert.equal((await api('POST', '/taxes', tokens.admin, { name: 'Bad', code: 'BADRATE', rate: 150 })).status, 400);
    const list = await api('GET', '/taxes', tokens.staff);
    assert.equal(list.status, 200);
    assert.ok(list.data.taxes.length >= 3);
  });

  // ---- discounts --------------------------------------------------------
  console.log('\nDiscounts');
  await test('Admin creates discounts (frontend aliases accepted and echoed)', async () => {
    const res = await api('POST', '/discounts', tokens.admin, {
      // $50 off beats every seeded discount, so it is the one the engine picks
      name: 'Test fifty off', code: DISCOUNT_CODE, type: 'FIXED_AMOUNT', value: 50,
      minOrderAmount: 50, maxRedemptions: 2, startDate: '2020-01-01', endDate: '2099-12-31', planIds: [ctx.plan.id],
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const d = res.data.discount;
    assert.equal(d.minPurchaseAmount, 50);
    assert.equal(d.maxUses, 2);
    assert.equal(d.minOrderAmount, 50);
    assert.equal(d.maxRedemptions, 2);
    assert.deepEqual(d.planIds, [ctx.plan.id]);
    ctx.discount = d;

    const lim = await api('POST', '/discounts', tokens.admin, {
      name: 'Test limited', code: LIMITED_CODE, type: 'FIXED_AMOUNT', value: 60, maxUses: 1, planIds: [ctx.plan2.id],
    });
    assert.equal(lim.status, 201, JSON.stringify(lim.body));
    ctx.limited = lim.data.discount;
  });
  await test('Discount validation: >100%, end before start, duplicate code', async () => {
    assert.equal((await api('POST', '/discounts', tokens.admin, { name: 'Too big', code: 'TESTDISC-BAD1', type: 'PERCENTAGE', value: 150 })).status, 400);
    assert.equal((await api('POST', '/discounts', tokens.admin, { name: 'Bad dates', code: 'TESTDISC-BAD2', type: 'FIXED_AMOUNT', value: 5, validFrom: '2026-02-01', validTo: '2026-01-01' })).status, 400);
    assert.equal((await api('POST', '/discounts', tokens.admin, { name: 'Duplicate', code: DISCOUNT_CODE, type: 'FIXED_AMOUNT', value: 5 })).status, 409);
    assert.equal(await prisma.discount.count({ where: { code: { in: ['TESTDISC-BAD1', 'TESTDISC-BAD2'] } } }), 0, 'rejected discounts must not be stored');
  });

  await test('Discount rules: percentage, product eligibility, minimums, pro-rata split', async () => {
    const lines = [
      { key: 'a', net: D(100), quantity: 2, productId: 'p1', planId: 'plan1' },
      { key: 'b', net: D(50), quantity: 1, productId: 'p2', planId: 'plan1' },
    ];
    const base = { type: 'PERCENTAGE', value: 10, eligibleProducts: [], eligiblePlans: [] };
    const all = evaluateDiscount(base, lines);
    assert.equal(all.amount.toString(), '15');
    assert.equal(all.perLine.get('a').toString(), '10');
    assert.equal(all.perLine.get('b').toString(), '5');
    const onlyP1 = evaluateDiscount({ ...base, eligibleProducts: [{ productId: 'p1' }] }, lines);
    assert.equal(onlyP1.amount.toString(), '10');
    assert.equal(onlyP1.perLine.has('b'), false);
    assert.equal(evaluateDiscount({ ...base, eligiblePlans: [{ planId: 'other' }] }, lines), null);
    assert.equal(evaluateDiscount({ ...base, minPurchaseAmount: D(200) }, lines), null);
    assert.equal(evaluateDiscount({ ...base, minQuantity: 4 }, lines), null);
    const fixedCapped = evaluateDiscount({ type: 'FIXED_AMOUNT', value: 500, eligibleProducts: [], eligiblePlans: [] }, lines);
    assert.equal(fixedCapped.amount.toString(), '150', 'a fixed discount never exceeds what it applies to');
    const third = evaluateDiscount({ type: 'FIXED_AMOUNT', value: 10, eligibleProducts: [], eligiblePlans: [] }, [
      { key: 1, net: D(10), quantity: 1 }, { key: 2, net: D(10), quantity: 1 }, { key: 3, net: D(10), quantity: 1 },
    ]);
    assert.equal([...third.perLine.values()].reduce((s, v) => s.plus(v), D(0)).toString(), '10', 'rounded shares add up exactly');
  });

  // ---- quotations -------------------------------------------------------
  console.log('\nQuotations');
  const quoteBody = (qty = 3, extra = {}) => ({
    customerId: ctx.acme.id, planId: ctx.plan.id, validDays: 14,
    items: [{ variantId: ctx.variant.id, quantity: qty, unitPrice: 33.33 }], ...extra,
  });
  await test('Quotation totals use exact decimal arithmetic and the default tax', async () => {
    const res = await api('POST', '/quotations', tokens.staff, quoteBody(3));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const q = res.data.quotation;
    assert.match(q.quotationNumber, /^QUO-\d{4}-\d{4}$/);
    assert.equal(q.status, 'DRAFT');
    const expected = computeLine({ unitPrice: 33.33, quantity: 3, taxRate: 8.25 });
    assert.equal(q.subtotal, 99.99);
    assert.equal(q.taxAmount, expected.taxAmount.toNumber());
    assert.equal(q.totalAmount, expected.totalAmount.toNumber());
    assert.equal(q.items[0].taxRate, 8.25);
    ctx.quote = q;
  });
  await test('Plan.minQuantity is enforced on quotations (PLAN_MIN_QUANTITY_NOT_MET)', async () => {
    const res = await api('POST', '/quotations', tokens.staff, quoteBody(1));
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'PLAN_MIN_QUANTITY_NOT_MET');
  });
  await test('Customers cannot create quotations and cannot see DRAFT quotations', async () => {
    assert.equal((await api('POST', '/quotations', tokens.acme, quoteBody(3))).status, 403);
    assert.equal((await api('GET', `/quotations/${ctx.quote.id}`, tokens.acme)).status, 404);
    const list = await api('GET', '/quotations', tokens.acme);
    assert.equal(list.status, 200);
    assert.ok(list.data.quotations.every((q) => q.status !== 'DRAFT' && q.customerId === ctx.acme.id));
  });
  await test('Quotation conversion: creates ONE subscription, blocks duplicates', async () => {
    assert.equal((await api('POST', `/quotations/${ctx.quote.id}/send`, tokens.staff)).status, 200);
    const seen = await api('GET', `/quotations/${ctx.quote.id}`, tokens.acme);
    assert.equal(seen.status, 200); // visible to its customer once sent
    const res = await api('POST', `/quotations/${ctx.quote.id}/convert`, tokens.staff, {});
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.data.quotation.status, 'CONVERTED');
    assert.equal(res.data.subscription.status, 'ACTIVE');
    assert.equal(res.data.subscription.planId, ctx.plan.id);
    assert.equal(res.data.subscription.items.length, 1);
    assert.equal(res.data.subscription.items[0].quantity, 3);
    ctx.convertedSub = res.data.subscription;
    const again = await api('POST', `/quotations/${ctx.quote.id}/convert`, tokens.staff, {});
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'QUOTATION_ALREADY_CONVERTED');
  });
  await test('Simultaneous conversions of one quotation create exactly one subscription', async () => {
    const q = (await api('POST', '/quotations', tokens.staff, quoteBody(3))).data.quotation;
    const results = await Promise.all([1, 2, 3].map(() => api('POST', `/quotations/${q.id}/convert`, tokens.staff, {})));
    assert.equal(results.filter((r) => r.status === 201).length, 1, results.map((r) => r.status).join(','));
    assert.equal(await prisma.subscription.count({ where: { notes: { contains: q.quotationNumber } } }), 1);
  });
  await test('Expired and rejected quotations cannot be converted', async () => {
    const q = (await api('POST', '/quotations', tokens.staff, quoteBody(3))).data.quotation;
    await prisma.quotation.update({ where: { id: q.id }, data: { validUntil: daysAgo(1) } });
    const res = await api('POST', `/quotations/${q.id}/convert`, tokens.staff, {});
    assert.equal(res.status, 409);
    const q2 = (await api('POST', '/quotations', tokens.staff, quoteBody(3))).data.quotation;
    await api('POST', `/quotations/${q2.id}/reject`, tokens.staff);
    assert.equal((await api('POST', `/quotations/${q2.id}/convert`, tokens.staff, {})).status, 409);
  });
  await test('Lines without a variant cannot be converted', async () => {
    const res = await api('POST', '/quotations', tokens.staff, {
      customerId: ctx.acme.id, planId: ctx.plan.id, items: [{ description: 'Free text', quantity: 3, unitPrice: 10 }],
    });
    assert.equal(res.status, 201);
    const conv = await api('POST', `/quotations/${res.data.quotation.id}/convert`, tokens.staff, {});
    assert.equal(conv.status, 422);
  });

  // ---- subscription lifecycle -------------------------------------------
  console.log('\nSubscription lifecycle');
  const subBody = (extra = {}) => ({
    customerId: ctx.acme.id, planId: ctx.plan.id, items: [{ variantId: ctx.variant.id, quantity: 3, unitPrice: 33.33 }], ...extra,
  });
  await test('Direct creation enforces Plan.minQuantity; activate:false gives PENDING then activate', async () => {
    const low = await api('POST', '/subscriptions', tokens.staff, subBody({ items: [{ variantId: ctx.variant.id, quantity: 2 }] }));
    assert.equal(low.status, 400);
    assert.equal(low.body.code, 'PLAN_MIN_QUANTITY_NOT_MET');
    const pending = await api('POST', '/subscriptions', tokens.staff, subBody({ activate: false }));
    assert.equal(pending.status, 201, JSON.stringify(pending.body));
    assert.equal(pending.data.subscription.status, 'PENDING');
    assert.match(pending.data.subscription.subscriptionNumber, /^SUB-\d{4}-\d{4}$/);
    const act = await api('POST', `/subscriptions/${pending.data.subscription.id}/activate`, tokens.staff);
    assert.equal(act.status, 200);
    assert.equal(act.data.subscription.status, 'ACTIVE');
    assert.equal((await api('POST', `/subscriptions/${pending.data.subscription.id}/activate`, tokens.staff)).status, 409);
  });
  await test('Pause / resume / invalid transitions', async () => {
    const id = ctx.convertedSub.id;
    const paused = await api('POST', `/subscriptions/${id}/pause`, tokens.staff);
    assert.equal(paused.status, 200);
    assert.equal(paused.data.subscription.status, 'PAUSED');
    assert.ok(paused.data.subscription.pausedAt);
    assert.equal((await api('POST', `/subscriptions/${id}/pause`, tokens.staff)).status, 409);
    await new Promise((r) => setTimeout(r, 1200));
    const before = new Date(paused.data.subscription.nextBillingDate).getTime();
    const resumed = await api('POST', `/subscriptions/${id}/resume`, tokens.staff);
    assert.equal(resumed.status, 200);
    assert.equal(resumed.data.subscription.status, 'ACTIVE');
    assert.ok(new Date(resumed.data.subscription.nextBillingDate).getTime() > before, 'paused time is pushed out of the billing schedule');
    assert.equal((await api('POST', `/subscriptions/${id}/resume`, tokens.staff)).status, 409);
  });
  await test('Customers act only on their own subscriptions', async () => {
    const id = ctx.convertedSub.id; // belongs to Acme
    assert.equal((await api('GET', `/subscriptions/${id}`, tokens.globex)).status, 404);
    assert.equal((await api('POST', `/subscriptions/${id}/pause`, tokens.globex)).status, 404);
    const own = await api('POST', `/subscriptions/${id}/pause`, tokens.acme);
    assert.equal(own.status, 200);
    assert.equal((await api('POST', `/subscriptions/${id}/resume`, tokens.acme)).status, 200);
    const list = await api('GET', '/subscriptions', tokens.acme);
    assert.ok(list.data.subscriptions.length > 0 && list.data.subscriptions.every((s) => s.customerId === ctx.acme.id));
    const spoof = await api('GET', `/subscriptions?customerId=${ctx.globex.id}`, tokens.acme);
    assert.ok(spoof.data.subscriptions.every((s) => s.customerId === ctx.acme.id), 'a customer-supplied customerId must not widen access');
  });
  await test('Cancel closes the subscription for good; renew is refused', async () => {
    const sub = (await api('POST', '/subscriptions', tokens.staff, subBody())).data.subscription;
    const cancelled = await api('POST', `/subscriptions/${sub.id}/cancel`, tokens.staff, { reason: 'Customer request' });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.data.subscription.status, 'CANCELLED');
    assert.equal(cancelled.data.subscription.cancellationReason, 'Customer request');
    assert.equal((await api('POST', `/subscriptions/${sub.id}/renew`, tokens.staff)).status, 409);
    assert.equal((await api('POST', `/subscriptions/${sub.id}/resume`, tokens.staff)).status, 409);
  });
  await test('Subscriptions past their end date expire and can be renewed', async () => {
    const sub = (await api('POST', '/subscriptions', tokens.staff, subBody({ startDate: daysAgo(10).toISOString(), endDate: new Date(Date.now() + 30 * 86400000).toISOString() }))).data.subscription;
    await prisma.subscription.update({ where: { id: sub.id }, data: { endDate: daysAgo(1) } });
    const run = await api('POST', '/billing/run', tokens.admin, { subscriptionId: sub.id });
    assert.equal(run.status, 201);
    assert.equal((await prisma.subscription.findUnique({ where: { id: sub.id } })).status, 'EXPIRED');
    const renewed = await api('POST', `/subscriptions/${sub.id}/renew`, tokens.staff);
    assert.equal(renewed.status, 200, JSON.stringify(renewed.body));
    assert.equal(renewed.data.subscription.status, 'ACTIVE');
  });

  // ---- recurring billing ------------------------------------------------
  console.log('\nRecurring billing');
  const startDate = daysAgo(70);
  ctx.billSub = (await api('POST', '/subscriptions', tokens.staff, subBody({ startDate: startDate.toISOString() }))).data.subscription;
  const periods = [];
  for (let s = startDate, i = 0; s <= new Date() && i < 10; i += 1) {
    const e = addInterval(s, 'MONTHLY', 1, startDate.getUTCDate());
    periods.push([s, e]);
    s = e;
  }
  await test('Billing run generates one invoice per due period, with discounts, taxes and snapshots', async () => {
    const res = await api('POST', '/billing/run', tokens.admin, { subscriptionId: ctx.billSub.id });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.data.summary.status, 'COMPLETED');
    assert.equal(res.data.summary.invoicesGenerated, periods.length);
    const invoices = await prisma.invoice.findMany({ where: { subscriptionId: ctx.billSub.id }, include: { items: true }, orderBy: { billingPeriodStart: 'asc' } });
    assert.equal(invoices.length, periods.length);
    invoices.forEach((inv, i) => {
      assert.equal(inv.status, 'DRAFT');
      assert.equal(inv.billingPeriodStart.getTime(), periods[i][0].getTime());
      assert.equal(inv.billingPeriodEnd.getTime(), periods[i][1].getTime());
      assert.match(inv.invoiceNumber, /^INV-\d{4}-\d{4}$/);
      assert.equal(inv.items[0].taxRate.toNumber(), 8.25, 'tax rate is snapshotted on the line');
      assert.equal(inv.amountDue.toString(), inv.totalAmount.toString());
      const line = computeLine({ unitPrice: 33.33, quantity: 3, discountAmount: inv.discountAmount, taxRate: 8.25 });
      assert.equal(inv.totalAmount.toString(), line.totalAmount.toString());
    });
    // $50 discount with maxUses 2: the first two invoices get it; the third can no longer use it
    // (a smaller seeded discount may still apply, but never the exhausted one).
    assert.equal(invoices[0].discountAmount.toNumber(), 50);
    assert.equal(invoices[1].discountAmount.toNumber(), 50);
    assert.notEqual(invoices[2].discountAmount.toNumber(), 50);
    const d = await prisma.discount.findUnique({ where: { id: ctx.discount.id } });
    assert.equal(d.usedCount, 2);
    assert.equal(await prisma.discountApplication.count({ where: { discountId: ctx.discount.id, status: 'APPLIED' } }), 2);
    const sub = await prisma.subscription.findUnique({ where: { id: ctx.billSub.id } });
    assert.equal(sub.nextBillingDate.getTime(), periods[periods.length - 1][1].getTime());
    ctx.invoices = invoices;
    const run = await prisma.billingRun.findUnique({ where: { id: res.data.billingRun.id } });
    assert.equal(run.invoicesGenerated, periods.length);
    assert.equal(run.status, 'COMPLETED');
  });
  await test('Re-running billing never bills a period twice', async () => {
    const res = await api('POST', '/billing/run', tokens.admin, { subscriptionId: ctx.billSub.id });
    assert.equal(res.data.summary.invoicesGenerated, 0);
    assert.equal(await prisma.invoice.count({ where: { subscriptionId: ctx.billSub.id } }), periods.length);
  });
  await test('A retry after a crash (invoice exists, schedule not advanced) skips instead of duplicating', async () => {
    const lastStart = periods[periods.length - 1][0];
    await prisma.subscription.update({ where: { id: ctx.billSub.id }, data: { nextBillingDate: lastStart } });
    const res = await api('POST', '/billing/run', tokens.admin, { subscriptionId: ctx.billSub.id });
    assert.equal(res.data.summary.invoicesGenerated, 0);
    assert.equal(res.data.summary.periodsAlreadyBilled, 1);
    assert.equal(await prisma.invoice.count({ where: { subscriptionId: ctx.billSub.id } }), periods.length);
    const sub = await prisma.subscription.findUnique({ where: { id: ctx.billSub.id } });
    assert.equal(sub.nextBillingDate.getTime(), periods[periods.length - 1][1].getTime());
  });
  await test('The database itself rejects a duplicate subscription period', async () => {
    const inv = ctx.invoices[0];
    await assert.rejects(
      prisma.invoice.create({
        data: {
          invoiceNumber: `INV-DUP-${RUN}`, customerId: inv.customerId, subscriptionId: inv.subscriptionId,
          billingPeriodStart: inv.billingPeriodStart, billingPeriodEnd: inv.billingPeriodEnd,
          dueDate: new Date(), subtotal: 1, totalAmount: 1, amountDue: 1,
        },
      }),
      (e) => e.code === 'P2002'
    );
  });
  await test('Concurrent billing runs still produce exactly one invoice per period', async () => {
    const sub = (await api('POST', '/subscriptions', tokens.staff, subBody({ customerId: ctx.globex.id, startDate: daysAgo(35).toISOString() }))).data.subscription;
    const results = await Promise.all([1, 2, 3].map(() => api('POST', '/billing/run', tokens.admin, { subscriptionId: sub.id })));
    results.forEach((r) => assert.equal(r.status, 201));
    const expected = 2; // start (35d ago) and start + 1 month
    assert.equal(await prisma.invoice.count({ where: { subscriptionId: sub.id } }), expected);
    assert.equal(results.reduce((n, r) => n + r.data.summary.invoicesGenerated, 0), expected);
  });
  await test('Discount usage limit holds under simultaneous billing (maxUses = 1)', async () => {
    const mk = async (customer) =>
      (await api('POST', '/subscriptions', tokens.staff, subBody({ planId: ctx.plan2.id, customerId: customer.id }))).data.subscription;
    const [a, b] = await Promise.all([mk(ctx.acme), mk(ctx.globex)]);
    const runs = await Promise.all([a, b].map((s) => api('POST', '/billing/run', tokens.admin, { subscriptionId: s.id })));
    runs.forEach((r) => assert.equal(r.data.summary.invoicesGenerated, 1));
    const invs = await prisma.invoice.findMany({ where: { subscriptionId: { in: [a.id, b.id] } }, select: { id: true } });
    const uses = await prisma.discountApplication.count({ where: { discountId: ctx.limited.id, status: 'APPLIED', invoiceId: { in: invs.map((i) => i.id) } } });
    assert.equal(uses, 1, 'exactly one invoice gets the single-use discount');
    assert.equal((await prisma.discount.findUnique({ where: { id: ctx.limited.id } })).usedCount, 1);
  });
  await test('Batched billing never skips a subscription (regression: 7 due subscriptions, batch size 2)', async () => {
    const created = [];
    for (let i = 0; i < 7; i += 1) {
      created.push((await api('POST', '/subscriptions', tokens.staff, subBody({ startDate: daysAgo(2).toISOString() }))).data.subscription.id);
    }
    const { runBilling } = await import('../src/services/billing.service.js');
    const result = await runBilling({ batchSize: 2 });
    assert.equal(result.summary.errors.length, 0);
    for (const id of created) {
      assert.equal(await prisma.invoice.count({ where: { subscriptionId: id } }), 1, `subscription ${id} must be billed exactly once`);
    }
    assert.ok(result.summary.subscriptionsEvaluated >= 7);
  });
  await test('Paused and cancelled subscriptions are not billed', async () => {
    const sub = (await api('POST', '/subscriptions', tokens.staff, subBody({ startDate: daysAgo(40).toISOString() }))).data.subscription;
    await api('POST', `/subscriptions/${sub.id}/pause`, tokens.staff);
    const res = await api('POST', '/billing/run', tokens.admin, { subscriptionId: sub.id });
    assert.equal(res.data.summary.invoicesGenerated, 0);
    assert.equal(await prisma.invoice.count({ where: { subscriptionId: sub.id } }), 0);
  });
  await test('Month-end billing dates clamp and do not drift (Jan 31 -> Feb 28 -> Mar 31)', async () => {
    const anchor = 31;
    const feb = addInterval(new Date(Date.UTC(2027, 0, 31)), 'MONTHLY', 1, anchor);
    const mar = addInterval(feb, 'MONTHLY', 1, anchor);
    assert.equal(feb.toISOString().slice(0, 10), '2027-02-28');
    assert.equal(mar.toISOString().slice(0, 10), '2027-03-31');
    assert.equal(addInterval(new Date(Date.UTC(2028, 1, 29)), 'YEARLY', 1, 29).toISOString().slice(0, 10), '2029-02-28');
    assert.equal(addInterval(new Date(Date.UTC(2027, 0, 1)), 'WEEKLY', 2).toISOString().slice(0, 10), '2027-01-15');
  });

  // ---- invoices ---------------------------------------------------------
  console.log('\nInvoices');
  await test('Customers never see DRAFT invoices; confirm moves DRAFT -> ISSUED once', async () => {
    const [first, second, third] = ctx.invoices;
    const hidden = await api('GET', `/invoices/${first.id}`, tokens.acme);
    assert.equal(hidden.status, 404);
    const confirmed = await api('POST', `/invoices/${first.id}/confirm`, tokens.staff);
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    assert.equal(confirmed.data.invoice.status, 'ISSUED');
    assert.equal((await api('POST', `/invoices/${first.id}/confirm`, tokens.staff)).status, 409);
    assert.equal((await api('GET', `/invoices/${first.id}`, tokens.acme)).status, 200);
    assert.equal((await api('GET', `/invoices/${first.id}`, tokens.globex)).status, 404);
    const list = await api('GET', '/invoices', tokens.acme);
    assert.ok(list.data.invoices.every((i) => i.customerId === ctx.acme.id && i.status !== 'DRAFT'));
    await api('POST', `/invoices/${second.id}/confirm`, tokens.staff);
    await api('POST', `/invoices/${third.id}/confirm`, tokens.staff);
  });
  await test('Cancelling an invoice reverts its discount use', async () => {
    const before = await prisma.discount.findUnique({ where: { id: ctx.discount.id } });
    const inv = ctx.invoices[1]; // carries the second discount use
    // cancel a DRAFT copy: use the 4th (no discount) first to show plain cancel works, then the discounted one
    const cancelled = await api('POST', `/invoices/${inv.id}/cancel`, tokens.staff);
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    assert.equal(cancelled.data.invoice.status, 'CANCELLED');
    assert.equal(cancelled.data.invoice.amountDue, 0);
    const after = await prisma.discount.findUnique({ where: { id: ctx.discount.id } });
    assert.equal(after.usedCount, before.usedCount - 1);
    assert.equal(await prisma.discountApplication.count({ where: { invoiceId: inv.id, status: 'REVERTED' } }), 1);
    assert.equal((await api('POST', `/invoices/${inv.id}/cancel`, tokens.staff)).status, 409);
  });
  await test('Send is honest: no email provider, so emailSent is false', async () => {
    const res = await api('POST', `/invoices/${ctx.invoices[0].id}/send`, tokens.staff);
    assert.equal(res.status, 200);
    assert.equal(res.data.emailSent, false);
  });

  // ---- payments ---------------------------------------------------------
  console.log('\nPayments');
  await test('Partial payment -> PARTIALLY_PAID; remainder -> PAID; overpayment rejected', async () => {
    const inv = ctx.invoices[0];
    const total = inv.totalAmount.toNumber();
    const part = await api('POST', '/payments', tokens.staff, { invoiceId: inv.id, amount: 10, paymentMethod: 'BANK_TRANSFER', transactionReference: 'WIRE-1', notes: 'first part' });
    assert.equal(part.status, 201, JSON.stringify(part.body));
    assert.match(part.data.payment.paymentNumber, /^PAY-\d{4}-\d{4}$/);
    let fresh = await prisma.invoice.findUnique({ where: { id: inv.id } });
    assert.equal(fresh.status, 'PARTIALLY_PAID');
    assert.equal(fresh.amountPaid.toNumber(), 10);
    assert.equal(fresh.amountDue.toNumber(), Math.round((total - 10) * 100) / 100);
    assert.equal(fresh.paidAt, null);

    const over = await api('POST', '/payments', tokens.staff, { invoiceId: inv.id, amount: total, paymentMethod: 'CASH' });
    assert.equal(over.status, 422);
    assert.equal(over.body.code, 'PAYMENT_EXCEEDS_BALANCE');

    const rest = await api('POST', '/payments', tokens.staff, { invoiceId: inv.id, amount: fresh.amountDue.toNumber(), paymentMethod: 'CREDIT_CARD' });
    assert.equal(rest.status, 201);
    fresh = await prisma.invoice.findUnique({ where: { id: inv.id } });
    assert.equal(fresh.status, 'PAID');
    assert.equal(fresh.amountDue.toNumber(), 0);
    assert.equal(fresh.amountPaid.toNumber(), total);
    assert.ok(fresh.paidAt);
    assert.equal((await api('POST', '/payments', tokens.staff, { invoiceId: inv.id, amount: 1, paymentMethod: 'CASH' })).status, 409);
  });
  await test('Payments need a confirmed invoice; frontend alias (invoice.invoiceNumber) works', async () => {
    const draft = await prisma.invoice.findFirst({ where: { subscriptionId: ctx.billSub.id, status: 'DRAFT' } });
    const sub = (await api('POST', '/subscriptions', tokens.staff, subBody({ startDate: daysAgo(1).toISOString(), customerId: ctx.globex.id }))).data.subscription;
    const run = await api('POST', '/billing/run', tokens.admin, { subscriptionId: sub.id, autoConfirm: true });
    assert.equal(run.data.invoices.length, 1);
    assert.equal(run.data.invoices[0].status, 'ISSUED');
    ctx.globexInvoice = run.data.invoices[0];
    const viaAlias = await api('POST', '/payments', tokens.staff, {
      customer: { companyName: 'ignored' }, invoice: { invoiceNumber: ctx.globexInvoice.invoiceNumber.toLowerCase() },
      amount: 5, paymentMethod: 'Wire Transfer',
    });
    assert.equal(viaAlias.status, 201, JSON.stringify(viaAlias.body));
    assert.equal(viaAlias.data.payment.paymentMethod, 'BANK_TRANSFER');
    assert.equal(viaAlias.data.payment.invoice.invoiceNumber, ctx.globexInvoice.invoiceNumber);
    if (draft) {
      const res = await api('POST', '/payments', tokens.staff, { invoiceId: draft.id, amount: 5, paymentMethod: 'CASH' });
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'INVOICE_NOT_PAYABLE');
    }
  });
  await test('Simultaneous full payments cannot over-allocate an invoice', async () => {
    const inv = await prisma.invoice.findUnique({ where: { id: ctx.globexInvoice.id } });
    const due = inv.amountDue.toNumber();
    const results = await Promise.all([1, 2, 3].map(() => api('POST', '/payments', tokens.staff, { invoiceId: inv.id, amount: due, paymentMethod: 'CASH' })));
    assert.equal(results.filter((r) => r.status === 201).length, 1, results.map((r) => r.status).join(','));
    const fresh = await prisma.invoice.findUnique({ where: { id: inv.id } });
    assert.equal(fresh.status, 'PAID');
    const allocated = await prisma.paymentAllocation.aggregate({ where: { invoiceId: inv.id }, _sum: { amount: true } });
    assert.equal(allocated._sum.amount.toString(), fresh.totalAmount.toString());
  });
  await test('Multi-invoice allocation: sum must not exceed the payment; invoices must share a customer', async () => {
    const [a, b] = ctx.invoices.slice(2); // third is ISSUED; fourth (if any) is still DRAFT
    const issued = await prisma.invoice.findMany({ where: { subscriptionId: ctx.billSub.id, status: 'ISSUED' } });
    assert.ok(issued.length >= 1);
    const target = issued[0];
    const tooMuch = await api('POST', '/payments', tokens.staff, {
      amount: 5, paymentMethod: 'CASH', allocations: [{ invoiceId: target.id, amount: 4 }, { invoiceId: target.id, amount: 3 }],
    });
    assert.equal(tooMuch.status, 422);
    assert.equal(tooMuch.body.code, 'ALLOCATION_EXCEEDS_PAYMENT');
    const mixed = await api('POST', '/payments', tokens.staff, {
      amount: 50, paymentMethod: 'CASH', allocations: [{ invoiceId: target.id, amount: 20 }, { invoiceId: ctx.globexInvoice.id, amount: 20 }],
    });
    assert.ok([400, 409].includes(mixed.status), `mixed-customer allocation should be rejected, got ${mixed.status}`);
    const ok = await api('POST', '/payments', tokens.staff, { amount: 30, paymentMethod: 'CASH', allocations: [{ invoiceId: target.id, amount: 20 }] });
    assert.equal(ok.status, 201);
    assert.equal(ok.data.payment.allocatedAmount, 20);
    assert.equal(ok.data.payment.unallocatedAmount, 10);
    void a; void b;
  });
  await test('Customers see only their own payments', async () => {
    const list = await api('GET', '/payments', tokens.acme);
    assert.equal(list.status, 200);
    assert.ok(list.data.payments.length > 0 && list.data.payments.every((p) => p.customerId === ctx.acme.id));
    const other = await prisma.payment.findFirst({ where: { customerId: ctx.globex.id } });
    assert.equal((await api('GET', `/payments/${other.id}`, tokens.acme)).status, 404);
  });
  await test('Open invoices past their due date become OVERDUE', async () => {
    const issued = await prisma.invoice.findFirst({ where: { subscriptionId: ctx.billSub.id, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } } });
    await prisma.invoice.update({ where: { id: issued.id }, data: { dueDate: daysAgo(45) } });
    const res = await api('GET', `/invoices/${issued.id}`, tokens.staff);
    assert.equal(res.data.invoice.status, 'OVERDUE');
    const overdue = await api('GET', '/invoices?status=OVERDUE', tokens.staff);
    assert.ok(overdue.data.invoices.some((i) => i.id === issued.id));
    // paying part of an overdue invoice keeps it OVERDUE, not PARTIALLY_PAID
    const pay = await api('POST', '/payments', tokens.staff, { invoiceId: issued.id, amount: 1, paymentMethod: 'CASH' });
    assert.equal(pay.status, 201, JSON.stringify(pay.body));
    assert.equal((await prisma.invoice.findUnique({ where: { id: issued.id } })).status, 'OVERDUE');
  });

  // ---- schema additions: templates, default tax, payment terms, plan switches ----
  console.log('\nQuotation templates, default tax, payment terms, plan switches');
  await test('Quotation templates: Admin manages, Staff reads, quotes start from them', async () => {
    const body = { name: 'Starter bundle', code: `testbill-tpl-${RUN}`, planId: ctx.plan.id, validityDays: 7, notes: 'tpl notes', terms: 'tpl terms', items: [{ variantId: ctx.variant.id, quantity: 3, unitPrice: 20 }] };
    assert.equal((await api('POST', '/quotation-templates', tokens.staff, body)).status, 403);
    const tooFew = await api('POST', '/quotation-templates', tokens.admin, { ...body, items: [{ variantId: ctx.variant.id, quantity: 1 }] });
    assert.equal(tooFew.status, 400);
    assert.equal(tooFew.body.code, 'PLAN_MIN_QUANTITY_NOT_MET', 'a template that can never satisfy Plan.minQuantity is refused');
    const created = await api('POST', '/quotation-templates', tokens.admin, body);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    ctx.template = created.data.template;
    assert.equal(ctx.template.code, `TESTBILL-TPL-${RUN}`);
    assert.equal(ctx.template.items.length, 1);
    assert.equal((await api('POST', '/quotation-templates', tokens.admin, body)).status, 409);
    assert.ok((await api('GET', '/quotation-templates', tokens.staff)).data.templates.some((t) => t.id === ctx.template.id));
    assert.equal((await api('GET', '/quotation-templates', tokens.acme)).status, 403);

    const quote = await api('POST', '/quotations', tokens.staff, { templateId: ctx.template.id, customerId: ctx.acme.id });
    assert.equal(quote.status, 201, JSON.stringify(quote.body));
    const q = quote.data.quotation;
    assert.equal(q.templateId, ctx.template.id);
    assert.equal(q.items.length, 1);
    assert.equal(q.items[0].quantity, 3);
    assert.equal(q.items[0].unitPrice, 20);
    assert.equal(q.items[0].planId, ctx.plan.id);
    assert.equal(q.subtotal, 60);
    assert.equal(q.notes, 'tpl notes');
    assert.equal(q.terms, 'tpl terms');
    const days = (new Date(q.validUntil) - Date.now()) / 86400000;
    assert.ok(days > 6 && days <= 7.01, `valid for the template's 7 days, got ${days}`);

    const override = await api('POST', '/quotations', tokens.staff, { templateId: ctx.template.id, customerId: ctx.acme.id, validDays: 3, items: [{ variantId: ctx.variant.id, quantity: 4 }] });
    assert.equal(override.status, 201);
    assert.equal(override.data.quotation.items[0].quantity, 4);
    assert.equal(override.data.quotation.items[0].unitPrice, ctx.variant.price.toNumber(), 'explicit lines replace the template lines');
    assert.equal((await api('POST', '/quotations', tokens.staff, { customerId: ctx.acme.id })).status, 400, 'lines or a template are required');

    const updated = await api('PUT', `/quotation-templates/${ctx.template.id}`, tokens.admin, { validityDays: 10 });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.template.validityDays, 10);
    assert.equal(updated.data.template.items.length, 1, 'lines are kept when only other fields change');
    assert.equal((await api('DELETE', `/quotation-templates/${ctx.template.id}`, tokens.admin)).status, 200);
    const inactive = await api('POST', '/quotations', tokens.staff, { templateId: ctx.template.id, customerId: ctx.acme.id });
    assert.equal(inactive.status, 400, 'an inactive template cannot start a quotation');
  });
  await test('Default tax: only one at a time, cannot be deactivated, picked up by new quotes', async () => {
    const mkTax = (suffix, rate) => api('POST', '/taxes', tokens.admin, { name: `Default ${suffix}`, code: `TESTTAX-D${suffix}-${RUN}`, rate, isDefault: true });
    const first = await mkTax('1', 5.5);
    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(first.data.tax.isDefault, true);
    const q1 = await api('POST', '/quotations', tokens.staff, quoteBody(3));
    assert.equal(q1.data.quotation.items[0].taxRate, 5.5, 'the flagged default tax is used');

    const second = await mkTax('2', 3);
    assert.equal(second.status, 201);
    assert.equal(await prisma.tax.count({ where: { isDefault: true } }), 1, 'promoting a tax demotes the previous default');
    assert.equal((await prisma.tax.findUnique({ where: { id: first.data.tax.id } })).isDefault, false);
    assert.equal((await api('PUT', `/taxes/${second.data.tax.id}`, tokens.admin, { isActive: false })).status, 400, 'the default tax cannot be deactivated');

    assert.equal((await api('PUT', `/taxes/${second.data.tax.id}`, tokens.admin, { isDefault: false })).status, 200);
    const q2 = await api('POST', '/quotations', tokens.staff, quoteBody(3));
    assert.equal(q2.data.quotation.items[0].taxRate, 8.25, 'with no flagged tax the DEFAULT_TAX_CODE fallback applies');
  });
  await test('Quoted tax rate is carried through conversion and billed; 0 means exempt, omitted means default', async () => {
    const quote = (await api('POST', '/quotations', tokens.staff, quoteBody(3, { items: [{ variantId: ctx.variant.id, quantity: 3, unitPrice: 33.33, taxRate: 5 }] }))).data.quotation;
    const conv = await api('POST', `/quotations/${quote.id}/convert`, tokens.staff, { startDate: daysAgo(1).toISOString() });
    assert.equal(conv.status, 201, JSON.stringify(conv.body));
    assert.equal(conv.data.subscription.items[0].taxRate, 5);
    const run = await api('POST', '/billing/run', tokens.admin, { subscriptionId: conv.data.subscription.id });
    assert.equal(run.data.summary.invoicesGenerated, 1);
    const inv = await prisma.invoice.findFirst({ where: { subscriptionId: conv.data.subscription.id }, include: { items: true } });
    assert.equal(inv.items[0].taxRate.toNumber(), 5, 'billing charges the quoted rate, not the current default');

    const exempt = (await api('POST', '/subscriptions', tokens.staff, subBody({ startDate: daysAgo(1).toISOString(), items: [{ variantId: ctx.variant.id, quantity: 3, unitPrice: 33.33, taxRate: 0 }] }))).data.subscription;
    assert.equal(exempt.items[0].taxRate, 0);
    await api('POST', '/billing/run', tokens.admin, { subscriptionId: exempt.id });
    const exInv = await prisma.invoice.findFirst({ where: { subscriptionId: exempt.id }, include: { items: true } });
    assert.equal(exInv.items[0].taxRate.toNumber(), 0);
    assert.equal(exInv.taxAmount.toNumber(), 0);
  });
  await test('Payment terms set the invoice due date (default 30 days)', async () => {
    const make = async (extra) => (await api('POST', '/subscriptions', tokens.staff, subBody({ startDate: daysAgo(1).toISOString(), ...extra }))).data.subscription;
    const custom = await make({ paymentTermsDays: 10 });
    const normal = await make({});
    assert.equal(custom.paymentTermsDays, 10);
    assert.equal(normal.paymentTermsDays, 30);
    assert.equal((await api('POST', '/subscriptions', tokens.staff, subBody({ paymentTermsDays: -1 }))).status, 400);
    for (const sub of [custom, normal]) await api('POST', '/billing/run', tokens.admin, { subscriptionId: sub.id });
    const dueIn = async (id) => {
      const inv = await prisma.invoice.findFirst({ where: { subscriptionId: id } });
      return Math.round((inv.dueDate - inv.issueDate) / 86400000);
    };
    assert.equal(await dueIn(custom.id), 10);
    assert.equal(await dueIn(normal.id), 30);
  });
  await test('Per-plan switches: pause / early close / renew can be disabled by the Admin', async () => {
    const plan3 = await mkPlan(`TESTBILL3-${RUN}`, { minQuantity: 1 });
    const body = (extra = {}) => subBody({ planId: plan3.id, items: [{ variantId: ctx.variant.id, quantity: 1 }], ...extra });
    const lifecycle = (flags, token = tokens.admin) => api('PATCH', `/plans/${plan3.id}/lifecycle`, token, flags);
    assert.equal(plan3.allowPause, true, 'new plans allow everything by default');
    assert.equal((await lifecycle({ allowPause: false }, tokens.staff)).status, 403);
    assert.equal((await lifecycle({})).status, 400);
    assert.equal((await api('PATCH', '/plans/00000000-0000-4000-8000-000000000000/lifecycle', tokens.admin, { allowPause: false })).status, 404);

    const sub = (await api('POST', '/subscriptions', tokens.staff, body())).data.subscription;
    assert.equal((await lifecycle({ allowPause: false })).status, 200);
    const pause = await api('POST', `/subscriptions/${sub.id}/pause`, tokens.staff);
    assert.equal(pause.status, 409);
    assert.equal(pause.body.code, 'PLAN_DOES_NOT_ALLOW_PAUSE');
    assert.equal((await api('POST', `/subscriptions/${sub.id}/pause`, tokens.acme)).status, 409, 'the customer cannot bypass it either');
    await lifecycle({ allowPause: true });
    assert.equal((await api('POST', `/subscriptions/${sub.id}/pause`, tokens.staff)).status, 200);
    await api('POST', `/subscriptions/${sub.id}/resume`, tokens.staff);

    await lifecycle({ allowEarlyClose: false });
    const cancel = await api('POST', `/subscriptions/${sub.id}/cancel`, tokens.staff, {});
    assert.equal(cancel.status, 409);
    assert.equal(cancel.body.code, 'PLAN_DOES_NOT_ALLOW_CANCEL');
    await lifecycle({ allowEarlyClose: true });

    await lifecycle({ allowRenew: false });
    const withEnd = (await api('POST', '/subscriptions', tokens.staff, body({ endDate: new Date(Date.now() + 40 * 86400000).toISOString() }))).data.subscription;
    const renew = await api('POST', `/subscriptions/${withEnd.id}/renew`, tokens.staff);
    assert.equal(renew.status, 409);
    assert.equal(renew.body.code, 'PLAN_DOES_NOT_ALLOW_RENEW');
    await lifecycle({ allowRenew: true });
    assert.equal((await api('POST', `/subscriptions/${withEnd.id}/renew`, tokens.staff)).status, 200);

    // autoCloseOnEnd = false: the subscription is not expired and keeps billing past its end date
    await lifecycle({ autoCloseOnEnd: false });
    const open = (await api('POST', '/subscriptions', tokens.staff, body({ startDate: daysAgo(40).toISOString(), endDate: daysAgo(20).toISOString() }))).data.subscription;
    const run = await api('POST', '/billing/run', tokens.admin, { subscriptionId: open.id });
    assert.equal(run.data.summary.subscriptionsExpired, 0);
    assert.equal((await prisma.subscription.findUnique({ where: { id: open.id } })).status, 'ACTIVE');
    assert.equal(await prisma.invoice.count({ where: { subscriptionId: open.id } }), 2, 'billed for the period that starts after the end date');
    await lifecycle({ autoCloseOnEnd: true });
  });

  // ---- reports ----------------------------------------------------------
  console.log('\nReports');
  await test('Summary, metrics and revenue reports respond with database-derived figures', async () => {
    const summary = await api('GET', '/reports/summary', tokens.staff);
    assert.equal(summary.status, 200, JSON.stringify(summary.body));
    assert.ok(summary.data.subscriptions.active >= 1);
    assert.ok(summary.data.revenue.received > 0);
    assert.ok(summary.data.receivables.overdueCount >= 1);
    assert.ok(Array.isArray(summary.data.receivables.aging));

    const filtered = await api('GET', '/reports/summary?from=2020-01-01&to=2020-01-31', tokens.staff);
    assert.equal(filtered.data.revenue.received, 0);
    assert.equal(filtered.data.revenue.paymentCount, 0);

    const metrics = await api('GET', '/reports/metrics', tokens.admin);
    assert.equal(metrics.status, 200, JSON.stringify(metrics.body));
    for (const k of ['mrr', 'mrrGrowth', 'activeSubscriptions', 'totalRevenue', 'overdueAmount', 'overdueCount', 'revenueTrend', 'planDistribution']) {
      assert.ok(k in metrics.data, `metrics.${k}`);
    }
    assert.equal(metrics.data.revenueTrend.length, 6);
    assert.ok(metrics.data.mrr > 0);

    const revenue = await api('GET', '/reports/revenue?timeframe=yearly', tokens.staff);
    assert.equal(revenue.status, 200, JSON.stringify(revenue.body));
    assert.ok(revenue.data.totalGross > 0);
    assert.equal(Math.round((revenue.data.totalNet + revenue.data.totalTax) * 100), Math.round(revenue.data.totalGross * 100));
    assert.ok(revenue.data.recentCollections.length > 0);
  });
  await test('Billing runs are recorded and listable by staff', async () => {
    const runs = await api('GET', '/billing/runs', tokens.staff);
    assert.equal(runs.status, 200);
    assert.ok(runs.data.billingRuns.length > 0);
    const one = await api('GET', `/billing/runs/${runs.data.billingRuns[0].id}`, tokens.staff);
    assert.equal(one.status, 200);
  });

  console.log(`\n==================================\n  RESULTS: ${passed} passed, ${failed} failed\n==================================`);
  return failed;
}

let exitCode = 0;
try {
  await startServer();
  await cleanup().catch(() => {}); // leftovers from an aborted earlier run
  exitCode = (await runTests()) > 0 ? 1 : 0;
} catch (error) {
  console.error('Test run aborted:', error);
  exitCode = 1;
} finally {
  await cleanup().catch((e) => console.error('cleanup failed:', e.message));
  await new Promise((resolve) => server?.close(resolve));
  await prisma.$disconnect();
}
process.exit(exitCode);
