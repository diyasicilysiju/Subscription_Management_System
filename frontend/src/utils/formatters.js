export const formatCurrency = (amount, currency = 'USD') => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options,
    }).format(date);
  } catch {
    return '—';
  }
};

export const formatInterval = (interval, count = 1) => {
  if (!interval) return '';
  const clean = interval.toLowerCase();
  if (count === 1) {
    if (clean === 'daily') return 'Day';
    if (clean === 'weekly') return 'Week';
    if (clean === 'monthly') return 'Month';
    if (clean === 'yearly') return 'Year';
  }
  return `${count} ${clean.replace(/ly$/, 's')}`;
};

export const formatStatusText = (status) => {
  if (!status) return '';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
