import { supabase } from '@/lib/supabase';
import { pageRange } from '@/utils/pagination';
import type { AppNotification, Paginated } from '@/types/models';

/** Lets the bell in the top bar refresh its unread count after changes made on the Notifications page. */
export const NOTIFICATIONS_CHANGED = 'sims:notifications-changed';
function announceChange(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}

export async function listNotifications(page: number, pageSize: number): Promise<Paginated<AppNotification>> {
  const [from, to] = pageRange(page, pageSize);
  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as AppNotification[], total: count ?? 0 };
}

export async function countUnread(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
  announceChange();
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  if (error) throw error;
  announceChange();
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
  announceChange();
}
