import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { useMyStudent } from '@/hooks/useMyStudent';
import { getErrorMessage } from '@/lib/errors';
import { contactSchema, type ContactFormValues } from '@/lib/schemas/entities';
import { updateMyContact } from '@/services/studentPortalService';
import type { Student } from '@/types/models';
import { formatDate, studentFullName, titleCase } from '@/utils/format';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function ContactForm({ student, onSaved }: { student: Student; onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { phone: student.phone ?? '', address: student.address ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateMyContact(values.phone, values.address);
      reset({ phone: values.phone.trim(), address: values.address.trim() });
      toast.success('Contact details updated');
      onSaved();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Card>
      <CardHeader title="Contact details" description="You can update your phone number and address. Other details are managed by the school office." />
      <form onSubmit={onSubmit} noValidate className="space-y-4 p-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Phone" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
        <TextAreaField label="Address" rows={3} autoComplete="street-address" error={errors.address?.message} {...register('address')} />
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save contact details
        </Button>
      </form>
    </Card>
  );
}

export default function MyProfilePage() {
  const { student, loading, error, reload } = useMyStudent();

  return (
    <>
      <PageHeader title="My profile" description="Your student record." />
      {error && (
        <div className="mb-6 space-y-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}
      {loading && !student && <Skeleton className="h-64 max-w-3xl" />}
      {!loading && !error && !student && (
        <Card>
          <EmptyState title="No student record is linked to your account" description="Ask the school office to link your account." />
        </Card>
      )}
      {student && (
        <div className="grid max-w-3xl gap-6">
          <Card>
            <CardHeader title={studentFullName(student)} description={`Student number ${student.student_number}`} action={<Badge tone={statusTone(student.enrollment_status)}>{titleCase(student.enrollment_status)}</Badge>} />
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              <Fact label="Grade level">{student.grade_level}</Fact>
              <Fact label="Section">{student.section ?? '-'}</Fact>
              <Fact label="School year">{student.school_year}</Fact>
              <Fact label="Date of birth">{formatDate(student.date_of_birth)}</Fact>
              <Fact label="Gender">{student.gender ? titleCase(student.gender) : '-'}</Fact>
              <Fact label="Email">
                <span className="break-all">{student.email}</span>
              </Fact>
            </dl>
          </Card>
          <ContactForm key={student.updated_at} student={student} onSaved={reload} />
        </div>
      )}
    </>
  );
}
