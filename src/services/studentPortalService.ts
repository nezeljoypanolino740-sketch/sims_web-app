import { supabase } from '@/lib/supabase';
import type { Attendance, Grade, Student } from '@/types/models';

/**
 * Everything here is read through the signed-in student's own session. Row Level
 * Security returns only that student's rows, so no other student's data can load
 * even if someone edits this code in the browser.
 */

export interface MyGrade extends Grade {
  subject_name: string;
  subject_code: string;
}

export interface MyAttendance extends Attendance {
  subject_name: string | null;
}

interface GradeRowRaw extends Grade {
  subjects: { subject_code: string; subject_name: string } | null;
}

interface AttendanceRowRaw extends Attendance {
  subjects: { subject_name: string } | null;
}

export async function getMyStudent(profileId: string): Promise<Student | null> {
  const { data, error } = await supabase.from('students').select('*').eq('profile_id', profileId).maybeSingle();
  if (error) throw error;
  return data as Student | null;
}

export async function listMyGrades(): Promise<MyGrade[]> {
  const { data, error } = await supabase
    .from('grades')
    .select('*, subjects(subject_code, subject_name)')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw error;
  return ((data ?? []) as unknown as GradeRowRaw[]).map(({ subjects, ...grade }) => ({
    ...grade,
    score: Number(grade.score),
    total_score: Number(grade.total_score),
    subject_name: subjects?.subject_name ?? 'Unknown subject',
    subject_code: subjects?.subject_code ?? '',
  }));
}

export async function listMyAttendance(): Promise<MyAttendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, subjects(subject_name)')
    .order('attendance_date', { ascending: false })
    .limit(2000);
  if (error) throw error;
  return ((data ?? []) as unknown as AttendanceRowRaw[]).map(({ subjects, ...row }) => ({
    ...row,
    subject_name: subjects?.subject_name ?? null,
  }));
}

/** Students can change only their phone and address, through a database function. */
export async function updateMyContact(phone: string, address: string): Promise<void> {
  const { error } = await supabase.rpc('update_my_contact', { p_phone: phone.trim(), p_address: address.trim() });
  if (error) throw error;
}
