import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/types/models';

export interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  /** Only for role 'user': link the new login to this existing student record. */
  student_id?: string;
}

export interface CreatedUser {
  id: string;
  email: string;
  role: Role;
}

/**
 * Creates a login on the server through the `create-user` Edge Function,
 * which re-checks the caller's role with the service role key. The browser
 * never holds that key.
 */
export async function createUserAccount(input: CreateUserInput): Promise<CreatedUser> {
  const { data, error } = await supabase.functions.invoke<CreatedUser>('create-user', { body: input });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload: unknown = await error.context.json().catch(() => null);
      if (typeof payload === 'object' && payload !== null && 'error' in payload) {
        const message = (payload as { error: unknown }).error;
        if (typeof message === 'string') throw new Error(message);
      }
    }
    throw new Error('The account could not be created. Please try again.');
  }
  if (!data) throw new Error('The server returned an empty response.');
  return data;
}
