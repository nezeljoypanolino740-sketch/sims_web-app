import type { AuthError } from '@supabase/supabase-js';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/models';

function authErrorMessage(error: AuthError): string {
  const message = error.message.toLowerCase();
  if (message.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (message.includes('email not confirmed')) {
    return 'Your email is not verified yet. Open the verification email we sent you and try again.';
  }
  if (message.includes('user already registered')) {
    return 'An account with this email already exists. Sign in or reset your password.';
  }
  if (message.includes('rate limit') || error.status === 429) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (message.includes('same password')) return 'Choose a password different from your current one.';
  if (message.includes('password') && message.includes('weak')) return 'That password is too easy to guess. Choose a stronger one.';
  return getErrorMessage(error);
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(authErrorMessage(error));
}

export interface SignUpResult {
  /** True when Supabase is waiting for the person to click the link in their email. */
  needsEmailConfirmation: boolean;
}

/**
 * Public registration. The role is never sent: the database trigger always
 * creates the profile as role 'user', status 'pending'.
 */
export async function signUpStudent(input: { fullName: string; email: string; password: string }): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { full_name: input.fullName.trim() },
      emailRedirectTo: `${window.location.origin}/link-student`,
    },
  });
  if (error) throw new Error(authErrorMessage(error));

  // With email confirmation on, Supabase hides duplicates by returning a user with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Sign in or reset your password.');
  }
  return { needsEmailConfirmation: data.session === null };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(authErrorMessage(error));
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(authErrorMessage(error));
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(authErrorMessage(error));
}

/** Change password from Account Settings: the current password is verified first. */
export async function changePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) throw new Error('Your current password is incorrect.');
  await updatePassword(newPassword);
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateOwnName(userId: string, fullName: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim() })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}

/** Links the signed-in, email-verified student account to its school record. Returns the student id. */
export async function claimStudentRecord(studentNumber: string, dateOfBirth: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_student_record', {
    p_student_number: studentNumber.trim(),
    p_date_of_birth: dateOfBirth,
  });
  if (error) throw error;
  return data as string;
}
