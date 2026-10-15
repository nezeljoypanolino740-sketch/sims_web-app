import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useIsAdministrator } from '@/hooks/useBasePath';
import { SEMESTERS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { academicYearSchema, toAcademicYearInput, type AcademicYearFormValues } from '@/lib/schemas/entities';
import { createAcademicYear, deleteAcademicYear, listAcademicYears, setActiveAcademicYear } from '@/services/academicYearService';
import type { AcademicYear } from '@/types/models';
import { formatDate } from '@/utils/format';
import { plainOptions } from '@/utils/options';

function AcademicYearModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcademicYearFormValues>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: { school_year: '', semester: '1st Semester' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createAcademicYear(toAcademicYearInput(values));
      toast.success('Term added');
      onSaved();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Modal
      open
      size="sm"
      title="Add school year and semester"
      onClose={isSubmitting ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="year-form" loading={isSubmitting}>
            Add term
          </Button>
        </>
      }
    >
      <form id="year-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="School year" placeholder="2026-2027" error={errors.school_year?.message} {...register('school_year')} />
        <SelectField label="Semester" options={plainOptions(SEMESTERS)} error={errors.semester?.message} {...register('semester')} />
      </form>
    </Modal>
  );
}

export default function AcademicYearsPage() {
  const isAdministrator = useIsAdministrator();
  const { data, loading, error, reload } = useAsyncData(listAcademicYears, []);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<AcademicYear | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  const activate = async (year: AcademicYear) => {
    setActivating(year.id);
    try {
      await setActiveAcademicYear(year.id);
      toast.success(`${year.school_year} ${year.semester} is now active`);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActivating(null);
    }
  };

  const columns: Column<AcademicYear>[] = [
    { key: 'year', header: 'School year', cell: (y) => <span className="font-medium text-slate-900">{y.school_year}</span> },
    { key: 'sem', header: 'Semester', cell: (y) => y.semester },
    { key: 'status', header: 'Status', cell: (y) => (y.is_active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>) },
    { key: 'created', header: 'Added', cell: (y) => formatDate(y.created_at) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (y) => (
        <div className="flex items-center gap-1">
          {!y.is_active && (
            <Button variant="ghost" className="px-3 py-1.5" loading={activating === y.id} onClick={() => void activate(y)}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Set active
            </Button>
          )}
          {isAdministrator && <IconButton icon={Trash2} tone="danger" label={`Delete ${y.school_year} ${y.semester}`} onClick={() => setToDelete(y)} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Academic years"
        description="Only one school year and semester can be active at a time. The active term is the default for new students and grades."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add term
          </Button>
        }
      />
      <DataTable
        caption="Academic years"
        columns={columns}
        rows={data ?? []}
        rowKey={(y) => y.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{ title: 'No school years yet', description: 'Add a school year and semester, then set it active.', action: <Button onClick={() => setAdding(true)}>Add term</Button> }}
      />

      {adding && <AcademicYearModal onClose={() => setAdding(false)} onSaved={reload} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete term"
        message={toDelete ? `Delete ${toDelete.school_year} ${toDelete.semester}? Grades and students keep their school year text.` : ''}
        confirmLabel="Delete term"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteAcademicYear(toDelete.id);
          toast.success('Term deleted');
          setToDelete(null);
          reload();
        }}
      />
    </>
  );
}
