/**
 * Pagination helpers shared by Member 4's list endpoints.
 * Response meta shape matches the existing customer/product endpoints.
 */
export const parsePagination = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
};

export const buildMeta = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

/** Parse ?from=&to= (YYYY-MM-DD or ISO). `to` date-only values include the whole day. */
export const parseDateRange = (query = {}) => {
  const range = {};
  if (query.from) {
    const from = new Date(query.from);
    if (!Number.isNaN(from.getTime())) range.gte = from;
  }
  if (query.to) {
    const to = new Date(query.to);
    if (!Number.isNaN(to.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) to.setUTCHours(23, 59, 59, 999);
      range.lte = to;
    }
  }
  return Object.keys(range).length ? range : null;
};
