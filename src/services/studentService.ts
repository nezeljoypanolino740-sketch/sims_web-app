import { supabase } from '@/lib/supabase';
import { pageRange } from '@/utils/pagination';
import { sanitizeSearch } from '@/utils/search';
import type { EnrollmentStatus, Paginated, Student, StudentInput } from '@/types/models';

export interface StudentFilters {
  search?: string;
  schoolYear?: string;
  gradeLevel?: string;
  section?: string;
  /** Omit to hide archived students; 'all' shows everyone. */
  status?: EnrollmentStatus | 'all';
}

export type StudentOption = Pick<
  Student,
  'id' | 'student_number' | 'first_name' | 'middle_name' | 'last_name' | 'grade_level' | 'section'
>;

const OPTION_COLUMNS = 'id, student_number, first_name, middle_name, last_name, grade_level, section';

function studentsQuery(filters: StudentFilters) {
  let query = supabase.from('students').select('*', { count: 'exact' });

  const term = sanitizeSearch(filters.search ?? '');
  if (term) {
    query = query.or(
      `student_number.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }
  if (filters.schoolYear) query = query.eq('school_year', filters.schoolYear);
  if (filters.gradeLevel) query = query.eq('grade_level', filters.gradeLevel);
  if (filters.section) query = query.eq('section', filters.section);

  if (filters.status === undefined) query = query.neq('enrollment_status', 'archived');
  else if (filters.status !== 'all') query = query.eq('enrollment_status', filters.status);

  return query.order('last_name').order('first_name');
}

export async function listStudents(filters: StudentFilters, page: number, pageSize: number): Promise<Paginated<Student>> {
  const [from, to] = pageRange(page, pageSize);
  const { data, error, count } = await studentsQuery(filters).range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as Student[], total: count ?? 0 };
}

/** Every student matching the filters (for reports/exports), fetched in batches. */
export async function listAllStudents(filters: StudentFilters, limit = 10000): Promise<Student[]> {
  const batch = 1000;
  const all: Student[] = [];
  for (let page = 1; all.length < limit; page += 1) {
    const [from, to] = pageRange(page, batch);
    const { data, error } = await studentsQuery(filters).range(from, to);
    if (error) throw error;
    const rows = (data ?? []) as Student[];
    all.push(...rows);
    if (rows.length < batch) break;
  }
  return all;
}

export async function getStudent(id: string): Promise<Student> {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Student;
}

export async function createStudent(input: StudentInput): Promise<Student> {
  const { data, error } = await supabase.from('students').insert(input).select('*').single();
  if (error) throw error;
  return data as Student;
}

export async function updateStudent(id: string, input: StudentInput): Promise<Student> {
  const { data, error } = await supabase.from('students').update(input).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Student;
}

/** Archiving keeps all grades and attendance. Prefer this over deleting. */
export async function setStudentStatus(id: string, status: EnrollmentStatus): Promise<void> {
  const { error } = await supabase.from('students').update({ enrollment_status: status }).eq('id', id);
  if (error) throw error;
}

/** Administrator only (RLS). Fails when the student still has grades or attendance. */
export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

export async function searchStudentOptions(term: string): Promise<StudentOption[]> {
  const clean = sanitizeSearch(term);
  let query = supabase.from('students').select(OPTION_COLUMNS).neq('enrollment_status', 'archived');
  if (clean) {
    query = query.or(`student_number.ilike.%${clean}%,first_name.ilike.%${clean}%,last_name.ilike.%${clean}%`);
  }
  const { data, error } = await query.order('last_name').limit(20);
  if (error) throw error;
  return (data ?? []) as StudentOption[];
}

/** Enrolled students of one class, for taking attendance. */
export async function listClassStudents(gradeLevel: string, section: string, schoolYear: string): Promise<StudentOption[]> {
  let query = supabase
    .from('students')
    .select(OPTION_COLUMNS)
    .eq('enrollment_status', 'enrolled')
    .eq('grade_level', gradeLevel)
    .eq('school_year', schoolYear);
  query = section ? query.eq('section', section) : query.is('section', null);
  const { data, error } = await query.order('last_name').order('first_name').limit(1000);
  if (error) throw error;
  return (data ?? []) as StudentOption[];
}

export interface ClassOptions {
  gradeLevels: string[];
  sections: string[];
  schoolYears: string[];
}

/** Distinct values used by filter dropdowns. */
export async function getClassOptions(): Promise<ClassOptions> {
  const { data, error } = await supabase.from('students').select('grade_level, section, school_year').limit(5000);
  if (error) throw error;
  const rows = (data ?? []) as Pick<Student, 'grade_level' | 'section' | 'school_year'>[];
  const unique = (values: (string | null)[]): string[] =>
    [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return {
    gradeLevels: unique(rows.map((r) => r.grade_level)),
    sections: unique(rows.map((r) => r.section)),
    schoolYears: unique(rows.map((r) => r.school_year)).reverse(),
  };
}
