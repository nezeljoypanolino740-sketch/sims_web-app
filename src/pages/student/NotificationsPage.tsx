import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { deleteNotification, listNotifications, markAllRead, markRead } from '@/services/notificationService';
import type { AppNotification } from '@/types/models';
import { formatDateTime } from '@/utils/format';

const PER_PAGE = 10;

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<AppNotification | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsyncData(() => listNotifications(page, PER_PAGE), [page]);

  const rows = data?.rows ?? [];
  const unread = rows.filter((n) => !n.is_read).length;

  const run = async (action: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await action();
      if (success) toast.success(success);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates from your school, such as newly posted grades."
        actions={
          <Button variant="secondary" disabled={busy || unread === 0} onClick={() => void run(markAllRead, 'All notifications marked as read')}>
            <Check className="h-4 w-4" aria-hidden="true" /> Mark all as read
          </Button>
        }
      />

      {error && (
        <div className="mb-6 space-y-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading && !data ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 && !error ? (
          <EmptyState title="You have no notifications" description="New grades and school updates will show up here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((n) => (
              <li key={n.id} className={cn('flex items-start justify-between gap-4 px-5 py-4', !n.is_read && 'bg-brand-50/60')}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-slate-900">
                    {n.title}
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Unread" />}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {!n.is_read && <IconButton icon={Check} label="Mark as read" disabled={busy} onClick={() => void run(() => markRead(n.id))} />}
                  <IconButton icon={Trash2} tone="danger" label="Delete notification" disabled={busy} onClick={() => setToDelete(n)} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && data.total > PER_PAGE && <Pagination page={page} pageSize={PER_PAGE} total={data.total} onPageChange={setPage} />}
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete notification"
        message="Delete this notification? This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteNotification(toDelete.id);
          toast.success('Notification deleted');
          setToDelete(null);
          if (rows.length === 1 && page > 1) setPage(page - 1);
          else reload();
        }}
      />
    </>
  );
}
