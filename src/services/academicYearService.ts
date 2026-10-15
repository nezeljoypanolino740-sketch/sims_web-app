import { supabase } from '@/lib/supabase';
import type { AcademicYear, AcademicYearInput } from '@/types/models';

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .order('school_year', { ascending: false })
    .order('semester');
  if (error) throw error;
  return (data ?? []) as AcademicYear[];
}

export async function getActiveAcademicYear(): Promise<AcademicYear | null> {
  const { data, error } = await supabase.from('academic_years').select('*').eq('is_active', true).maybeSingle();
  if (error) throw error;
  return data as AcademicYear | null;
}

export async function createAcademicYear(input: AcademicYearInput): Promise<AcademicYear> {
  const { data, error } = await supabase.from('academic_years').insert(input).select('*').single();
  if (error) throw error;
  return data as AcademicYear;
}

/** Makes this term the only active one (database function, one transaction). */
export async function setActiveAcademicYear(id: string): Promise<void> {
  const { error } = await supabase.rpc('set_active_academic_year', { p_id: id });
  if (error) throw error;
}

/** Administrator only (RLS). */
export async function deleteAcademicYear(id: string): Promise<void> {
  const { error } = await supabase.from('academic_years').delete().eq('id', id);
  if (error) throw error;
}
