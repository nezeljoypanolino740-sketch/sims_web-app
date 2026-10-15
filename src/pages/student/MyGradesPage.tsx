import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField } from '@/components/ui/SelectField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { PAGE_SIZE } from '@/lib/constants';
import { listMyGrades, type MyGrade } from '@/services/studentPortalService';
import { averagePercent, percentOf, subjectAverages } from '@/utils/academic';
import { formatDate, formatPercent } from '@/utils/format';
import { slicePage } from '@/utils/pagination';
import { plainOptions } from '@/utils/options';

export default function MyGradesPage() {
  const { data, loading, error, reload } = useAsyncData(listMyGrades, []);
  const [schoolYear, setSchoolYear] = useState('');
  const [gradingPeriod, setGradingPeriod] = useState('');
  const [subject, setSubject] = useState('');
  const [page, setPage] = useState(1);

  const all = data ?? [];
  const filtered = useMemo(
    () =>
      all.filter(
        (g) =>
          (!schoolYear || g.school_year === schoolYear) &&
          (!gradingPeriod || g.grading_period === gradingPeriod) &&
          (!subject || g.subject_name === subject),
      ),
    [all, schoolYear, gradingPeriod, subject],
  );

  const years = [...new Set(all.map((g) => g.school_year))].sort().reverse();
  const periods = [...new Set(all.map((g) => g.grading_period))];
  const subjects = [...new Set(all.map((g) => g.subject_name))].sort();
  const bySubject = subjectAverages(filtered);
  const overall = averagePercent(filtered);

  const change = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const columns: Column<MyGrade>[] = [
    { key: 'subject', header: 'Subject', cell: (g) => <span className="font-medium text-slate-900">{g.subject_name}</span> },
    { key: 'assessment', header: 'Assessment', cell: (g) => g.assessment_name },
    { key: 'period', header: 'Period', cell: (g) => `${g.grading_period} - ${g.school_year}` },
    { key: 'score', header: 'Score', cell: (g) => `${g.score} / ${g.total_score}` },
    { key: 'pct', header: '%', cell: (g) => formatPercent(percentOf(g.score, g.total_score)) },
    { key: 'remarks', header: 'Remarks', cell: (g) => g.remarks ?? '-' },
    { key: 'date', header: 'Posted', cell: (g) => formatDate(g.created_at) },
  ];

  return (
    <>
      <PageHeader title="My grades" description="Every assessment your teachers have posted for you." />

      {error && (
        <div className="mb-6 space-y-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SelectField label="School year" placeholder="All school years" options={plainOptions(years)} value={schoolYear} onChange={(e) => change(setSchoolYear)(e.target.value)} />
        <SelectField label="Grading period" placeholder="All periods" options={plainOptions(periods)} value={gradingPeriod} onChange={(e) => change(setGradingPeriod)(e.target.value)} />
        <SelectField label="Subject" placeholder="All subjects" options={plainOptions(subjects)} value={subject} onChange={(e) => change(setSubject)(e.target.value)} />
      </div>

      {bySubject.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Summary" description={`Overall average ${formatPercent(overall)} across ${filtered.length} assessments`} />
          <ul className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
            {bySubject.map((s) => (
              <li key={s.subject} className="flex items-center justify-between bg-white px-5 py-3 text-sm">
                <span className="text-slate-700">{s.subject}</span>
                <span className="font-semibold text-slate-900">{formatPercent(s.average)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <DataTable
        caption="My grades"
        columns={columns}
        rows={slicePage(filtered, page, PAGE_SIZE)}
        rowKey={(g) => g.id}
        loading={loading}
        error={null}
        empty={{
          title: all.length === 0 ? 'No grades yet' : 'No grades match these filters',
          description: all.length === 0 ? 'Your grades will appear here once they are posted.' : 'Try clearing a filter.',
        }}
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
      />
    </>
  );
}
