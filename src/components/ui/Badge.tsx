import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

/** Maps any status value used in the database to a badge colour. */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'active':
    case 'enrolled':
    case 'present':
      return 'success';
    case 'pending':
    case 'late':
    case 'on_leave':
    case 'excused':
      return 'warning';
    case 'inactive':
    case 'absent':
    case 'dropped':
      return 'danger';
    case 'graduated':
      return 'brand';
    default:
      return 'neutral';
  }
}
