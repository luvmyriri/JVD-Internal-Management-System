import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format a date string to a human-readable format.
 */
export function formatDate(date: string | Date, fmt: string = 'MMM dd, yyyy'): string {
  return format(new Date(date), fmt);
}

/**
 * Format a date string to a relative "time ago" string.
 */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format a number as Philippine Peso currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

/**
 * Format raw input string representing money to add commas as separators.
 * e.g., '19000' -> '19,000', '19000.50' -> '19,000.50'
 */
export function formatMoneyInput(value: string): string {
  const clean = value.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts.slice(1).join('') : '';

  if (integerPart) {
    if (integerPart.length > 1 && integerPart.startsWith('0')) {
      integerPart = integerPart.replace(/^0+/, '');
      if (integerPart === '') integerPart = '0';
    }
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return integerPart + decimalPart;
}

/**
 * Remove commas from a money formatted string so it can be parsed as a number.
 * e.g., '19,000.50' -> '19000.50'
 */
export function parseMoneyInput(value: string): string {
  return value.replace(/,/g, '');
}


/**
 * Round a ISO / datetime-local string to 30-minute intervals.
 */
export function roundTo30Minutes(dateTimeStr: string): string {
  if (!dateTimeStr) return dateTimeStr;
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return dateTimeStr;
  const minutes = date.getMinutes();
  const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 60;
  date.setMinutes(roundedMinutes);
  date.setSeconds(0);
  if (roundedMinutes === 60) {
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
  }
  const iso = date.toISOString();
  return iso.slice(0, 16);
}

/**
 * Calculate target return datetime given start datetime and duration days.
 */
export function calculateReturnDate(startsAt: string, durationDays: number): string {
  if (!startsAt) return startsAt;
  const date = new Date(startsAt);
  if (isNaN(date.getTime())) return startsAt;
  const daysToAdd = Math.max(0, durationDays - 1);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 16);
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Get the full name of a user or person object.
 */
export function fullName(person: { first_name: string; last_name: string }): string {
  return `${person.first_name} ${person.last_name}`;
}

/**
 * Get initials from a name for avatar display.
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Classname utility — merges tailwind classes correctly using tailwind-merge and clsx.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get full URL for avatar, handling both absolute and relative paths.
 * - External URLs (http/https) are returned unchanged
 * - Relative /storage paths are returned as-is so the Vite dev proxy serves them
 * - Other relative paths get the backend base URL prepended
 */
export function getAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // External URLs — return as-is
  if (path.startsWith('http')) return path;
  // Storage paths — return relative so Vite proxy forwards to backend
  if (path.startsWith('/storage')) return path;
  // Other relative paths — prepend backend base URL
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const baseUrl = apiBase.startsWith('/')
    ? `${window.location.origin}${apiBase.replace(/\/api\/v1$/, '')}`
    : apiBase.replace(/\/api\/v1$/, '') || 'http://localhost:8000';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Get the full URL for files stored in Laravel storage.
 * - External URLs (http/https) are returned unchanged
 * - If path starts with /storage, return it relative (so Vite proxy resolves it)
 * - Otherwise, return `/storage/${path}`
 */
export function getStorageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const apiBase = import.meta.env.VITE_API_URL || '';
  const baseUrl = apiBase === '/' ? '' : apiBase.replace(/\/+$/, '');
  
  const relativePath = path.startsWith('/') ? path : `/${path}`;
  
  if (relativePath.startsWith('/storage/')) {
    return `${baseUrl}${relativePath}`;
  }
  
  return `${baseUrl}/storage${relativePath}`;
}

/**
 * Generate a UUID v4 string safely across all environments (including non-secure HTTP contexts).
 */
export function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
