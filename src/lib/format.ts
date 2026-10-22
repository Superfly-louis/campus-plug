import { priceFractionDigits } from '@/constants/theme';

const orderDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const clock = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

const dayMs = 24 * 60 * 60 * 1000;

export function formatPrice(amount: number): string {
  return `GH₵${amount.toFixed(priceFractionDigits)}`;
}

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatOrderDate(value: string | Date): string {
  const date = toDate(value);
  if (!date) return '';
  return orderDate.format(date);
}

export function formatTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return '';
  return clock.format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = formatOrderDate(value);
  const time = formatTime(value);
  if (!date || !time) return '';
  return `${date}, ${time}`;
}

export function formatDayLabel(value: string | Date, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return '';
  const days = Math.round((startOfDay(now) - startOfDay(date)) / dayMs);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return formatOrderDate(date);
}
