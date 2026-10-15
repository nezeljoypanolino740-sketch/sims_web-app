import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useIsAdministrator } from '@/hooks/useBasePath';
import { useDebounce } from '@/hooks/useDebounce';
import { EMPLOYMENT_STATUSES, PAGE_SIZE } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import {
  teacherFormDefaults,
  teacherSchema,
  teacherToForm,
  toTeacherInput,
  type TeacherFormValues,
} from '@/lib/schemas/entities';
import { createTeacher, deleteTeacher, listTeachers, updateTeacher } from '@/services/teacherService';
import type { EmploymentStatus, Teacher } from '@/types/models';
import { titleCase } from '@/utils/format';
import { toOptions } from '@/utils/options';

function TeacherFormModal({ teacher, onClose, onSaved }: { teacher?: Teacher | undefined; onClose: () => void; onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: teacher ? teacherToForm(teacher) : teacherFormDefaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const input = toTeacherInput(values);
      if (teacher) await updateTeacher(teacher.id, input);
      else await createTeacher(input);
      toast.success(teacher ? 'Teacher updated' : 'Teacher added');
      onSaved();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Modal
      open
      title={teacher ? 'Edit teacher' : 'Add teacher'}
      onClose={isSubmitting ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="teacher-form" loading={isSubmitting}>
            {teacher ? 'Save changes' : 'Add teacher'}
          </Button>
        </>
      }
    >
      <form id="teacher-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Employee number" error={errors.employee_number?.message} {...register('employee_number')} />
          <TextField label="Full name" error={errors.full_name?.message} {...register('full_name')} />
          <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <TextField label="Phone (optional)" type="tel" error={errors.phone?.message} {...register('phone')} />
          <TextField label="Specialization (optional)" error={errors.specialization?.message} {...register('specialization')} />
          <SelectField label="Employment status" options={toOptions(EMPLOYMENT_STATUSES)} error={errors.employment_status?.message} {...register('employment_status')} />
        </div>
      </form>
    </Modal>
  );
}

export default function TeachersPage() {
  const isAdministrator = useIsAdministrator();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | EmploymentStatus>('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ teacher?: Teacher } | null>(null);
  const [toDelete, setToDelete] = useState<Teacher | null>(null);
  const debounced = useDebounce(search);

  const { data, loading, error, reload } = useAsyncData(
    () => listTeachers({ search: debounced, status: status === '' ? 'all' : status }, page, PAGE_SIZE),
    [debounced, status, page],
  );

  const columns: Column<Teacher>[] = [
    {
      key: 'name',
      header: 'Teacher',
      cell: (t) => (
        <div>
          <p className="font-medium text-slate-900">{t.full_name}</p>
          <p className="text-xs text-slate-500">{t.employee_number}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (t) => (
        <div>
          <p className="break-all">{t.email}</p>
          {t.phone && <p className="text-xs text-slate-500">{t.phone}</p>}
        </div>
      ),
    },
    { key: 'spec', header: 'Specialization', cell: (t) => t.specialization ?? '-' },
    { key: 'status', header: 'Status', cell: (t) => <Badge tone={statusTone(t.employment_status)}>{titleCase(t.employment_status)}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (t) => (
        <div className="flex items-center gap-0.5">
          <IconButton icon={Pencil} label={`Edit ${t.full_name}`} onClick={() => setForm({ teacher: t })} />
          {isAdministrator && <IconButton icon={Trash2} tone="danger" label={`Delete ${t.full_name}`} onClick={() => setToDelete(t)} />}
        </div>
      ),
    },
  ];

  const filtersActive = Boolean(debounced || status);

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Keep teacher information up to date."
        actions={
          <Button onClick={() => setForm({})}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add teacher
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Name, number, email"
          label="Search teachers"
        />
        <SelectField
          label="Status"
          hideLabel
          placeholder="All statuses"
          options={toOptions(EMPLOYMENT_STATUSES)}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | EmploymentStatus);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        caption="Teachers"
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(t) => t.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{
          title: filtersActive ? 'No teachers match these filters' : 'No teachers yet',
          description: filtersActive ? 'Try a different search or status.' : 'Add a teacher to get started.',
          action: filtersActive ? undefined : <Button onClick={() => setForm({})}>Add teacher</Button>,
        }}
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      {form && <TeacherFormModal teacher={form.teacher} onClose={() => setForm(null)} onSaved={reload} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete teacher"
        message={toDelete ? `Delete ${toDelete.full_name}? Grades they entered keep their data but lose the teacher link. Set the status to Inactive instead if they only left.` : ''}
        confirmLabel="Delete teacher"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteTeacher(toDelete.id);
          toast.success('Teacher deleted');
          setToDelete(null);
          reload();
        }}
      />
    </>
  );
}
