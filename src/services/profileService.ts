import { supabase } from '@/lib/supabase';
import { pageRange } from '@/utils/pagination';
import { sanitizeSearch } from '@/utils/search';
import type { AccountStatus, Paginated, Profile, Role } from '@/types/models';

export interface ProfileFilters {
  search?: string;
  role?: Role | 'all';
  status?: AccountStatus | 'all';
}

export async function listProfiles(filters: ProfileFilters, page: number, pageSize: number): Promise<Paginated<Profile>> {
  const [from, to] = pageRange(page, pageSize);
  let query = supabase.from('profiles').select('*', { count: 'exact' });
  const term = sanitizeSearch(filters.search ?? '');
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  if (filters.role && filters.role !== 'all') query = query.eq('role', filters.role);
  if (filters.status && filters.status !== 'all') query = query.eq('account_status', filters.status);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as Profile[], total: count ?? 0 };
}

/** The database trigger rejects changes to your own account and any change you are not allowed to make. */
export async function setAccountStatus(id: string, status: AccountStatus): Promise<void> {
  const { error } = await supabase.from('profiles').update({ account_status: status }).eq('id', id);
  if (error) throw error;
}

/** Administrator only (enforced by a database trigger). */
export async function setRole(id: string, role: Role): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}
