import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { GRADING_PERIODS, PAGE_SIZE } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import {
  fetchAttendanceReport,
  fetchGradeReport,
  type AttendanceReportRow,
  type GradeReportRow,
  type ReportFilters,
} from '@/services/reportService';
import { getClassOptions, listAllStudents } from '@/services/studentService';
import { listAllSubjects } from '@/services/subjectService';
import type { Student } from '@/types/models';
import { downloadCsv, toCsv } from '@/utils/csv';
import { formatDate, formatPercent, studentFullName, titleCase, todayISO } from '@/utils/format';
import { plainOptions } from '@/utils/options';

type Kind = 'students' | 'attendance' | 'grades';

type Result =
  | { kind: 'students'; rows: Student[] }
  | { kind: 'attendance'; rows: AttendanceReportRow[] }
  | { kind: 'grades'; rows: GradeReportRow[] };

const KINDS: { id: Kind; label: string }[] = [
  { id: 'students', label: 'Student list' },
  { id: 'attendance', label: 'Attendance summary' },
  { id: 'grades', label: 'Grades' },
];

const emptyFilters: Required<ReportFilters> = {
  schoolYear: '',
  gradeLevel: '',
  section: '',
  studentNumber: '',
  dateFrom: '',
  dateTo: '',
  gradingPeriod: '',
  subjectId: '',
};

const studentColumns: Column<Student>[] = [
  { key: 'number', header: 'Student no.', cell: (s) => s.student_number },
  { key: 'name', header: 'Name', cell: (s) => studentFullName(s) },
  { key: 'class', header: 'Class', cell: (s) => `${s.grade_level}${s.section ? ` - ${s.section}` : ''}` },
  { key: 'year', header: 'School year', cell: (s) => s.school_year },
  { key: 'email', header: 'Email', cell: (s) => s.email },
  { key: 'status', header: 'Status', cell: (s) => titleCase(s.enrollment_status) },
];

const attendanceColumns: Column<AttendanceReportRow>[] = [
  { key: 'number', header: 'Student no.', cell: (r) => r.student_number },
  { key: 'name', header: 'Name', cell: (r) => r.student_name },
  { key: 'class', header: 'Class', cell: (r) => `${r.grade_level}${r.section ? ` - ${r.section}` : ''}` },
  { key: 'present', header: 'Present', cell: (r) => r.present },
  { key: 'late', header: 'Late', cell: (r) => r.late },
  { key: 'excused', header: 'Excused', cell: (r) => r.excused },
  { key: 'absent', header: 'Absent', cell: (r) => r.absent },
  { key: 'rate', header: 'Rate', cell: (r) => formatPercent(r.attendance_rate) },
];

const gradeColumns: Column<GradeReportRow>[] = [
  { key: 'number', header: 'Student no.', cell: (r) => r.student_number },
  { key: 'name', header: 'Name', cell: (r) => r.student_name },
  { key: 'subject', header: 'Subject', cell: (r) => r.subject_name },
  { key: 'assessment', header: 'Assessment', cell: (r) => r.assessment_name },
  { key: 'period', header: 'Period', cell: (r) => `${r.grading_period} - ${r.school_year}` },
  { key: 'score', header: 'Score', cell: (r) => `${r.score} / ${r.total_score}` },
  { key: 'pct', header: '%', cell: (r) => formatPercent(r.percentage) },
];

function exportCsv(result: Result): void {
  const stamp = todayISO();
  if (result.kind === 'students') {
    downloadCsv(
      `students-${stamp}`,
      toCsv(
        ['Student number', 'First name', 'Middle name', 'Last name', 'Date of birth', 'Gender', 'Email', 'Phone', 'Grade level', 'Section', 'School year', 'Status'],
        result.rows.map((s) => [s.student_number, s.first_name, s.middle_name, s.last_name, s.date_of_birth, s.gender, s.email, s.phone, s.grade_level, s.section, s.school_year, s.enrollment_status]),
      ),
    );
  } else if (result.kind === 'attendance') {
    downloadCsv(
      `attendance-summary-${stamp}`,
      toCsv(
        ['Student number', 'Name', 'Grade level', 'Section', 'Present', 'Late', 'Excused', 'Absent', 'Total entries', 'Attendance rate (%)'],
        result.rows.map((r) => [r.student_number, r.student_name, r.grade_level, r.section, r.present, r.late, r.excused, r.absent, r.total, r.attendance_rate === null ? '' : r.attendance_rate.toFixed(1)]),
      ),
    );
  } else {
    downloadCsv(
      `grades-${stamp}`,
      toCsv(
        ['Student number', 'Name', 'Grade level', 'Section', 'Subject', 'Grading period', 'School year', 'Assessment', 'Score', 'Total score', 'Percentage'],
        result.rows.map((r) => [r.student_number, r.student_name, r.grade_level, r.section, r.subject_name, r.grading_period, r.school_year, r.assessment_name, r.score, r.total_score, r.percentage.toFixed(1)]),
      ),
    );
  }
}

export default function ReportsPage() {
  const classOptions = useAsyncData(getClassOptions, []);
  const subjects = useAsyncData(listAllSubjects, []);
  const [kind, setKind] = useState<Kind>('students');
  const [filters, setFilters] = useState<Required<ReportFilters>>(emptyFilters);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const set = (key: keyof ReportFilters) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const switchKind = (next: Kind) => {
    setKind(next);
    setResult(null);
    setError(null);
    setPage(1);
  };

  const generate = async () => {
    setError(null);
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      setError('The "From" date must be on or before the "To" date.');
      return;
    }
    setLoading(true);
    try {
      if (kind === 'students') {
        const rows = await listAllStudents({
          schoolYear: filters.schoolYear,
          gradeLevel: filters.gradeLevel,
          section: filters.section,
          search: filters.studentNumber,
          status: 'all',
        });
        setResult({ kind, rows });
      } else if (kind === 'attendance') {
        setResult({ kind, rows: await fetchAttendanceReport(filters) });
      } else {
        setResult({ kind, rows: await fetchGradeReport(filters) });
      }
      setPage(1);
    } catch (err) {
      setError(getErrorMessage(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onExport = () => {
    if (!result || result.rows.length === 0) return;
    exportCsv(result);
    toast.success('CSV downloaded');
  };

  const start = (page - 1) * PAGE_SIZE;
  const slice = <T,>(rows: T[]): T[] => rows.slice(start, start + PAGE_SIZE);

  return (
    <>
      <PageHeader title="Reports" description="Choose a report, narrow it with filters, preview it and export it to CSV." />

      <div role="tablist" aria-label="Report type" className="mb-6 inline-flex flex-wrap rounded-xl bg-white p-1 shadow-card">
        {KINDS.map((k) => (
          <button
            key={k.id}
            role="tab"
            type="button"
            aria-selected={kind === k.id}
            onClick={() => switchKind(k.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${kind === k.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50'}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title="Filters" description="Leave a filter empty to include everything." />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="School year" placeholder="All school years" options={plainOptions(classOptions.data?.schoolYears ?? [])} value={filters.schoolYear} onChange={(e) => set('schoolYear')(e.target.value)} />
          <SelectField label="Grade level" placeholder="All grade levels" options={plainOptions(classOptions.data?.gradeLevels ?? [])} value={filters.gradeLevel} onChange={(e) => set('gradeLevel')(e.target.value)} />
          <SelectField label="Section" placeholder="All sections" options={plainOptions(classOptions.data?.sections ?? [])} value={filters.section} onChange={(e) => set('section')(e.target.value)} />
          <TextField label="Student ID (student number)" placeholder="e.g. 2026-0001" value={filters.studentNumber} onChange={(e) => set('studentNumber')(e.target.value.trim())} />
          {kind === 'attendance' && (
            <>
              <TextField label="From" type="date" value={filters.dateFrom} onChange={(e) => set('dateFrom')(e.target.value)} />
              <TextField label="To" type="date" value={filters.dateTo} onChange={(e) => set('dateTo')(e.target.value)} />
            </>
          )}
          {kind === 'grades' && (
            <SelectField label="Grading period / semester" placeholder="All periods" options={plainOptions(GRADING_PERIODS)} value={filters.gradingPeriod} onChange={(e) => set('gradingPeriod')(e.target.value)} />
          )}
          {kind !== 'students' && (
            <SelectField
              label="Subject"
              placeholder="All subjects"
              options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.subject_name }))}
              value={filters.subjectId}
              onChange={(e) => set('subjectId')(e.target.value)}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-4">
          <Button onClick={() => void generate()} loading={loading}>
            Generate report
          </Button>
          <Button variant="secondary" onClick={() => setFilters(emptyFilters)} disabled={loading}>
            Clear filters
          </Button>
        </div>
      </Card>

      {error && (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600" aria-live="polite">
              {result.rows.length} {result.rows.length === 1 ? 'row' : 'rows'}
              {result.kind === 'attendance' && filters.dateFrom ? ` from ${formatDate(filters.dateFrom)}` : ''}
            </p>
            <Button variant="secondary" onClick={onExport} disabled={result.rows.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
            </Button>
          </div>

          {result.kind === 'students' && (
            <DataTable caption="Student list report" columns={studentColumns} rows={slice(result.rows)} rowKey={(r) => r.id} empty={{ title: 'No students match these filters' }} page={page} pageSize={PAGE_SIZE} total={result.rows.length} onPageChange={setPage} />
          )}
          {result.kind === 'attendance' && (
            <DataTable caption="Attendance summary report" columns={attendanceColumns} rows={slice(result.rows)} rowKey={(r) => r.student_number} empty={{ title: 'No attendance matches these filters' }} page={page} pageSize={PAGE_SIZE} total={result.rows.length} onPageChange={setPage} />
          )}
          {result.kind === 'grades' && (
            <DataTable caption="Grades report" columns={gradeColumns} rows={slice(result.rows)} rowKey={(r) => `${r.student_number}-${r.subject_name}-${r.grading_period}-${r.assessment_name}`} empty={{ title: 'No grades match these filters' }} page={page} pageSize={PAGE_SIZE} total={result.rows.length} onPageChange={setPage} />
          )}
        </div>
      )}
    </>
  );
}
