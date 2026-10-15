/**
 * Row types that mirror supabase/migrations/20261011000000_sims_schema.sql
 * column for column. Dates and timestamps arrive from PostgREST as ISO strings.
 */

export type Role = 'administrator' | 'admin' | 'user';
export type AccountStatus = 'active' | 'inactive' | 'pending';
export type Gender = 'male' | 'female' | 'other';
export type EnrollmentStatus = 'enrolled' | 'pending' | 'graduated' | 'dropped' | 'archived';
export type EmploymentStatus = 'active' | 'on_leave' | 'inactive';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type Semester = '1st Semester' | '2nd Semester' | 'Summer';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  student_number: string;
  profile_id: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string;
  gender: Gender | null;
  email: string;
  phone: string | null;
  address: string | null;
  grade_level: string;
  section: string | null;
  school_year: string;
  enrollment_status: EnrollmentStatus;
  created_at: string;
  updated_at: string;
}

export type StudentInput = Omit<Student, 'id' | 'profile_id' | 'created_at' | 'updated_at'>;

export interface Teacher {
  id: string;
  profile_id: string | null;
  employee_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  employment_status: EmploymentStatus;
  created_at: string;
  updated_at: string;
}

export type TeacherInput = Omit<Teacher, 'id' | 'profile_id' | 'created_at' | 'updated_at'>;

export interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  description: string | null;
  created_at: string;
}

export type SubjectInput = Omit<Subject, 'id' | 'created_at'>;

export interface AcademicYear {
  id: string;
  school_year: string;
  semester: Semester;
  is_active: boolean;
  created_at: string;
}

export type AcademicYearInput = Omit<AcademicYear, 'id' | 'created_at'>;

export interface Attendance {
  id: string;
  student_id: string;
  subject_id: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
  recorded_by: string | null;
  created_at: string;
}

export type AttendanceInput = Omit<Attendance, 'id' | 'recorded_by' | 'created_at'>;

export interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  teacher_id: string | null;
  grading_period: string;
  school_year: string;
  assessment_name: string;
  score: number;
  total_score: number;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GradeInput = Omit<Grade, 'id' | 'created_by' | 'created_at' | 'updated_at'>;

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SchoolSettings {
  id: 1;
  school_name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  updated_at: string;
}

/** Shape returned by the get_dashboard_stats() database function. */
export interface AttendanceTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  actor_name: string | null;
}

export interface DashboardStats {
  total_students: number;
  total_teachers: number;
  active_accounts: number;
  average_grade: number | null;
  attendance_by_status: Partial<Record<AttendanceStatus, number>>;
  attendance_trend: AttendanceTrendPoint[];
  grade_by_subject: { subject: string; average: number }[];
  enrollment_by_grade_level: { grade_level: string; total: number }[];
  recent_activities: RecentActivity[];
}

export interface Paginated<T> {
  rows: T[];
  total: number;
}
