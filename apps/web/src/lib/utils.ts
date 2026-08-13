import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = new Date();
  const target = new Date(date);
  const diffInSeconds = (target.getTime() - now.getTime()) / 1000;

  if (Math.abs(diffInSeconds) < 60) return rtf.format(Math.round(diffInSeconds), 'second');
  if (Math.abs(diffInSeconds) < 3600) return rtf.format(Math.round(diffInSeconds / 60), 'minute');
  if (Math.abs(diffInSeconds) < 86400) return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
  return rtf.format(Math.round(diffInSeconds / 86400), 'day');
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}

export const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'yellow' },
  PROCESSING: { label: 'Processing', color: 'blue' },
  SUCCEEDED: { label: 'Paid', color: 'green' },
  FAILED: { label: 'Failed', color: 'red' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
  REFUNDED: { label: 'Refunded', color: 'purple' },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', color: 'orange' },
  DISPUTED: { label: 'Disputed', color: 'red' },
};

export const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'gray' },
  PENDING: { label: 'Pending', color: 'yellow' },
  PAID: { label: 'Paid', color: 'green' },
  FAILED: { label: 'Failed', color: 'red' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
  REFUNDED: { label: 'Refunded', color: 'purple' },
  PARTIALLY_REFUNDED: { label: 'Partial Refund', color: 'orange' },
  DISPUTED: { label: 'Disputed', color: 'red' },
};
