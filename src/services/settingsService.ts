import { supabase } from '@/lib/supabase';
import type { SchoolSettings } from '@/types/models';

export async function getSchoolSettings(): Promise<SchoolSettings> {
  const { data, error } = await supabase.from('school_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data as SchoolSettings;
}

/** Administrator only (RLS). */
export async function updateSchoolSettings(
  changes: Pick<SchoolSettings, 'school_name' | 'address' | 'contact_email' | 'contact_phone'>,
): Promise<SchoolSettings> {
  const { data, error } = await supabase.from('school_settings').update(changes).eq('id', 1).select('*').single();
  if (error) throw error;
  return data as SchoolSettings;
}
