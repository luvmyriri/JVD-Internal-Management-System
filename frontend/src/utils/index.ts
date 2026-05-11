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

/**
 * Classname utility — filters falsy values and joins.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
