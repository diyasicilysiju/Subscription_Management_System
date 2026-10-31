import React from 'react';
import { formatStatusText } from '../../utils/formatters';

export const Badge = ({ status, variant, children, className = '' }) => {
  const getVariantStyles = (statusVal) => {
    if (variant) {
      switch (variant) {
        case 'success': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'danger': return 'bg-rose-50 text-rose-700 border-rose-200';
        case 'info': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'neutral': return 'bg-slate-100 text-slate-700 border-slate-200';
        default: break;
      }
    }

    const s = String(statusVal || '').toUpperCase();
    switch (s) {
      case 'ACTIVE':
      case 'PAID':
      case 'COMPLETED':
      case 'ACCEPTED':
      case 'SETTLED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      case 'TRIALING':
      case 'ISSUED':
      case 'SENT':
      case 'PENDING':
      case 'CONVERTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      case 'PAUSED':
      case 'PARTIALLY_PAID':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'CANCELLED':
      case 'OVERDUE':
      case 'FAILED':
      case 'REJECTED':
      case 'VOID':
        return 'bg-rose-50 text-rose-700 border-rose-200';

      case 'EXPIRED':
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-600 border-slate-200';

      case 'DRAFT':
        return 'bg-purple-50 text-purple-700 border-purple-200';

      case 'ADMIN':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
      case 'STAFF':
        return 'bg-teal-50 text-teal-700 border-teal-200 font-semibold';
      case 'CUSTOMER':
        return 'bg-sky-50 text-sky-700 border-sky-200 font-semibold';

      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const displayText = children || formatStatusText(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVariantStyles(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 mr-1.5 shrink-0" />
      {displayText}
    </span>
  );
};
