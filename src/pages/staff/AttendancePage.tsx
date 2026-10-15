import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { StudentPicker } from '@/components/staff/StudentPicker';
import { Alert } from '@/components/ui/Alert';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField } from '@/components/ui/SelectField';
import { Spinner } from '@/components/ui/Spinner';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useIsAdministrator } from '@/hooks/useBasePath';
import { ATTENDANCE_STATUSES, PAGE_SIZE } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { getActiveAcademicYear } from '@/services/academicYearService';
import {
  deleteAttendance,
  getAttendanceForDate,
  listAttendance,
  saveAttendance,
  updateAttendance,
  type AttendanceRow,
} from '@/services/attendanceService';
import { getClassOptions, listClassStudents, type StudentOption } from '@/services/studentService';
import { listAllSubjects } from '@/services/subjectService';
import type { AttendanceStatus } from '@/types/models';
import { formatDate, studentFullName, titleCase, todayISO } from '@/utils/format';
import { plainOptions, toOptions } from '@/utils/options';

/* ---------------------------- take attendance ---------------------------- */

function TakeAttendance() {
  const classOptions = useAsyncData(getClassOptions, []);
  const subjects = useAsyncData(listAllSubjects, []);
  const activeYear = useAsyncData(getActiveAcademicYear, []);

  const [date, setDate] = useState(todayISO());
  const [schoolYear, setSchoolYear] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [section, setSection] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const [students, setStudents] = useState<StudentOption[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [existingCount, setExistingCount] = useState(0);
  const [loadingClass, setLoadingClass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (activeYear.data && !schoolYear) setSchoolYear(activeYear.data.school_year);
  }, [activeYear.data, schoolYear]);

  const resetLoaded = () => {
    setStudents(null);
    setFormError(null);
  };

  const loadClass = async () => {
    setFormError(null);
    if (!schoolYear || !gradeLevel) {
      setFormError('Choose a school year and a grade level first.');
      return;
    }
    if (date > todayISO()) {
      setFormError('Attendance cannot be recorded for a future date.');
      return;
    }
    setLoadingClass(true);
    try {
      const list = await listClassStudents(gradeLevel, section, schoolYear);
      const existing = await getAttendanceForDate(date, list.map((s) => s.id), subjectId || null);
      const nextStatuses: Record<string, AttendanceStatus> = {};
      const nextRemarks: Record<string, string> = {};
      for (const s of list) nextStatuses[s.id] = 'present';
      for (const e of existing) {
        nextStatuses[e.student_id] = e.status;
        nextRemarks[e.student_id] = e.remarks ?? '';
      }
      setStudents(list);
      setStatuses(nextStatuses);
      setRemarks(nextRemarks);
      setExistingCount(existing.length);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setLoadingClass(false);
    }
  };

  const save = async () => {
    if (!students || students.length === 0) return;
    setSaving(true);
    setFormError(null);
    try {
      const saved = await saveAttendance(
        students.map((s) => ({
          student_id: s.id,
          subject_id: subjectId || null,
          attendance_date: date,
          status: statuses[s.id] ?? 'present',
          remarks: remarks[s.id] ?? '',
        })),
      );
      toast.success(`Attendance saved for ${saved} students`);
      setExistingCount(students.length);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const summary = (students ?? []).reduce<Record<AttendanceStatus, number>>(
    (acc, s) => {
      acc[statuses[s.id] ?? 'present'] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0 },
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Choose a class" description="Pick the class and date, then load the class list." />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Date" type="date" max={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); resetLoaded(); }} />
          <SelectField label="School year" placeholder="Choose school year" options={plainOptions(classOptions.data?.schoolYears ?? [])} value={schoolYear} onChange={(e) => { setSchoolYear(e.target.value); resetLoaded(); }} />
          <SelectField label="Grade level" placeholder="Choose grade level" options={plainOptions(classOptions.data?.gradeLevels ?? [])} value={gradeLevel} onChange={(e) => { setGradeLevel(e.target.value); resetLoaded(); }} />
          <SelectField label="Section" placeholder="No section" options={plainOptions(classOptions.data?.sections ?? [])} value={section} onChange={(e) => { setSection(e.target.value); resetLoaded(); }} />
          <SelectField
            label="Subject (optional)"
            placeholder="Whole day"
            options={(subjects.data ?? []).map((s) => ({ value: s.id, label: `${s.subject_code} - ${s.subject_name}` }))}
            value={subjectId}
            onChange={(e) => { setSubjectId(e.target.value); resetLoaded(); }}
          />
          <div className="flex items-end">
            <Button onClick={() => void loadClass()} loading={loadingClass}>
              Load class
            </Button>
          </div>
        </div>
        {formError && (
          <div className="px-5 pb-5">
            <Alert tone="error">{formError}</Alert>
          </div>
        )}
      </Card>

      {loadingClass && <Spinner label="Loading class list" />}

      {students && !loadingClass && (
        <Card>
          <CardHeader
            title={`${gradeLevel}${section ? ` - ${section}` : ''} on ${formatDate(date)}`}
            description={existingCount > 0 ? `${existingCount} students already have an entry; saving updates them.` : 'No entries yet for this date.'}
            action={
              <Button variant="secondary" onClick={() => setStatuses(Object.fromEntries(students.map((s) => [s.id, 'present' as AttendanceStatus])))} disabled={students.length === 0}>
                Mark all present
              </Button>
            }
          />
          {students.length === 0 ? (
            <EmptyState title="No enrolled students in this class" description="Check the school year, grade level and section, or add students first." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <caption className="sr-only">Attendance for the selected class</caption>
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Student</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{studentFullName(s)}</p>
                          <p className="text-xs text-slate-500">{s.student_number}</p>
                        </td>
                        <td className="min-w-[10rem] px-5 py-3">
                          <SelectField
                            label={`Status for ${studentFullName(s)}`}
                            hideLabel
                            options={toOptions(ATTENDANCE_STATUSES)}
                            value={statuses[s.id] ?? 'present'}
                            onChange={(e) => setStatuses((prev) => ({ ...prev, [s.id]: e.target.value as AttendanceStatus }))}
                          />
                        </td>
                        <td className="min-w-[14rem] px-5 py-3">
                          <TextField
                            label={`Remarks for ${studentFullName(s)}`}
                            className="py-2"
                            placeholder="Optional"
                            maxLength={200}
                            value={remarks[s.id] ?? ''}
                            onChange={(e) => setRemarks((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                <p className="text-sm text-slate-600" aria-live="polite">
                  Present {summary.present} - Late {summary.late} - Excused {summary.excused} - Absent {summary.absent}
                </p>
                <Button onClick={() => void save()} loading={saving}>
                  Save attendance
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

/* -------------------------------- records -------------------------------- */

function EditAttendanceModal({ row, onClose, onSaved }: { row: AttendanceRow; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<AttendanceStatus>(row.status);
  const [remarks, setRemarks] = useState(row.remarks ?? '');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await updateAttendance(row.id, { status, remarks: remarks.trim() || null });
      toast.success('Attendance updated');
      onSaved();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="sm"
      title="Edit attendance"
      description={`${row.students ? studentFullName(row.students) : 'Student'} - ${formatDate(row.attendance_date)}`}
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => void submit()} loading={busy}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <SelectField label="Status" options={toOptions(ATTENDANCE_STATUSES)} value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)} />
        <TextAreaField label="Remarks (optional)" rows={2} maxLength={200} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
    </Modal>
  );
}

function Records() {
  const isAdministrator = useIsAdministrator();
  const subjects = useAsyncData(listAllSubjects, []);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<'' | AttendanceStatus>('');
  const [subjectId, setSubjectId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AttendanceRow | null>(null);
  const [toDelete, setToDelete] = useState<AttendanceRow | null>(null);

  const { data, loading, error, reload } = useAsyncData(
    () =>
      listAttendance(
        { dateFrom, dateTo, subjectId, studentId, status: status === '' ? 'all' : status },
        page,
        PAGE_SIZE,
      ),
    [dateFrom, dateTo, status, subjectId, studentId, page],
  );

  const columns: Column<AttendanceRow>[] = [
    { key: 'date', header: 'Date', cell: (r) => formatDate(r.attendance_date) },
    {
      key: 'student',
      header: 'Student',
      cell: (r) =>
        r.students ? (
          <div>
            <p className="font-medium text-slate-900">{studentFullName(r.students)}</p>
            <p className="text-xs text-slate-500">{r.students.student_number} - {r.students.grade_level}</p>
          </div>
        ) : (
          '-'
        ),
    },
    { key: 'subject', header: 'Subject', cell: (r) => r.subjects?.subject_name ?? 'Whole day' },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge> },
    { key: 'remarks', header: 'Remarks', cell: (r) => r.remarks ?? '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-0.5">
          <IconButton icon={Pencil} label="Edit entry" onClick={() => setEditing(r)} />
          {isAdministrator && <IconButton icon={Trash2} tone="danger" label="Delete entry" onClick={() => setToDelete(r)} />}
        </div>
      ),
    },
  ];

  const change = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const filtersActive = Boolean(dateFrom || dateTo || status || subjectId || studentId);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="From" type="date" value={dateFrom} onChange={(e) => change(setDateFrom)(e.target.value)} />
        <TextField label="To" type="date" value={dateTo} onChange={(e) => change(setDateTo)(e.target.value)} />
        <SelectField label="Status" placeholder="All statuses" options={toOptions(ATTENDANCE_STATUSES)} value={status} onChange={(e) => change(setStatus)(e.target.value as '' | AttendanceStatus)} />
        <SelectField
          label="Subject"
          placeholder="All subjects"
          options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.subject_name }))}
          value={subjectId}
          onChange={(e) => change(setSubjectId)(e.target.value)}
        />
      </div>
      <div className="max-w-md">
        <StudentPicker label="Student" placeholder="All students" value={studentId} onChange={change(setStudentId)} />
      </div>

      <DataTable
        caption="Attendance records"
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{
          title: filtersActive ? 'No attendance matches these filters' : 'No attendance recorded yet',
          description: filtersActive ? 'Try a wider date range or clear a filter.' : 'Use "Take attendance" to record a class.',
        }}
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      {editing && <EditAttendanceModal row={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete attendance entry"
        message={toDelete ? `Delete the ${formatDate(toDelete.attendance_date)} entry? This cannot be undone.` : ''}
        confirmLabel="Delete entry"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteAttendance(toDelete.id);
          toast.success('Entry deleted');
          setToDelete(null);
          reload();
        }}
      />
    </div>
  );
}

/* --------------------------------- page ---------------------------------- */

export default function AttendancePage() {
  const [tab, setTab] = useState<'take' | 'records'>('take');
  const tabs = [
    { id: 'take', label: 'Take attendance' },
    { id: 'records', label: 'Records' },
  ] as const;

  return (
    <>
      <PageHeader title="Attendance" description="Record a class in one go, or review and correct past entries." />
      <div role="tablist" aria-label="Attendance views" className="mb-6 inline-flex rounded-xl bg-white p-1 shadow-card">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'take' ? <TakeAttendance /> : <Records />}
      </div>
    </>
  );
}
