import { supabase } from '@/lib/supabase';
import type { ActivityLog, DashboardStats, Paginated } from '@/types/models';
import { pageRange } from '@/utils/pagination';

/** All numbers are computed by the get_dashboard_stats() database function. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) throw error;
  return data as DashboardStats;
}

export interface ActivityLogRow extends ActivityLog {
  profiles: { full_name: string } | null;
}

/** Administrator only (RLS). */
export async function listActivityLogs(page: number, pageSize: number, entityType?: string): Promise<Paginated<ActivityLogRow>> {
  const [from, to] = pageRange(page, pageSize);
  let query = supabase.from('activity_logs').select('*, profiles(full_name)', { count: 'exact' });
  if (entityType) query = query.eq('entity_type', entityType);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as ActivityLogRow[], total: count ?? 0 };
}
