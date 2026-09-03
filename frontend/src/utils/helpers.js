import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeRemaining(endDate) {
  const diff = new Date(endDate).getTime() - new Date().getTime();
  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export const CATEGORY_COLORS = {
  General: 'bg-blue-50 text-blue-700 border-blue-200',
  Election: 'bg-purple-50 text-purple-700 border-purple-200',
  Community: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Corporate: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const STATUS_COLORS = {
  Live: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Upcoming: 'bg-amber-100 text-amber-800 border-amber-300',
  Closed: 'bg-gray-100 text-gray-700 border-gray-300',
};
