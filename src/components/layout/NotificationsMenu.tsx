import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/Spinner';
import { useDismiss } from '@/hooks/useClickOutside';
import { getErrorMessage } from '@/lib/errors';
import { NOTIFICATIONS_CHANGED, countUnread, listNotifications, markAllRead, markRead } from '@/services/notificationService';
import type { AppNotification } from '@/types/models';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/utils/format';

const POLL_MS = 60_000;

export function NotificationsMenu({ viewAllPath }: { viewAllPath?: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await countUnread());
    } catch {
      // The badge is a convenience; stay quiet if a poll fails.
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const timer = window.setInterval(() => void refreshCount(), POLL_MS);
    const onChanged = () => void refreshCount();
    window.addEventListener(NOTIFICATIONS_CHANGED, onChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChanged);
    };
  }, [refreshCount]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listNotifications(1, 8);
      setItems(page.rows);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      void loadItems();
      void refreshCount();
    }
  };

  const onItemClick = async (item: AppNotification) => {
    if (item.is_read) return;
    try {
      await markRead(item.id);
      setItems((rows) => rows.map((r) => (r.id === item.id ? { ...r, is_read: true } : r)));
      setUnread((n) => Math.max(0, n - 1));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onMarkAll = async () => {
    try {
      await markAllRead();
      setItems((rows) => rows.map((r) => ({ ...r, is_read: true })));
      setUnread(0);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button
              type="button"
              onClick={() => void onMarkAll()}
              disabled={unread === 0}
              className="text-xs font-medium text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-4">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">You have no notifications.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void onItemClick(item)}
                      className={cn('block w-full px-4 py-3 text-left hover:bg-brand-50', !item.is_read && 'bg-brand-50/60')}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">{item.title}</span>
                        {!item.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600">{item.message}</span>
                      <span className="mt-1 block text-xs text-slate-400">{formatDateTime(item.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {viewAllPath && (
            <Link to={viewAllPath} onClick={close} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-brand-700 hover:bg-brand-50">
              View all notifications
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
