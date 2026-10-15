import type {
  AccountStatus,
  AttendanceStatus,
  EmploymentStatus,
  EnrollmentStatus,
  Gender,
  Role,
  Semester,
} from '@/types/models';

export const ROLES: readonly Role[] = ['administrator', 'admin', 'user'];

export const ROLE_LABELS: Record<Role, string> = {
  administrator: 'Administrator',
  admin: 'Admin',
  user: 'Student',
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  administrator: '/administrator',
  admin: '/admin',
  user: '/student',
};

export const ACCOUNT_STATUSES: readonly AccountStatus[] = ['active', 'inactive', 'pending'];
export const ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = [
  'enrolled',
  'pending',
  'graduated',
  'dropped',
  'archived',
];
export const EMPLOYMENT_STATUSES: readonly EmploymentStatus[] = ['active', 'on_leave', 'inactive'];
export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
export const GENDERS: readonly Gender[] = ['male', 'female', 'other'];
export const SEMESTERS: readonly Semester[] = ['1st Semester', '2nd Semester', 'Summer'];

export const GRADING_PERIODS = ['Prelim', 'Midterm', 'Prefinal', 'Final'] as const;

export const PAGE_SIZE = 10;
export const SCHOOL_YEAR_PATTERN = /^\d{4}-\d{4}$/;
