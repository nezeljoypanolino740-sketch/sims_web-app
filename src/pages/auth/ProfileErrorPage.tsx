import { useState } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileErrorPage() {
  const { refreshProfile, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await refreshProfile();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <AuthShell title="We could not load your account">
      <div className="space-y-5">
        <Alert tone="error">
          Your sign-in worked, but your account details did not load. Check your connection and try again.
        </Alert>
        <div className="flex gap-3">
          <Button fullWidth loading={retrying} onClick={() => void retry()}>
            Try again
          </Button>
          <Button variant="secondary" fullWidth onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
