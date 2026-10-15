import { Navigate, Outlet } from 'react-router-dom';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { resolveAccess } from '@/lib/access';
import { useAuth } from '@/hooks/useAuth';
import ProfileErrorPage from '@/pages/auth/ProfileErrorPage';
import type { Role } from '@/types/models';

/** Needs a signed-in session only (used by "link student" and "account disabled"). */
export function RequireSession() {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Needs a signed-in person whose account is active. */
export function RequireActive() {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <ProfileErrorPage />;

  const access = resolveAccess(profile);
  if (access.status === 'needs-student-link') return <Navigate to="/link-student" replace />;
  if (access.status === 'blocked') return <Navigate to="/account-disabled" replace />;
  return <Outlet />;
}

/** Use inside <RequireActive>. Sends other roles to the unauthorized page. */
export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const { profile } = useAuth();
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

/** Login, register and forgot-password: signed-in people are sent on to their dashboard. */
export function PublicOnly() {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (session) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** "/" decides where to go based on the signed-in role. */
export function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <ProfileErrorPage />;

  const access = resolveAccess(profile);
  if (access.status === 'ok') return <Navigate to={access.home} replace />;
  if (access.status === 'needs-student-link') return <Navigate to="/link-student" replace />;
  return <Navigate to="/account-disabled" replace />;
}
