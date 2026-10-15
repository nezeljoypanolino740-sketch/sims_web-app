import { describe, expect, it } from 'vitest';
import {
  academicYearSchema,
  gradeSchema,
  schoolSettingsSchema,
  studentFormDefaults,
  studentSchema,
  toGradeInput,
  toStudentInput,
  type GradeFormValues,
  type StudentFormValues,
} from './entities';

const validStudent: StudentFormValues = {
  ...studentFormDefaults,
  student_number: ' 2026-0001 ',
  first_name: 'Ana',
  last_name: 'Cruz',
  date_of_birth: '2010-03-04',
  email: 'Ana@School.edu',
  grade_level: 'Grade 7',
  school_year: '2026-2027',
};

const validGrade: GradeFormValues = {
  student_id: 's1',
  subject_id: 'sub1',
  teacher_id: '',
  grading_period: 'Prelim',
  school_year: '2026-2027',
  assessment_name: 'Quiz 1',
  score: '8',
  total_score: '10',
  remarks: '',
};

describe('student form', () => {
  it('accepts a valid student and normalises it for the database', () => {
    const parsed = studentSchema.safeParse(validStudent);
    expect(parsed.success).toBe(true);
    const input = toStudentInput(validStudent);
    expect(input.student_number).toBe('2026-0001');
    expect(input.email).toBe('ana@school.edu');
    expect(input.middle_name).toBeNull();
    expect(input.gender).toBeNull();
  });

  it('rejects a bad school year and a future birth date', () => {
    expect(studentSchema.safeParse({ ...validStudent, school_year: '2026-2028' }).success).toBe(false);
    expect(studentSchema.safeParse({ ...validStudent, school_year: '2026' }).success).toBe(false);
    expect(studentSchema.safeParse({ ...validStudent, date_of_birth: '2999-01-01' }).success).toBe(false);
  });
});

describe('grade form', () => {
  it('converts text numbers to numbers', () => {
    expect(gradeSchema.safeParse(validGrade).success).toBe(true);
    const input = toGradeInput(validGrade);
    expect(input.score).toBe(8);
    expect(input.total_score).toBe(10);
    expect(input.teacher_id).toBeNull();
  });

  it('rejects a score above the total or below zero', () => {
    expect(gradeSchema.safeParse({ ...validGrade, score: '11' }).success).toBe(false);
    expect(gradeSchema.safeParse({ ...validGrade, score: '-1' }).success).toBe(false);
    expect(gradeSchema.safeParse({ ...validGrade, total_score: '0' }).success).toBe(false);
    expect(gradeSchema.safeParse({ ...validGrade, score: 'abc' }).success).toBe(false);
  });
});

describe('other forms', () => {
  it('validates academic years', () => {
    expect(academicYearSchema.safeParse({ school_year: '2026-2027', semester: '1st Semester' }).success).toBe(true);
    expect(academicYearSchema.safeParse({ school_year: '2026-2027', semester: 'Fall' }).success).toBe(false);
  });

  it('allows an empty contact email but not a malformed one', () => {
    const base = { school_name: 'Sample School', address: '', contact_phone: '' };
    expect(schoolSettingsSchema.safeParse({ ...base, contact_email: '' }).success).toBe(true);
    expect(schoolSettingsSchema.safeParse({ ...base, contact_email: 'nope' }).success).toBe(false);
  });
});
