import { ROLE_HOME } from '@/lib/constants';
import type { Profile } from '@/types/models';

export type AccessResult =
  | { status: 'ok'; home: string }
  | { status: 'needs-student-link' }
  | { status: 'blocked'; reason: 'inactive' | 'pending' };

/**
 * Decides what a signed-in person may do, from their profile alone.
 * The database enforces the same rule (a non-active account has no role),
 * this function only decides which screen to show.
 */
export function resolveAccess(profile: Profile): AccessResult {
  if (profile.account_status === 'inactive') return { status: 'blocked', reason: 'inactive' };
  if (profile.account_status === 'pending') {
    return profile.role === 'user' ? { status: 'needs-student-link' } : { status: 'blocked', reason: 'pending' };
  }
  return { status: 'ok', home: ROLE_HOME[profile.role] };
}
