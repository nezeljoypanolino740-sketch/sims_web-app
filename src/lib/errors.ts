/**
 * Turns any error thrown by Supabase (Postgrest, Auth, Functions) or by our
 * own code into a message that is safe and useful to show to a person.
 */

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  status?: unknown;
}

const POSTGRES_MESSAGES: Record<string, string> = {
  '23505': 'That record already exists. Check for a duplicate value and try again.',
  '23503': 'This record is linked to other data, so the change is not allowed.',
  '23502': 'A required field is missing.',
  '23514': 'One of the values is not allowed. Check the form and try again.',
  '22001': 'One of the values is too long.',
  '22P02': 'One of the values has the wrong format.',
  '42501': 'You do not have permission to do that.',
  PGRST301: 'Your session has expired. Please sign in again.',
  PGRST116: 'The record could not be found.',
};

const DUPLICATES: readonly (readonly [string, string])[] = [
  ['students_student_number_key', 'A student with that student number already exists.'],
  ['students_email_key', 'A student with that email already exists.'],
  ['teachers_employee_number_key', 'A teacher with that employee number already exists.'],
  ['teachers_email_key', 'A teacher with that email already exists.'],
  ['subjects_subject_code_key', 'A subject with that code already exists.'],
  ['academic_years_school_year_semester_key', 'That school year and semester already exists.'],
  ['attendance_unique_entry', 'Attendance for that student, date and subject already exists.'],
  ['profiles_email_key', 'An account with that email already exists.'],
  ['grades_score_within_total', 'The score cannot be higher than the total score.'],
];

function knownConstraintMessage(message: string): string | undefined {
  for (const [name, text] of DUPLICATES) if (message.includes(name)) return text;
  if (message.includes('update or delete on table') && message.includes('foreign key constraint')) {
    return 'This record is still used by other records (such as grades or attendance), so it cannot be deleted. Archive it instead.';
  }
  return undefined;
}

export function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (!isErrorLike(error)) return fallback;

  const code = typeof error.code === 'string' ? error.code : undefined;
  const message = typeof error.message === 'string' ? error.message : undefined;

  if (message?.startsWith('new row violates row-level security')) {
    return POSTGRES_MESSAGES['42501'] ?? fallback;
  }
  const known = message ? knownConstraintMessage(message) : undefined;
  if (known) return known;
  // Messages raised by our own SQL functions are already written for people.
  if (code === 'P0002' || code === '28000' || code === '42501') {
    if (message) return message;
  }
  if (code && POSTGRES_MESSAGES[code]) return POSTGRES_MESSAGES[code] ?? fallback;
  if (message?.toLowerCase().includes('jwt expired')) return POSTGRES_MESSAGES['PGRST301'] ?? fallback;
  if (message?.toLowerCase().includes('failed to fetch')) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }
  return message && message.trim() ? message : fallback;
}

/** True when the error means the session is gone and the user must sign in again. */
export function isSessionExpired(error: unknown): boolean {
  if (!isErrorLike(error)) return false;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    error.code === 'PGRST301' ||
    error.status === 401 ||
    message.includes('jwt expired') ||
    message.includes('invalid jwt') ||
    message.includes('refresh token')
  );
}
