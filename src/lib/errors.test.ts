import { describe, expect, it } from 'vitest';
import { getErrorMessage, isSessionExpired } from './errors';

describe('getErrorMessage', () => {
  it('explains duplicate student numbers', () => {
    const error = { code: '23505', message: 'duplicate key value violates unique constraint "students_student_number_key"' };
    expect(getErrorMessage(error)).toBe('A student with that student number already exists.');
  });

  it('explains blocked deletes', () => {
    const error = {
      code: '23503',
      message: 'update or delete on table "students" violates foreign key constraint "grades_student_id_fkey" on table "grades"',
    };
    expect(getErrorMessage(error)).toContain('Archive it instead');
  });

  it('turns row-level-security failures into a permission message', () => {
    const error = { code: '42501', message: 'new row violates row-level security policy for table "students"' };
    expect(getErrorMessage(error)).toBe('You do not have permission to do that.');
  });

  it('keeps messages written by our own SQL functions', () => {
    const error = { code: 'P0002', message: 'We could not verify these details.' };
    expect(getErrorMessage(error)).toBe('We could not verify these details.');
  });

  it('falls back for unknown values and detects expired sessions', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(isSessionExpired({ message: 'JWT expired' })).toBe(true);
    expect(isSessionExpired({ message: 'other' })).toBe(false);
  });
});
