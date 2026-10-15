import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { emptyToNull, schoolSettingsSchema, settingsToForm, type SchoolSettingsFormValues } from '@/lib/schemas/entities';
import { getErrorMessage } from '@/lib/errors';
import { getSchoolSettings, updateSchoolSettings } from '@/services/settingsService';
import type { SchoolSettings } from '@/types/models';

function SettingsForm({ settings, onSaved }: { settings: SchoolSettings; onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SchoolSettingsFormValues>({ resolver: zodResolver(schoolSettingsSchema), defaultValues: settingsToForm(settings) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await updateSchoolSettings({
        school_name: values.school_name.trim(),
        address: emptyToNull(values.address),
        contact_email: emptyToNull(values.contact_email),
        contact_phone: emptyToNull(values.contact_phone),
      });
      reset(settingsToForm(saved));
      toast.success('School information saved');
      onSaved();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader title="School information" description="Shown on reports and to students." />
      <form onSubmit={onSubmit} noValidate className="space-y-4 p-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="School name" error={errors.school_name?.message} {...register('school_name')} />
        <TextAreaField label="Address" rows={2} error={errors.address?.message} {...register('address')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Contact email" type="email" error={errors.contact_email?.message} {...register('contact_email')} />
          <TextField label="Contact phone" type="tel" error={errors.contact_phone?.message} {...register('contact_phone')} />
        </div>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

export default function SchoolSettingsPage() {
  const { data, loading, error, reload } = useAsyncData(getSchoolSettings, []);
  return (
    <>
      <PageHeader title="School settings" description="School details managed by the Administrator." />
      {error && (
        <div className="space-y-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" onClick={reload}>Try again</Button>
        </div>
      )}
      {loading && !data && <Skeleton className="h-72 max-w-2xl" />}
      {data && <SettingsForm key={data.updated_at} settings={data} onSaved={reload} />}
    </>
  );
}
