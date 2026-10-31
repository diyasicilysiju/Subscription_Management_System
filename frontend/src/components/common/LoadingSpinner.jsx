import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ fullPage = false, message = 'Loading...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {message && <p className="text-sm font-medium text-slate-500">{message}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">{content}</div>;
  }

  return <div className="py-12 flex items-center justify-center">{content}</div>;
};
