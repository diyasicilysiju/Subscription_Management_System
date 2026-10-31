/**
 * Billing date helpers (Member 4). Everything is UTC so billing periods do not
 * shift with the server's timezone.
 */

const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/**
 * Add `count` calendar months, clamping to month end (Jan 31 + 1 month = Feb 28).
 * `anchorDay` keeps recurring dates from drifting (Jan 31 -> Feb 28 -> Mar 31).
 */
export const addMonths = (date, count, anchorDay = new Date(date).getUTCDate()) => {
  const d = new Date(date);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + count, 1,
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  target.setUTCDate(Math.min(anchorDay, daysInMonth(target.getUTCFullYear(), target.getUTCMonth())));
  return target;
};

export const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000);

/**
 * Next date after one billing step.
 * @param {Date} date
 * @param {'DAILY'|'WEEKLY'|'MONTHLY'|'YEARLY'} interval
 * @param {number} count - plan.intervalCount (e.g. every 3 months)
 * @param {number} [anchorDay] - day-of-month of the original start date
 */
export const addInterval = (date, interval, count = 1, anchorDay) => {
  switch (interval) {
    case 'DAILY':
      return addDays(date, count);
    case 'WEEKLY':
      return addDays(date, 7 * count);
    case 'MONTHLY':
      return addMonths(date, count, anchorDay);
    case 'YEARLY':
      return addMonths(date, 12 * count, anchorDay);
    default:
      throw new Error(`Unsupported billing interval: ${interval}`);
  }
};

export const startOfUtcMonth = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export const fmtDate = (date) => new Date(date).toISOString().slice(0, 10);
