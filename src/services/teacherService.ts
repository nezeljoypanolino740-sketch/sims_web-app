import { supabase } from '@/lib/supabase';
import { pageRange } from '@/utils/pagination';
import { sanitizeSearch } from '@/utils/search';
import type { EmploymentStatus, Paginated, Teacher, TeacherInput } from '@/types/models';

export interface TeacherFilters {
  search?: string;
  status?: EmploymentStatus | 'all';
}

export async function listTeachers(filters: TeacherFilters, page: number, pageSize: number): Promise<Paginated<Teacher>> {
  const [from, to] = pageRange(page, pageSize);
  let query = supabase.from('teachers').select('*', { count: 'exact' });
  const term = sanitizeSearch(filters.search ?? '');
  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,employee_number.ilike.%${term}%,email.ilike.%${term}%,specialization.ilike.%${term}%`,
    );
  }
  if (filters.status && filters.status !== 'all') query = query.eq('employment_status', filters.status);
  const { data, error, count } = await query.order('full_name').range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as Teacher[], total: count ?? 0 };
}

/** Active teachers for dropdowns. */
export async function listTeacherOptions(): Promise<Pick<Teacher, 'id' | 'full_name' | 'employee_number'>[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, full_name, employee_number')
    .eq('employment_status', 'active')
    .order('full_name')
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as Pick<Teacher, 'id' | 'full_name' | 'employee_number'>[];
}

export async function createTeacher(input: TeacherInput): Promise<Teacher> {
  const { data, error } = await supabase.from('teachers').insert(input).select('*').single();
  if (error) throw error;
  return data as Teacher;
}

export async function updateTeacher(id: string, input: TeacherInput): Promise<Teacher> {
  const { data, error } = await supabase.from('teachers').update(input).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Teacher;
}

export async function setTeacherStatus(id: string, status: EmploymentStatus): Promise<void> {
  const { error } = await supabase.from('teachers').update({ employment_status: status }).eq('id', id);
  if (error) throw error;
}

/** Administrator only (RLS). */
export async function deleteTeacher(id: string): Promise<void> {
  const { error } = await supabase.from('teachers').delete().eq('id', id);
  if (error) throw error;
}
