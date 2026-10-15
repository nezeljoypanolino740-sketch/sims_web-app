import { useAsyncData } from '@/hooks/useAsyncData';
import { useAuth } from '@/hooks/useAuth';
import { getMyStudent } from '@/services/studentPortalService';

/** The signed-in student's own record (null if none is linked). */
export function useMyStudent() {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const { data, loading, error, reload } = useAsyncData(
    () => (profileId ? getMyStudent(profileId) : Promise.resolve(null)),
    [profileId],
  );
  return { student: data, loading, error, reload };
}
