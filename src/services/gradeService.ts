import { supabase } from '@/lib/supabase';
import { pageRange } from '@/utils/pagination';
import type { Grade, GradeInput, Paginated } from '@/types/models';

export interface GradeFilters {
  studentId?: string;
  subjectId?: string;
  gradingPeriod?: string;
  schoolYear?: string;
}

export interface GradeRow extends Grade {
  students: { student_number: string; first_name: string; middle_name: string | null; last_name: string } | null;
  subjects: { subject_code: string; subject_name: string } | null;
  teachers: { full_name: string } | null;
}

const ROW_SELECT =
  '*, students(student_number, first_name, middle_name, last_name), subjects(subject_code, subject_name), teachers(full_name)';

export async function listGrades(filters: GradeFilters, page: number, pageSize: number): Promise<Paginated<GradeRow>> {
  const [from, to] = pageRange(page, pageSize);
  let query = supabase.from('grades').select(ROW_SELECT, { count: 'exact' });
  if (filters.studentId) query = query.eq('student_id', filters.studentId);
  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
  if (filters.gradingPeriod) query = query.eq('grading_period', filters.gradingPeriod);
  if (filters.schoolYear) query = query.eq('school_year', filters.schoolYear);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as GradeRow[], total: count ?? 0 };
}

export async function createGrade(input: GradeInput): Promise<Grade> {
  const { data, error } = await supabase.from('grades').insert(input).select('*').single();
  if (error) throw error;
  return data as Grade;
}

export async function updateGrade(id: string, input: GradeInput): Promise<Grade> {
  const { data, error } = await supabase.from('grades').update(input).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Grade;
}

/** Administrator only (RLS). */
export async function deleteGrade(id: string): Promise<void> {
  const { error } = await supabase.from('grades').delete().eq('id', id);
  if (error) throw error;
}
