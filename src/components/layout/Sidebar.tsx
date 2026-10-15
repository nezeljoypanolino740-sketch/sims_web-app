import { GraduationCap, LogOut, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { NavItem } from '@/layouts/navigation';
import { cn } from '@/lib/utils';

interface SidebarProps {
  items: readonly NavItem[];
  onNavigate?: () => void;
  /** Shown only inside the mobile drawer. */
  onClose?: () => void;
}

export function Sidebar({ items, onNavigate, onClose }: SidebarProps) {
  const { signOut } = useAuth();

  return (
    <div className="flex h-full flex-col bg-brand-900 text-brand-100">
      <div className="flex items-center justify-between gap-3 px-5 py-5">
        <div className="flex items-center gap-3 text-base font-semibold text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          SIMS Portal
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 hover:bg-white/10">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-white text-brand-800' : 'text-brand-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-100 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );
}
