import { supabase } from '@/lib/supabase';
import { pageRange } from '@/utils/pagination';
import type { Attendance, AttendanceStatus, Paginated } from '@/types/models';

export interface AttendanceFilters {
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  subjectId?: string;
  status?: AttendanceStatus | 'all';
}

export interface AttendanceRow extends Attendance {
  students: {
    student_number: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    grade_level: string;
    section: string | null;
  } | null;
  subjects: { subject_code: string; subject_name: string } | null;
}

export interface AttendanceEntry {
  student_id: string;
  subject_id: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string;
}

const ROW_SELECT =
  '*, students(student_number, first_name, middle_name, last_name, grade_level, section), subjects(subject_code, subject_name)';

export async function listAttendance(filters: AttendanceFilters, page: number, pageSize: number): Promise<Paginated<AttendanceRow>> {
  const [from, to] = pageRange(page, pageSize);
  let query = supabase.from('attendance').select(ROW_SELECT, { count: 'exact' });
  if (filters.dateFrom) query = query.gte('attendance_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('attendance_date', filters.dateTo);
  if (filters.studentId) query = query.eq('student_id', filters.studentId);
  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  const { data, error, count } = await query
    .order('attendance_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as AttendanceRow[], total: count ?? 0 };
}

/** Existing entries for a set of students on one date (and subject, or whole-day when null). */
export async function getAttendanceForDate(date: string, studentIds: string[], subjectId: string | null): Promise<Attendance[]> {
  if (studentIds.length === 0) return [];
  let query = supabase.from('attendance').select('*').eq('attendance_date', date).in('student_id', studentIds);
  query = subjectId ? query.eq('subject_id', subjectId) : query.is('subject_id', null);
  const { data, error } = await query.limit(1000);
  if (error) throw error;
  return (data ?? []) as Attendance[];
}

/** Inserts or updates a whole class at once (one entry per student, date and subject). */
export async function saveAttendance(entries: AttendanceEntry[]): Promise<number> {
  const { data, error } = await supabase.rpc('save_attendance', { p_entries: entries });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function updateAttendance(id: string, changes: { status: AttendanceStatus; remarks: string | null }): Promise<void> {
  const { error } = await supabase.from('attendance').update(changes).eq('id', id);
  if (error) throw error;
}

/** Administrator only (RLS). Admins correct mistakes by editing the entry. */
export async function deleteAttendance(id: string): Promise<void> {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) throw error;
}
