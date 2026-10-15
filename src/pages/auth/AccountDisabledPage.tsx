import { Navigate } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { resolveAccess } from '@/lib/access';

export default function AccountDisabledPage() {
  const { profile, loading, signOut } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!profile) return <Navigate to="/" replace />;

  const access = resolveAccess(profile);
  if (access.status === 'ok') return <Navigate to={access.home} replace />;
  if (access.status === 'needs-student-link') return <Navigate to="/link-student" replace />;

  return (
    <AuthShell title={access.reason === 'inactive' ? 'Account deactivated' : 'Account not active yet'}>
      <div className="space-y-5">
        <Alert tone="error">
          {access.reason === 'inactive'
            ? 'This account has been deactivated. Contact the school office if you think this is a mistake.'
            : 'This account is waiting to be activated by a school administrator.'}
        </Alert>
        <Button variant="secondary" fullWidth onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </AuthShell>
  );
}
