import type { Student } from '@/types/models';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: string): Date {
  // Date-only strings are local calendar dates, not UTC midnight.
  return DATE_ONLY.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value.toFixed(digits)}%`;
}

export function scorePercent(score: number, total: number): number | null {
  return total > 0 ? (score / total) * 100 : null;
}

export function studentFullName(student: Pick<Student, 'first_name' | 'middle_name' | 'last_name'>): string {
  return [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');
}

/** 'on_leave' -> 'On leave' */
export function titleCase(value: string): string {
  const text = value.replace(/_/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** Today's local date as YYYY-MM-DD (not UTC). */
export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase();
}
