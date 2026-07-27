import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserRole } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// A user can hold multiple roles now — true if ANY of their roles matches
// ANY of the candidates being checked for.
export function hasAnyRole(roles: UserRole[] | undefined, ...candidates: UserRole[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => candidates.includes(r));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}
