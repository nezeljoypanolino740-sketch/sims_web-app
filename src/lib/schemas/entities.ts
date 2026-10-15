import { z } from 'zod';
import { passwordRule } from '@/lib/schemas/auth';
import type {
  AcademicYearInput,
  Grade,
  GradeInput,
  SchoolSettings,
  Student,
  StudentInput,
  Subject,
  SubjectInput,
  Teacher,
  TeacherInput,
} from '@/types/models';

const required = (label: string, max = 100) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);

const optional = (label: string, max = 200) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`);

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

const optionalEmail = z
  .string()
  .trim()
  .max(254, 'Email is too long')
  .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email address');

export const schoolYearRule = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{4}$/, 'Use the format 2026-2027')
  .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, 'The second year must follow the first');

function isPastDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value) < new Date();
}

export const emptyToNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());

/* ------------------------------ students ------------------------------ */

export const studentSchema = z.object({
  student_number: required('Student number', 50),
  first_name: required('First name'),
  middle_name: optional('Middle name', 100),
  last_name: required('Last name'),
  date_of_birth: z.string().refine(isPastDate, 'Enter a valid date of birth'),
  gender: z.enum(['', 'male', 'female', 'other']),
  email,
  phone: optional('Phone', 30),
  address: optional('Address', 300),
  grade_level: required('Grade level', 50),
  section: optional('Section', 50),
  school_year: schoolYearRule,
  enrollment_status: z.enum(['enrolled', 'pending', 'graduated', 'dropped', 'archived']),
});
export type StudentFormValues = z.infer<typeof studentSchema>;

export const studentFormDefaults: StudentFormValues = {
  student_number: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  email: '',
  phone: '',
  address: '',
  grade_level: '',
  section: '',
  school_year: '',
  enrollment_status: 'enrolled',
};

export function studentToForm(s: Student): StudentFormValues {
  return {
    student_number: s.student_number,
    first_name: s.first_name,
    middle_name: s.middle_name ?? '',
    last_name: s.last_name,
    date_of_birth: s.date_of_birth,
    gender: s.gender ?? '',
    email: s.email,
    phone: s.phone ?? '',
    address: s.address ?? '',
    grade_level: s.grade_level,
    section: s.section ?? '',
    school_year: s.school_year,
    enrollment_status: s.enrollment_status,
  };
}

export function toStudentInput(v: StudentFormValues): StudentInput {
  return {
    student_number: v.student_number.trim(),
    first_name: v.first_name.trim(),
    middle_name: emptyToNull(v.middle_name),
    last_name: v.last_name.trim(),
    date_of_birth: v.date_of_birth,
    gender: v.gender === '' ? null : v.gender,
    email: v.email.trim().toLowerCase(),
    phone: emptyToNull(v.phone),
    address: emptyToNull(v.address),
    grade_level: v.grade_level.trim(),
    section: emptyToNull(v.section),
    school_year: v.school_year.trim(),
    enrollment_status: v.enrollment_status,
  };
}

/* ------------------------------ teachers ------------------------------ */

export const teacherSchema = z.object({
  employee_number: required('Employee number', 50),
  full_name: required('Full name'),
  email,
  phone: optional('Phone', 30),
  specialization: optional('Specialization', 100),
  employment_status: z.enum(['active', 'on_leave', 'inactive']),
});
export type TeacherFormValues = z.infer<typeof teacherSchema>;

export const teacherFormDefaults: TeacherFormValues = {
  employee_number: '',
  full_name: '',
  email: '',
  phone: '',
  specialization: '',
  employment_status: 'active',
};

export function teacherToForm(t: Teacher): TeacherFormValues {
  return {
    employee_number: t.employee_number,
    full_name: t.full_name,
    email: t.email,
    phone: t.phone ?? '',
    specialization: t.specialization ?? '',
    employment_status: t.employment_status,
  };
}

export function toTeacherInput(v: TeacherFormValues): TeacherInput {
  return {
    employee_number: v.employee_number.trim(),
    full_name: v.full_name.trim(),
    email: v.email.trim().toLowerCase(),
    phone: emptyToNull(v.phone),
    specialization: emptyToNull(v.specialization),
    employment_status: v.employment_status,
  };
}

/* ------------------------------ subjects ------------------------------ */

export const subjectSchema = z.object({
  subject_code: required('Subject code', 30),
  subject_name: required('Subject name'),
  description: optional('Description', 500),
});
export type SubjectFormValues = z.infer<typeof subjectSchema>;

export const subjectFormDefaults: SubjectFormValues = { subject_code: '', subject_name: '', description: '' };

export function subjectToForm(s: Subject): SubjectFormValues {
  return { subject_code: s.subject_code, subject_name: s.subject_name, description: s.description ?? '' };
}

export function toSubjectInput(v: SubjectFormValues): SubjectInput {
  return {
    subject_code: v.subject_code.trim().toUpperCase(),
    subject_name: v.subject_name.trim(),
    description: emptyToNull(v.description),
  };
}

/* --------------------------- academic years --------------------------- */

export const academicYearSchema = z.object({
  school_year: schoolYearRule,
  semester: z.enum(['1st Semester', '2nd Semester', 'Summer']),
});
export type AcademicYearFormValues = z.infer<typeof academicYearSchema>;

export function toAcademicYearInput(v: AcademicYearFormValues): AcademicYearInput {
  return { school_year: v.school_year.trim(), semester: v.semester, is_active: false };
}

/* -------------------------------- grades ------------------------------- */

const numberText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => Number.isFinite(Number(v)), `${label} must be a number`);

export const gradeSchema = z
  .object({
    student_id: z.string().min(1, 'Choose a student'),
    subject_id: z.string().min(1, 'Choose a subject'),
    teacher_id: z.string(),
    grading_period: required('Grading period', 50),
    school_year: schoolYearRule,
    assessment_name: required('Assessment name'),
    score: numberText('Score'),
    total_score: numberText('Total score'),
    remarks: optional('Remarks', 300),
  })
  .superRefine((v, ctx) => {
    const score = Number(v.score);
    const total = Number(v.total_score);
    if (score < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['score'], message: 'Score cannot be negative' });
    if (total <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['total_score'], message: 'Total score must be greater than 0' });
    if (total > 0 && score > total) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['score'], message: 'Score cannot be higher than the total score' });
    }
  });
export type GradeFormValues = z.infer<typeof gradeSchema>;

export const gradeFormDefaults: GradeFormValues = {
  student_id: '',
  subject_id: '',
  teacher_id: '',
  grading_period: '',
  school_year: '',
  assessment_name: '',
  score: '',
  total_score: '',
  remarks: '',
};

export function gradeToForm(g: Grade): GradeFormValues {
  return {
    student_id: g.student_id,
    subject_id: g.subject_id,
    teacher_id: g.teacher_id ?? '',
    grading_period: g.grading_period,
    school_year: g.school_year,
    assessment_name: g.assessment_name,
    score: String(g.score),
    total_score: String(g.total_score),
    remarks: g.remarks ?? '',
  };
}

export function toGradeInput(v: GradeFormValues): GradeInput {
  return {
    student_id: v.student_id,
    subject_id: v.subject_id,
    teacher_id: emptyToNull(v.teacher_id),
    grading_period: v.grading_period.trim(),
    school_year: v.school_year.trim(),
    assessment_name: v.assessment_name.trim(),
    score: Number(v.score),
    total_score: Number(v.total_score),
    remarks: emptyToNull(v.remarks),
  };
}

/* ---------------------------- school settings --------------------------- */

export const schoolSettingsSchema = z.object({
  school_name: required('School name', 150),
  address: optional('Address', 300),
  contact_email: optionalEmail,
  contact_phone: optional('Phone', 30),
});
export type SchoolSettingsFormValues = z.infer<typeof schoolSettingsSchema>;

export function settingsToForm(s: SchoolSettings): SchoolSettingsFormValues {
  return {
    school_name: s.school_name,
    address: s.address ?? '',
    contact_email: s.contact_email ?? '',
    contact_phone: s.contact_phone ?? '',
  };
}

/* ------------------------------ user accounts --------------------------- */

export const createUserSchema = z.object({
  full_name: required('Full name'),
  email,
  password: passwordRule,
  role: z.enum(['administrator', 'admin', 'user']),
  student_id: z.string(),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const profileNameSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(100, 'Name is too long'),
});
export type ProfileNameValues = z.infer<typeof profileNameSchema>;

export const studentAccountSchema = z.object({ password: passwordRule });
export type StudentAccountValues = z.infer<typeof studentAccountSchema>;

export const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(30, 'Phone must be 30 characters or fewer')
    .regex(/^[0-9+()\-\s]*$/, 'Use digits, spaces and + - ( ) only'),
  address: optional('Address', 300),
});
export type ContactFormValues = z.infer<typeof contactSchema>;
