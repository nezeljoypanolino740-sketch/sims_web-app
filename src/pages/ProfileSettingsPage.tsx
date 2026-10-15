import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/schemas/auth';
import { profileNameSchema, type ProfileNameValues } from '@/lib/schemas/entities';
import { changePassword, updateOwnName } from '@/services/authService';
import type { Profile } from '@/types/models';
import { formatDate, titleCase } from '@/utils/format';

function NameForm({ profile }: { profile: Profile }) {
  const { refreshProfile } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileNameValues>({ resolver: zodResolver(profileNameSchema), defaultValues: { fullName: profile.full_name } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await updateOwnName(profile.id, values.fullName);
      await refreshProfile();
      reset({ fullName: updated.full_name });
      toast.success('Profile updated');
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Card>
      <CardHeader title="Profile" description="Your name appears on school records and reports." />
      <form onSubmit={onSubmit} noValidate className="space-y-5 p-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <TextField label="Email" value={profile.email} readOnly hint="Your email is your sign-in name and cannot be changed here." />
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{ROLE_LABELS[profile.role]}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Account status</dt>
            <dd className="mt-0.5">
              <Badge tone={statusTone(profile.account_status)}>{titleCase(profile.account_status)}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Member since</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{formatDate(profile.created_at)}</dd>
          </div>
        </dl>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm({ email }: { email: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await changePassword(email, values.currentPassword, values.newPassword);
      reset();
      toast.success('Password changed');
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Card>
      <CardHeader title="Change password" description="You need your current password to set a new one." />
      <form onSubmit={onSubmit} noValidate className="space-y-5 p-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters with a letter and a number."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

export default function ProfileSettingsPage() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <>
      <PageHeader title="Profile and account settings" description="Manage your own details and password." />
      <div className="grid max-w-3xl gap-6">
        <NameForm profile={profile} />
        <PasswordForm email={profile.email} />
      </div>
    </>
  );
}
