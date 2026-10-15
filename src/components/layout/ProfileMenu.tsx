import { useCallback, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDismiss } from '@/hooks/useClickOutside';
import { ROLE_LABELS } from '@/lib/constants';
import { initials } from '@/utils/format';

export function ProfileMenu({ profilePath }: { profilePath: string }) {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  if (!profile) return null;
  const name = profile.full_name || profile.email;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl p-1.5 pr-2.5 hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initials(name)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-800 sm:block">{name}</span>
        <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{profile.email}</p>
            <p className="mt-1 text-xs font-medium text-brand-700">{ROLE_LABELS[profile.role]}</p>
          </div>
          <Link
            role="menuitem"
            to={profilePath}
            onClick={close}
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-brand-50"
          >
            <UserCircle className="h-4 w-4" aria-hidden="true" />
            Profile and password
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-brand-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
