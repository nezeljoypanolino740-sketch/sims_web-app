import { Menu } from 'lucide-react';
import { NotificationsMenu } from '@/components/layout/NotificationsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';

interface TopbarProps {
  roleLabel: string;
  profilePath: string;
  notificationsPath?: string;
  onMenuClick: () => void;
}

export function Topbar({ roleLabel, profilePath, notificationsPath, onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">{roleLabel}</span>
      </div>
      <div className="flex items-center gap-1">
        <NotificationsMenu viewAllPath={notificationsPath} />
        <ProfileMenu profilePath={profilePath} />
      </div>
    </header>
  );
}
