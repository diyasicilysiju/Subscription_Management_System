import { Prisma } from '@prisma/client';
import prisma from '../config/db.js';
import { D } from '../utils/money.js';
import { parseDateRange } from '../utils/pagination.js';
import { markOverdueInvoices } from './invoice.service.js';

/**
 * Finance reports (Member 4). Everything is computed with database aggregates;
 * no report loads subscriptions or invoices into application memory.
 *
 * MRR normalises every ACTIVE subscription's per-period amount to a month
 * (daily x 30.4375, weekly x 4.348, yearly / 12, divided by the plan's intervalCount).
 */

const NON_REVENUE_INVOICE = ['DRAFT', 'CANCELLED', 'VOID'];
const OPEN_INVOICE = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

/** CTE: one row per subscription with its monthly-normalised recurring amount. */
const SUB_AMOUNT_CTE = Prisma.sql`
  sub_amount AS (
    SELECT s.id, s.status, s."startDate", s."cancelledAt", p.id AS "planId", p.name AS "planName",
           COALESCE((SELECT SUM(si.quantity * si."unitPrice") FROM subscription_items si WHERE si."subscriptionId" = s.id), p.price)
           * CASE s."billingInterval"
               WHEN 'DAILY'   THEN 30.4375 / p."intervalCount"
               WHEN 'WEEKLY'  THEN 4.348214 / p."intervalCount"
               WHEN 'MONTHLY' THEN 1.0 / p."intervalCount"
               WHEN 'YEARLY'  THEN 1.0 / (12 * p."intervalCount")
             END AS monthly
      FROM subscriptions s JOIN plans p ON p.id = s."planId"
  )`;

const pct = (current, previous) => {
  const cur = Number(current);
  const prev = Number(previous);
  if (!prev) return cur > 0 ? '+100.0%' : '+0.0%';
  const change = ((cur - prev) / prev) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
};

const num = (value) => (value === null || value === undefined ? 0 : Number(value));

const rangeFor = (query = {}) => {
  const explicit = parseDateRange(query);
  if (explicit) return explicit;
  if (query.timeframe) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const start =
      query.timeframe === 'yearly' ? new Date(Date.UTC(y, 0, 1))
      : query.timeframe === 'quarterly' ? new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1))
      : new Date(Date.UTC(y, m, 1));
    return { gte: start, lte: now };
  }
  return null;
};

/* ---------- building blocks ---------- */

const subscriptionStats = async () => {
  const [byStatus, [mrrRow], plans] = await Promise.all([
    prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.$queryRaw`WITH ${SUB_AMOUNT_CTE}
      SELECT COALESCE(SUM(monthly) FILTER (WHERE status = 'ACTIVE'), 0) AS mrr,
             COALESCE(SUM(monthly) FILTER (WHERE status = 'ACTIVE' AND "startDate" < date_trunc('month', now() AT TIME ZONE 'UTC')), 0) AS "mrrPrevMonth",
             COUNT(*) FILTER (WHERE status IN ('ACTIVE','TRIALING') AND "startDate" < date_trunc('month', now() AT TIME ZONE 'UTC'))::int AS "activePrevMonth",
             COUNT(*) FILTER (WHERE status = 'CANCELLED' AND "cancelledAt" >= (now() AT TIME ZONE 'UTC') - interval '30 days')::int AS "cancelled30d"
        FROM sub_amount`,
    prisma.$queryRaw`WITH ${SUB_AMOUNT_CTE}
      SELECT "planName" AS name, COUNT(*)::int AS count, COALESCE(SUM(monthly), 0) AS value
        FROM sub_amount WHERE status IN ('ACTIVE','TRIALING')
       GROUP BY "planId", "planName" ORDER BY COUNT(*) DESC`,
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
  const active = (counts.ACTIVE ?? 0) + (counts.TRIALING ?? 0);
  return { counts, active, mrrRow, plans };
};

const receivables = async () => {
  await markOverdueInvoices();
  const [outstanding, overdue, aging] = await Promise.all([
    prisma.invoice.aggregate({ where: { status: { in: OPEN_INVOICE } }, _sum: { amountDue: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: { status: 'OVERDUE' }, _sum: { amountDue: true }, _count: { _all: true } }),
    prisma.$queryRaw`
      SELECT CASE WHEN (now() AT TIME ZONE 'UTC') - "dueDate" <= interval '30 days' THEN '1-30'
                  WHEN (now() AT TIME ZONE 'UTC') - "dueDate" <= interval '60 days' THEN '31-60'
                  WHEN (now() AT TIME ZONE 'UTC') - "dueDate" <= interval '90 days' THEN '61-90'
                  ELSE '90+' END AS bucket,
             COUNT(*)::int AS count, COALESCE(SUM("amountDue"), 0) AS amount
        FROM invoices WHERE status = 'OVERDUE'
       GROUP BY 1 ORDER BY 1`,
  ]);
  return { outstanding, overdue, aging };
};

const collected = (range) =>
  prisma.payment.aggregate({ where: { status: 'COMPLETED', ...(range ? { paymentDate: range } : {}) }, _sum: { amount: true }, _count: { _all: true } });

const invoiced = (range) =>
  prisma.invoice.aggregate({
    where: { status: { notIn: NON_REVENUE_INVOICE }, ...(range ? { issueDate: range } : {}) },
    _sum: { totalAmount: true, taxAmount: true, subtotal: true, discountAmount: true },
    _count: { _all: true },
  });

/* ---------- public reports ---------- */

/** Date-filtered summary: subscriptions, revenue, payments, receivables. */
export const getSummary = async (query = {}) => {
  const range = rangeFor(query);
  const [subs, recv, paid, billed] = await Promise.all([subscriptionStats(), receivables(), collected(range), invoiced(range)]);
  return {
    period: { from: range?.gte ?? null, to: range?.lte ?? null },
    subscriptions: { active: subs.active, byStatus: subs.counts, mrr: num(subs.mrrRow.mrr), byPlan: subs.plans.map((p) => ({ name: p.name, count: p.count, value: num(p.value) })) },
    revenue: {
      received: num(paid._sum.amount),
      paymentCount: paid._count._all,
      invoiced: num(billed._sum.totalAmount),
      invoiceCount: billed._count._all,
      discountsGiven: num(billed._sum.discountAmount),
      taxCharged: num(billed._sum.taxAmount),
    },
    receivables: {
      outstanding: num(recv.outstanding._sum.amountDue),
      outstandingCount: recv.outstanding._count._all,
      overdue: num(recv.overdue._sum.amountDue),
      overdueCount: recv.overdue._count._all,
      aging: recv.aging.map((a) => ({ bucket: a.bucket, count: a.count, amount: num(a.amount) })),
    },
  };
};

/** Dashboard KPIs + chart series in the shape the frontend's Recharts widgets read. */
export const getMetrics = async () => {
  const [subs, recv, paid, trend] = await Promise.all([
    subscriptionStats(),
    receivables(),
    collected(null),
    prisma.$queryRaw`
      WITH months AS (
        SELECT generate_series(date_trunc('month', now() AT TIME ZONE 'UTC') - interval '5 months',
                               date_trunc('month', now() AT TIME ZONE 'UTC'), interval '1 month') AS m
      ), ${SUB_AMOUNT_CTE}
      SELECT to_char(months.m, 'Mon') AS month,
             COALESCE((SELECT SUM(p.amount) FROM payments p
                        WHERE p.status = 'COMPLETED' AND p."paymentDate" >= months.m AND p."paymentDate" < months.m + interval '1 month'), 0) AS revenue,
             COALESCE((SELECT SUM(sa.monthly) FROM sub_amount sa
                        WHERE sa.status <> 'PENDING' AND sa."startDate" < months.m + interval '1 month'
                          AND (sa."cancelledAt" IS NULL OR sa."cancelledAt" >= months.m + interval '1 month')), 0) AS mrr
        FROM months ORDER BY months.m`,
  ]);

  const mrr = num(subs.mrrRow.mrr);
  const churnBase = subs.active + subs.mrrRow.cancelled30d;
  const revenueTrend = trend.map((t) => ({ month: t.month, revenue: num(t.revenue), mrr: Math.round(num(t.mrr) * 100) / 100 }));
  // History is reconstructed from start/cancel dates; pin the current month to the headline MRR so the chart and KPI agree.
  if (revenueTrend.length) revenueTrend[revenueTrend.length - 1].mrr = mrr;
  return {
    mrr,
    mrrGrowth: pct(mrr, subs.mrrRow.mrrPrevMonth),
    activeSubscriptions: subs.active,
    activeSubscriptionsGrowth: pct(subs.active, subs.mrrRow.activePrevMonth),
    totalRevenue: num(paid._sum.amount),
    overdueAmount: num(recv.overdue._sum.amountDue),
    overdueCount: recv.overdue._count._all,
    churnRate: `${(churnBase ? (subs.mrrRow.cancelled30d / churnBase) * 100 : 0).toFixed(1)}%`,
    revenueTrend,
    planDistribution: subs.plans.map((p) => ({ name: p.name, count: p.count, value: num(p.value) })),
  };
};

/** Revenue report: ?timeframe=monthly|quarterly|yearly or ?from=&to= */
export const getRevenueReport = async (query = {}) => {
  const range = rangeFor({ timeframe: 'monthly', ...query });
  const [billed, paid, recv, recent] = await Promise.all([
    invoiced(range),
    collected(range),
    receivables(),
    prisma.payment.findMany({
      where: { status: 'COMPLETED', ...(range ? { paymentDate: range } : {}) },
      orderBy: { paymentDate: 'desc' },
      take: 10,
      include: { customer: { select: { companyName: true, contactName: true } } },
    }),
  ]);
  const gross = D(billed._sum.totalAmount ?? 0);
  const tax = D(billed._sum.taxAmount ?? 0);
  return {
    period: { from: range?.gte ?? null, to: range?.lte ?? null },
    totalGross: gross.toNumber(),
    totalTax: tax.toNumber(),
    totalNet: gross.minus(tax).toNumber(),
    totalDiscounts: num(billed._sum.discountAmount),
    totalCollected: num(paid._sum.amount),
    arOverdue: num(recv.overdue._sum.amountDue),
    outstanding: num(recv.outstanding._sum.amountDue),
    agingBuckets: recv.aging.map((a) => ({ bucket: a.bucket, count: a.count, amount: num(a.amount) })),
    recentCollections: recent.map((p) => ({
      date: p.paymentDate.toISOString().slice(0, 10),
      customer: p.customer.companyName || p.customer.contactName,
      amount: num(p.amount),
      method: p.paymentMethod.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      status: 'Settled',
    })),
  };
};
