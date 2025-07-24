import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function isDeadlinePassed(deadline: string | Date) {
  return new Date(deadline) < new Date();
}

export function getTimeRemaining(deadline: string | Date) {
  const now = new Date();
  const endDate = new Date(deadline);
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Expired';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
}

export function validateUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getContentTypeFromUrl(url: string) {
  if (url.includes('tiktok.com')) return 'TIKTOK';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'TWITTER';
  if (url.includes('instagram.com')) return 'INSTAGRAM';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YOUTUBE';
  return 'OTHER';
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'text-warning bg-warning/10';
    case 'approved':
      return 'text-success bg-success/10';
    case 'rejected':
      return 'text-danger bg-danger/10';
    case 'paid':
      return 'text-whop-blue bg-whop-blue/10';
    case 'active':
      return 'text-success bg-success/10';
    case 'completed':
      return 'text-gray-600 bg-gray-100';
    case 'cancelled':
      return 'text-danger bg-danger/10';
    default:
      return 'text-gray-600 bg-gray-100';
  }
} 