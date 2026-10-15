import { supabase } from '@/lib/supabase';
import { pageRange } from '@/utils/pagination';
import type { AttendanceStatus } from '@/types/models';

export interface ReportFilters {
  schoolYear?: string;
  gradeLevel?: string;
  section?: string;
  /** Exact student number (the "student ID" filter). */
  studentNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  gradingPeriod?: string;
  subjectId?: string;
}

export interface AttendanceReportRow {
  student_number: string;
  student_name: string;
  grade_level: string;
  section: string | null;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  attendance_rate: number | null;
}

export interface GradeReportRow {
  student_number: string;
  student_name: string;
  grade_level: string;
  section: string | null;
  subject_name: string;
  grading_period: string;
  school_year: string;
  assessment_name: string;
  score: number;
  total_score: number;
  percentage: number;
}

interface RawAttendance {
  status: AttendanceStatus;
  students: {
    student_number: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    grade_level: string;
    section: string | null;
    school_year: string;
  };
}

interface RawGrade {
  grading_period: string;
  school_year: string;
  assessment_name: string;
  score: number;
  total_score: number;
  students: RawAttendance['students'];
  subjects: { subject_name: string } | null;
}

const BATCH = 1000;
const MAX_ROWS = 20000;

function nameOf(s: RawAttendance['students']): string {
  return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ');
}

export async function fetchAttendanceReport(filters: ReportFilters): Promise<AttendanceReportRow[]> {
  const raw: RawAttendance[] = [];
  for (let page = 1; raw.length < MAX_ROWS; page += 1) {
    const [from, to] = pageRange(page, BATCH);
    let query = supabase
      .from('attendance')
      .select('status, students!inner(student_number, first_name, middle_name, last_name, grade_level, section, school_year)');
    if (filters.dateFrom) query = query.gte('attendance_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('attendance_date', filters.dateTo);
    if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
    if (filters.schoolYear) query = query.eq('students.school_year', filters.schoolYear);
    if (filters.gradeLevel) query = query.eq('students.grade_level', filters.gradeLevel);
    if (filters.section) query = query.eq('students.section', filters.section);
    if (filters.studentNumber) query = query.eq('students.student_number', filters.studentNumber);
    const { data, error } = await query.order('attendance_date').order('id').range(from, to);
    if (error) throw error;
    const rows = (data ?? []) as unknown as RawAttendance[];
    raw.push(...rows);
    if (rows.length < BATCH) break;
  }

  const byStudent = new Map<string, AttendanceReportRow>();
  for (const row of raw) {
    const s = row.students;
    let entry = byStudent.get(s.student_number);
    if (!entry) {
      entry = {
        student_number: s.student_number,
        student_name: nameOf(s),
        grade_level: s.grade_level,
        section: s.section,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        attendance_rate: null,
      };
      byStudent.set(s.student_number, entry);
    }
    entry[row.status] += 1;
    entry.total += 1;
  }

  return [...byStudent.values()]
    .map((e) => ({
      ...e,
      // Late counts as attended; excused days are left out of the rate.
      attendance_rate: e.total - e.excused > 0 ? ((e.present + e.late) / (e.total - e.excused)) * 100 : null,
    }))
    .sort((a, b) => a.student_name.localeCompare(b.student_name));
}

export async function fetchGradeReport(filters: ReportFilters): Promise<GradeReportRow[]> {
  const raw: RawGrade[] = [];
  for (let page = 1; raw.length < MAX_ROWS; page += 1) {
    const [from, to] = pageRange(page, BATCH);
    let query = supabase
      .from('grades')
      .select(
        'grading_period, school_year, assessment_name, score, total_score, students!inner(student_number, first_name, middle_name, last_name, grade_level, section, school_year), subjects(subject_name)',
      );
    if (filters.schoolYear) query = query.eq('school_year', filters.schoolYear);
    if (filters.gradingPeriod) query = query.eq('grading_period', filters.gradingPeriod);
    if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
    if (filters.gradeLevel) query = query.eq('students.grade_level', filters.gradeLevel);
    if (filters.section) query = query.eq('students.section', filters.section);
    if (filters.studentNumber) query = query.eq('students.student_number', filters.studentNumber);
    const { data, error } = await query.order('created_at').order('id').range(from, to);
    if (error) throw error;
    const rows = (data ?? []) as unknown as RawGrade[];
    raw.push(...rows);
    if (rows.length < BATCH) break;
  }

  return raw
    .map((g) => ({
      student_number: g.students.student_number,
      student_name: nameOf(g.students),
      grade_level: g.students.grade_level,
      section: g.students.section,
      subject_name: g.subjects?.subject_name ?? '-',
      grading_period: g.grading_period,
      school_year: g.school_year,
      assessment_name: g.assessment_name,
      score: Number(g.score),
      total_score: Number(g.total_score),
      percentage: Number(g.total_score) > 0 ? (Number(g.score) / Number(g.total_score)) * 100 : 0,
    }))
    .sort((a, b) => a.student_name.localeCompare(b.student_name) || a.subject_name.localeCompare(b.subject_name));
}
