import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  tone?: 'default' | 'danger';
}

export function IconButton({ icon: Icon, label, tone = 'default', className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700',
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
