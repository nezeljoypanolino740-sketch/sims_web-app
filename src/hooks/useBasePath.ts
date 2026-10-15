import { useAuth } from '@/hooks/useAuth';
import type { StaffBase } from '@/layouts/navigation';

/** '/administrator' or '/admin', so shared staff pages can build links for either role. */
export function useBasePath(): StaffBase {
  const { profile } = useAuth();
  return profile?.role === 'administrator' ? '/administrator' : '/admin';
}

/** Controls which buttons are shown (delete). The database enforces it either way. */
export function useIsAdministrator(): boolean {
  const { profile } = useAuth();
  return profile?.role === 'administrator';
}
