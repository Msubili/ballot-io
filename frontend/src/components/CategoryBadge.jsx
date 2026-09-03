import React from 'react';
import { CATEGORY_COLORS, cn } from '../utils/helpers';

export default function CategoryBadge({ category, className }) {
  const colorClass = CATEGORY_COLORS[category] || 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {category}
    </span>
  );
}
