import { supabase } from '@/lib/supabase';
import { pageRange } from '@/utils/pagination';
import { sanitizeSearch } from '@/utils/search';
import type { Paginated, Subject, SubjectInput } from '@/types/models';

export async function listSubjects(search: string, page: number, pageSize: number): Promise<Paginated<Subject>> {
  const [from, to] = pageRange(page, pageSize);
  let query = supabase.from('subjects').select('*', { count: 'exact' });
  const term = sanitizeSearch(search);
  if (term) query = query.or(`subject_code.ilike.%${term}%,subject_name.ilike.%${term}%`);
  const { data, error, count } = await query.order('subject_code').range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as Subject[], total: count ?? 0 };
}

export async function listAllSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from('subjects').select('*').order('subject_name').limit(1000);
  if (error) throw error;
  return (data ?? []) as Subject[];
}

export async function createSubject(input: SubjectInput): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').insert(input).select('*').single();
  if (error) throw error;
  return data as Subject;
}

export async function updateSubject(id: string, input: SubjectInput): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').update(input).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Subject;
}

/** Administrator only (RLS). Fails while grades still use the subject. */
export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
}
