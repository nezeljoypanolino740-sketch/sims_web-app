import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/errors';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/schemas/auth';
import { updatePassword } from '@/services/authService';

export default function ResetPasswordPage() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updatePassword(values.password);
      toast.success('Password updated. Please sign in with your new password.');
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  if (loading) return <FullPageSpinner />;

  if (!session) {
    return (
      <AuthShell title="Reset link not valid">
        <div className="space-y-4">
          <Alert tone="error">This reset link is invalid or has expired. Request a new one to continue.</Alert>
          <Link to="/forgot-password" className="inline-block text-sm font-semibold text-brand-700 hover:underline">
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Pick a password you have not used before.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters with a letter and a number."
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" fullWidth loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
