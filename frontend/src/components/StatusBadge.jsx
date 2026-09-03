import React from 'react';
import { STATUS_COLORS, cn } from '../utils/helpers';

export default function StatusBadge({ status, className }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        colorClass,
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'Live' && 'bg-emerald-500 animate-pulse',
          status === 'Upcoming' && 'bg-amber-500',
          status === 'Closed' && 'bg-gray-400'
        )}
      />
      {status}
    </span>
  );
}
