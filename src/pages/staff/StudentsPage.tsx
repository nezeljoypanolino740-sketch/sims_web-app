import { useState } from 'react';
import { Archive, ArchiveRestore, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CreateStudentAccountModal } from '@/components/staff/CreateStudentAccountModal';
import { StudentFormModal } from '@/components/staff/StudentFormModal';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { SelectField } from '@/components/ui/SelectField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useIsAdministrator } from '@/hooks/useBasePath';
import { useDebounce } from '@/hooks/useDebounce';
import { ENROLLMENT_STATUSES, PAGE_SIZE } from '@/lib/constants';
import { deleteStudent, getClassOptions, listStudents, setStudentStatus } from '@/services/studentService';
import { getActiveAcademicYear } from '@/services/academicYearService';
import type { EnrollmentStatus, Student } from '@/types/models';
import { formatDate, studentFullName, titleCase } from '@/utils/format';
import { plainOptions, toOptions } from '@/utils/options';

type StatusFilter = '' | 'all' | EnrollmentStatus;

type Dialog =
  | { kind: 'none' }
  | { kind: 'form'; student?: Student }
  | { kind: 'account'; student: Student }
  | { kind: 'archive'; student: Student }
  | { kind: 'restore'; student: Student }
  | { kind: 'delete'; student: Student };

export default function StudentsPage() {
  const isAdministrator = useIsAdministrator();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [schoolYear, setSchoolYear] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(params.get('new') === '1' ? { kind: 'form' } : { kind: 'none' });
  const debounced = useDebounce(search);

  const options = useAsyncData(getClassOptions, []);
  const activeYear = useAsyncData(getActiveAcademicYear, []);
  const { data, loading, error, reload } = useAsyncData(
    () =>
      listStudents(
        {
          search: debounced,
          schoolYear,
          gradeLevel,
          section,
          ...(status === '' ? {} : { status }),
        },
        page,
        PAGE_SIZE,
      ),
    [debounced, schoolYear, gradeLevel, section, status, page],
  );

  const closeDialog = () => {
    setDialog({ kind: 'none' });
    if (params.get('new')) {
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  };

  const filterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const columns: Column<Student>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (s) => (
        <div>
          <p className="font-medium text-slate-900">{studentFullName(s)}</p>
          <p className="text-xs text-slate-500">{s.student_number}</p>
        </div>
      ),
    },
    { key: 'class', header: 'Class', cell: (s) => `${s.grade_level}${s.section ? ` - ${s.section}` : ''}` },
    { key: 'year', header: 'School year', cell: (s) => s.school_year },
    { key: 'dob', header: 'Birth date', cell: (s) => formatDate(s.date_of_birth) },
    { key: 'email', header: 'Email', cell: (s) => <span className="break-all">{s.email}</span> },
    { key: 'status', header: 'Status', cell: (s) => <Badge tone={statusTone(s.enrollment_status)}>{titleCase(s.enrollment_status)}</Badge> },
    {
      key: 'account',
      header: 'Login',
      cell: (s) => <Badge tone={s.profile_id ? 'success' : 'neutral'}>{s.profile_id ? 'Linked' : 'Not linked'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (s) => (
        <div className="flex items-center gap-0.5">
          <IconButton icon={Pencil} label={`Edit ${studentFullName(s)}`} onClick={() => setDialog({ kind: 'form', student: s })} />
          {!s.profile_id && s.enrollment_status !== 'archived' && (
            <IconButton icon={KeyRound} label={`Create login for ${studentFullName(s)}`} onClick={() => setDialog({ kind: 'account', student: s })} />
          )}
          {s.enrollment_status === 'archived' ? (
            <IconButton icon={ArchiveRestore} label={`Restore ${studentFullName(s)}`} onClick={() => setDialog({ kind: 'restore', student: s })} />
          ) : (
            <IconButton icon={Archive} label={`Archive ${studentFullName(s)}`} onClick={() => setDialog({ kind: 'archive', student: s })} />
          )}
          {isAdministrator && <IconButton icon={Trash2} tone="danger" label={`Delete ${studentFullName(s)}`} onClick={() => setDialog({ kind: 'delete', student: s })} />}
        </div>
      ),
    },
  ];

  const target = dialog.kind === 'archive' || dialog.kind === 'restore' || dialog.kind === 'delete' ? dialog.student : null;
  const filtersActive = Boolean(debounced || schoolYear || gradeLevel || section || status);

  return (
    <>
      <PageHeader
        title="Students"
        description="Search, add and manage student records. Archived students keep their grades and attendance."
        actions={
          <Button onClick={() => setDialog({ kind: 'form' })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add student
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SearchInput value={search} onChange={filterChange(setSearch)} placeholder="Name, number or email" label="Search students" />
        <SelectField label="School year" hideLabel placeholder="All school years" options={plainOptions(options.data?.schoolYears ?? [])} value={schoolYear} onChange={(e) => filterChange(setSchoolYear)(e.target.value)} />
        <SelectField label="Grade level" hideLabel placeholder="All grade levels" options={plainOptions(options.data?.gradeLevels ?? [])} value={gradeLevel} onChange={(e) => filterChange(setGradeLevel)(e.target.value)} />
        <SelectField label="Section" hideLabel placeholder="All sections" options={plainOptions(options.data?.sections ?? [])} value={section} onChange={(e) => filterChange(setSection)(e.target.value)} />
        <SelectField
          label="Status"
          hideLabel
          placeholder="Not archived"
          options={[...toOptions(ENROLLMENT_STATUSES), { value: 'all', label: 'Everyone (incl. archived)' }]}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        caption="Students"
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(s) => s.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{
          title: filtersActive ? 'No students match these filters' : 'No students yet',
          description: filtersActive ? 'Try a different search or clear a filter.' : 'Add your first student to get started.',
          action: filtersActive ? undefined : <Button onClick={() => setDialog({ kind: 'form' })}>Add student</Button>,
        }}
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      {dialog.kind === 'form' && (
        <StudentFormModal student={dialog.student} defaultSchoolYear={activeYear.data?.school_year ?? ''} onClose={closeDialog} onSaved={() => { reload(); options.reload(); }} />
      )}
      {dialog.kind === 'account' && <CreateStudentAccountModal student={dialog.student} onClose={closeDialog} onCreated={reload} />}

      <ConfirmDialog
        open={dialog.kind === 'archive'}
        title="Archive student"
        message={target ? `Archive ${studentFullName(target)}? They disappear from the default list but all grades and attendance are kept. You can restore them later.` : ''}
        confirmLabel="Archive"
        onCancel={closeDialog}
        onConfirm={async () => {
          if (!target) return;
          await setStudentStatus(target.id, 'archived');
          toast.success('Student archived');
          closeDialog();
          reload();
        }}
      />
      <ConfirmDialog
        open={dialog.kind === 'restore'}
        title="Restore student"
        tone="primary"
        message={target ? `Restore ${studentFullName(target)} as enrolled?` : ''}
        confirmLabel="Restore"
        onCancel={closeDialog}
        onConfirm={async () => {
          if (!target) return;
          await setStudentStatus(target.id, 'enrolled');
          toast.success('Student restored');
          closeDialog();
          reload();
        }}
      />
      <ConfirmDialog
        open={dialog.kind === 'delete'}
        title="Delete student permanently"
        message={target ? `Permanently delete ${studentFullName(target)}? This cannot be undone and fails if the student has grades or attendance. Archive instead to keep history.` : ''}
        confirmLabel="Delete permanently"
        onCancel={closeDialog}
        onConfirm={async () => {
          if (!target) return;
          await deleteStudent(target.id);
          toast.success('Student deleted');
          closeDialog();
          reload();
        }}
      />
    </>
  );
}
