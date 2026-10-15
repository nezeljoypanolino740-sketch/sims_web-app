import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useIsAdministrator } from '@/hooks/useBasePath';
import { useDebounce } from '@/hooks/useDebounce';
import { PAGE_SIZE } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { subjectFormDefaults, subjectSchema, subjectToForm, toSubjectInput, type SubjectFormValues } from '@/lib/schemas/entities';
import { createSubject, deleteSubject, listSubjects, updateSubject } from '@/services/subjectService';
import type { Subject } from '@/types/models';

function SubjectFormModal({ subject, onClose, onSaved }: { subject?: Subject | undefined; onClose: () => void; onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: subject ? subjectToForm(subject) : subjectFormDefaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const input = toSubjectInput(values);
      if (subject) await updateSubject(subject.id, input);
      else await createSubject(input);
      toast.success(subject ? 'Subject updated' : 'Subject added');
      onSaved();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Modal
      open
      title={subject ? 'Edit subject' : 'Add subject'}
      onClose={isSubmitting ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="subject-form" loading={isSubmitting}>
            {subject ? 'Save changes' : 'Add subject'}
          </Button>
        </>
      }
    >
      <form id="subject-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Subject code" placeholder="e.g. MATH7" error={errors.subject_code?.message} {...register('subject_code')} />
        <TextField label="Subject name" error={errors.subject_name?.message} {...register('subject_name')} />
        <TextAreaField label="Description (optional)" error={errors.description?.message} {...register('description')} />
      </form>
    </Modal>
  );
}

export default function SubjectsPage() {
  const isAdministrator = useIsAdministrator();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ subject?: Subject } | null>(null);
  const [toDelete, setToDelete] = useState<Subject | null>(null);
  const debounced = useDebounce(search);
  const { data, loading, error, reload } = useAsyncData(() => listSubjects(debounced, page, PAGE_SIZE), [debounced, page]);

  const columns: Column<Subject>[] = [
    { key: 'code', header: 'Code', cell: (s) => <span className="font-medium text-slate-900">{s.subject_code}</span> },
    { key: 'name', header: 'Name', cell: (s) => s.subject_name },
    { key: 'desc', header: 'Description', cell: (s) => <span className="line-clamp-2 max-w-md">{s.description ?? '-'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (s) => (
        <div className="flex items-center gap-0.5">
          <IconButton icon={Pencil} label={`Edit ${s.subject_name}`} onClick={() => setForm({ subject: s })} />
          {isAdministrator && <IconButton icon={Trash2} tone="danger" label={`Delete ${s.subject_name}`} onClick={() => setToDelete(s)} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Subjects"
        description="Subjects used for grades and attendance."
        actions={
          <Button onClick={() => setForm({})}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add subject
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Code or name"
          label="Search subjects"
        />
      </div>

      <DataTable
        caption="Subjects"
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(s) => s.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{
          title: debounced ? 'No subjects match your search' : 'No subjects yet',
          description: debounced ? 'Try a different search.' : 'Add the subjects you grade and take attendance for.',
          action: debounced ? undefined : <Button onClick={() => setForm({})}>Add subject</Button>,
        }}
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      {form && <SubjectFormModal subject={form.subject} onClose={() => setForm(null)} onSaved={reload} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete subject"
        message={toDelete ? `Delete ${toDelete.subject_name}? This fails while grades still use the subject.` : ''}
        confirmLabel="Delete subject"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteSubject(toDelete.id);
          toast.success('Subject deleted');
          setToDelete(null);
          reload();
        }}
      />
    </>
  );
}
