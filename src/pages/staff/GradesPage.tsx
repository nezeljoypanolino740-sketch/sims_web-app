import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { StudentPicker } from '@/components/staff/StudentPicker';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField } from '@/components/ui/SelectField';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useIsAdministrator } from '@/hooks/useBasePath';
import { GRADING_PERIODS, PAGE_SIZE } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { gradeFormDefaults, gradeSchema, gradeToForm, toGradeInput, type GradeFormValues } from '@/lib/schemas/entities';
import { getActiveAcademicYear } from '@/services/academicYearService';
import { createGrade, deleteGrade, listGrades, updateGrade, type GradeRow } from '@/services/gradeService';
import { getClassOptions, type StudentOption } from '@/services/studentService';
import { listAllSubjects } from '@/services/subjectService';
import { listTeacherOptions } from '@/services/teacherService';
import { formatPercent, scorePercent, studentFullName } from '@/utils/format';
import { plainOptions } from '@/utils/options';

function GradeFormModal({ grade, defaultSchoolYear, onClose, onSaved }: { grade?: GradeRow | undefined; defaultSchoolYear: string; onClose: () => void; onSaved: () => void }) {
  const subjects = useAsyncData(listAllSubjects, []);
  const teachers = useAsyncData(listTeacherOptions, []);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: grade ? gradeToForm(grade) : { ...gradeFormDefaults, school_year: defaultSchoolYear },
  });

  const initialStudent: StudentOption | null =
    grade && grade.students
      ? { id: grade.student_id, student_number: grade.students.student_number, first_name: grade.students.first_name, middle_name: grade.students.middle_name, last_name: grade.students.last_name, grade_level: '', section: null }
      : null;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const input = toGradeInput(values);
      if (grade) await updateGrade(grade.id, input);
      else await createGrade(input);
      toast.success(grade ? 'Grade updated' : 'Grade added');
      onSaved();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <Modal
      open
      size="lg"
      title={grade ? 'Edit grade' : 'Add grade'}
      description="Scores must be between 0 and the total score."
      onClose={isSubmitting ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="grade-form" loading={isSubmitting}>{grade ? 'Save changes' : 'Add grade'}</Button>
        </>
      }
    >
      <form id="grade-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <StudentPicker value={watch('student_id')} onChange={(id) => setValue('student_id', id, { shouldValidate: true })} error={errors.student_id?.message} initial={initialStudent} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Subject"
            placeholder="Choose a subject"
            options={(subjects.data ?? []).map((s) => ({ value: s.id, label: `${s.subject_code} - ${s.subject_name}` }))}
            error={errors.subject_id?.message}
            {...register('subject_id')}
          />
          <SelectField
            label="Teacher (optional)"
            placeholder="No teacher"
            options={(teachers.data ?? []).map((t) => ({ value: t.id, label: t.full_name }))}
            error={errors.teacher_id?.message}
            {...register('teacher_id')}
          />
          <SelectField label="Grading period" placeholder="Choose period" options={plainOptions(GRADING_PERIODS)} error={errors.grading_period?.message} {...register('grading_period')} />
          <TextField label="School year" placeholder="2026-2027" error={errors.school_year?.message} {...register('school_year')} />
          <TextField label="Assessment name" placeholder="e.g. Quiz 1" error={errors.assessment_name?.message} {...register('assessment_name')} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Score" type="number" inputMode="decimal" step="any" min="0" error={errors.score?.message} {...register('score')} />
            <TextField label="Total score" type="number" inputMode="decimal" step="any" min="0" error={errors.total_score?.message} {...register('total_score')} />
          </div>
        </div>
        <TextAreaField label="Remarks (optional)" rows={2} error={errors.remarks?.message} {...register('remarks')} />
      </form>
    </Modal>
  );
}

export default function GradesPage() {
  const isAdministrator = useIsAdministrator();
  const [params, setParams] = useSearchParams();
  const classOptions = useAsyncData(getClassOptions, []);
  const subjects = useAsyncData(listAllSubjects, []);
  const activeYear = useAsyncData(getActiveAcademicYear, []);

  const [schoolYear, setSchoolYear] = useState('');
  const [gradingPeriod, setGradingPeriod] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ grade?: GradeRow } | null>(params.get('new') === '1' ? {} : null);
  const [toDelete, setToDelete] = useState<GradeRow | null>(null);

  const { data, loading, error, reload } = useAsyncData(
    () => listGrades({ schoolYear, gradingPeriod, subjectId, studentId }, page, PAGE_SIZE),
    [schoolYear, gradingPeriod, subjectId, studentId, page],
  );

  const closeForm = () => {
    setForm(null);
    if (params.get('new')) {
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  };

  const change = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const columns: Column<GradeRow>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (g) =>
        g.students ? (
          <div>
            <p className="font-medium text-slate-900">{studentFullName(g.students)}</p>
            <p className="text-xs text-slate-500">{g.students.student_number}</p>
          </div>
        ) : (
          '-'
        ),
    },
    { key: 'subject', header: 'Subject', cell: (g) => g.subjects?.subject_name ?? '-' },
    { key: 'assessment', header: 'Assessment', cell: (g) => g.assessment_name },
    { key: 'period', header: 'Period', cell: (g) => `${g.grading_period} - ${g.school_year}` },
    { key: 'score', header: 'Score', cell: (g) => `${Number(g.score)} / ${Number(g.total_score)}` },
    { key: 'pct', header: '%', cell: (g) => formatPercent(scorePercent(Number(g.score), Number(g.total_score))) },
    { key: 'teacher', header: 'Teacher', cell: (g) => g.teachers?.full_name ?? '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (g) => (
        <div className="flex items-center gap-0.5">
          <IconButton icon={Pencil} label={`Edit ${g.assessment_name}`} onClick={() => setForm({ grade: g })} />
          {isAdministrator && <IconButton icon={Trash2} tone="danger" label={`Delete ${g.assessment_name}`} onClick={() => setToDelete(g)} />}
        </div>
      ),
    },
  ];

  const filtersActive = Boolean(schoolYear || gradingPeriod || subjectId || studentId);

  return (
    <>
      <PageHeader
        title="Grades"
        description="Record and correct assessment scores. Students are notified when a grade is posted."
        actions={
          <Button onClick={() => setForm({})}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add grade
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField label="School year" placeholder="All school years" options={plainOptions(classOptions.data?.schoolYears ?? [])} value={schoolYear} onChange={(e) => change(setSchoolYear)(e.target.value)} />
        <SelectField label="Grading period" placeholder="All periods" options={plainOptions(GRADING_PERIODS)} value={gradingPeriod} onChange={(e) => change(setGradingPeriod)(e.target.value)} />
        <SelectField
          label="Subject"
          placeholder="All subjects"
          options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.subject_name }))}
          value={subjectId}
          onChange={(e) => change(setSubjectId)(e.target.value)}
        />
      </div>
      <div className="mb-4 max-w-md">
        <StudentPicker label="Student" placeholder="All students" value={studentId} onChange={change(setStudentId)} />
      </div>

      <DataTable
        caption="Grades"
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(g) => g.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{
          title: filtersActive ? 'No grades match these filters' : 'No grades yet',
          description: filtersActive ? 'Try clearing a filter.' : 'Add the first grade to get started.',
          action: filtersActive ? undefined : <Button onClick={() => setForm({})}>Add grade</Button>,
        }}
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      {form && <GradeFormModal grade={form.grade} defaultSchoolYear={activeYear.data?.school_year ?? ''} onClose={closeForm} onSaved={reload} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete grade"
        message={toDelete ? `Delete "${toDelete.assessment_name}"? This cannot be undone.` : ''}
        confirmLabel="Delete grade"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteGrade(toDelete.id);
          toast.success('Grade deleted');
          setToDelete(null);
          reload();
        }}
      />
    </>
  );
}
