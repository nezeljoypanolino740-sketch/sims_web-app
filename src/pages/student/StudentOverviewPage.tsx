import { CalendarCheck, ClipboardList, Percent, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GradeChart } from '@/components/charts/DashboardCharts';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMyStudent } from '@/hooks/useMyStudent';
import { getActiveAcademicYear } from '@/services/academicYearService';
import { listMyAttendance, listMyGrades } from '@/services/studentPortalService';
import { averagePercent, subjectAverages, summarizeAttendance } from '@/utils/academic';
import { formatPercent, studentFullName, titleCase } from '@/utils/format';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

export default function StudentOverviewPage() {
  const me = useMyStudent();
  const grades = useAsyncData(listMyGrades, []);
  const attendance = useAsyncData(listMyAttendance, []);
  const term = useAsyncData(getActiveAcademicYear, []);

  const student = me.student;
  const gradeList = grades.data ?? [];
  const summary = summarizeAttendance(attendance.data ?? []);
  const average = averagePercent(gradeList);
  const bySubject = subjectAverages(gradeList);
  const error = me.error ?? grades.error ?? attendance.error;
  const loadingAny = me.loading || grades.loading || attendance.loading;

  if (!me.loading && !me.error && !student) {
    return (
      <>
        <PageHeader title="Overview" />
        <Card>
          <EmptyState title="No student record is linked to your account" description="Ask the school office to link your account, then sign in again." />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={student ? `Welcome, ${student.first_name}` : 'Overview'} description="Your grades and attendance at a glance." />

      {error && (
        <div className="mb-6">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <Card>
        <CardHeader title="My details" />
        {me.loading && !student ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : student ? (
          <dl className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Student number" value={student.student_number} />
            <Fact label="Full name" value={studentFullName(student)} />
            <Fact label="Grade level and section" value={`${student.grade_level}${student.section ? ` - ${student.section}` : ''}`} />
            <Fact label="Current term" value={term.data ? `${term.data.school_year}, ${term.data.semester}` : student.school_year} />
          </dl>
        ) : null}
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Average grade" value={formatPercent(average)} icon={Percent} loading={grades.loading && !grades.data} hint={`${gradeList.length} assessments`} />
        <StatCard label="Attendance rate" value={formatPercent(summary.rate)} icon={CalendarCheck} loading={attendance.loading && !attendance.data} hint={`${summary.total} entries`} />
        <StatCard label="Absences" value={summary.absent} icon={UserX} loading={attendance.loading && !attendance.data} hint={`${summary.late} late`} />
        <StatCard label="Subjects graded" value={bySubject.length} icon={ClipboardList} loading={grades.loading && !grades.data} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Performance by subject" description="Average percentage per subject" action={<Link to="/student/grades" className="text-sm font-medium text-brand-700 hover:underline">All grades</Link>} />
          <div className="p-5">
            {grades.loading && !grades.data ? (
              <Skeleton className="h-72 w-full" />
            ) : bySubject.length === 0 ? (
              <EmptyState title="No grades yet" description="Your grades will show here once your teachers post them." />
            ) : (
              <GradeChart data={bySubject.map((s) => ({ subject: s.subject, average: Math.round(s.average * 100) / 100 }))} />
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Attendance summary" action={<Link to="/student/attendance" className="text-sm font-medium text-brand-700 hover:underline">Details</Link>} />
            <div className="flex flex-wrap gap-3 p-5">
              <Badge tone="success">Present {summary.present}</Badge>
              <Badge tone="warning">Late {summary.late}</Badge>
              <Badge tone="warning">Excused {summary.excused}</Badge>
              <Badge tone="danger">Absent {summary.absent}</Badge>
            </div>
          </Card>

          <Card>
            <CardHeader title="Latest grades" />
            {loadingAny && gradeList.length === 0 ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : gradeList.length === 0 ? (
              <EmptyState title="Nothing posted yet" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {gradeList.slice(0, 5).map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span>
                      <span className="block font-medium text-slate-900">{g.assessment_name}</span>
                      <span className="text-xs text-slate-500">
                        {g.subject_name} - {titleCase(g.grading_period)}
                      </span>
                    </span>
                    <Badge tone="brand">
                      {g.score} / {g.total_score}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
