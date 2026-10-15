import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/hooks/useAuth';
import { resolveAccess } from '@/lib/access';
import { getErrorMessage } from '@/lib/errors';
import { linkStudentSchema, type LinkStudentValues } from '@/lib/schemas/auth';
import { claimStudentRecord } from '@/services/authService';

export default function LinkStudentPage() {
  const { profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LinkStudentValues>({
    resolver: zodResolver(linkStudentSchema),
    defaultValues: { studentNumber: '', dateOfBirth: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await claimStudentRecord(values.studentNumber, values.dateOfBirth);
      await refreshProfile();
      toast.success('Your account is now linked to your student record.');
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  if (loading) return <FullPageSpinner />;
  if (profile) {
    const access = resolveAccess(profile);
    if (access.status === 'ok') return <Navigate to={access.home} replace />;
    if (access.status === 'blocked') return <Navigate to="/account-disabled" replace />;
  }

  return (
    <AuthShell
      title="Verify your student record"
      subtitle="Confirm who you are to unlock your grades and attendance."
      footer={
        <button type="button" onClick={() => void signOut()} className="font-semibold text-brand-700 hover:underline">
          Sign out
        </button>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField
          label="Student number"
          autoComplete="off"
          error={errors.studentNumber?.message}
          {...register('studentNumber')}
        />
        <TextField
          label="Date of birth"
          type="date"
          autoComplete="bday"
          error={errors.dateOfBirth?.message}
          {...register('dateOfBirth')}
        />
        <p className="text-sm text-slate-500">
          Your account email must match the email the school has on your record. If it does not, ask the school office to
          update it.
        </p>
        <Button type="submit" fullWidth loading={isSubmitting}>
          Link my record
        </Button>
      </form>
    </AuthShell>
  );
}
