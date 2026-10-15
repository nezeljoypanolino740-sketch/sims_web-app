import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useAsyncData } from '@/hooks/useAsyncData';
import { listMyGrades } from '@/services/studentPortalService';
import { averagePercent, termSummaries } from '@/utils/academic';
import { formatPercent } from '@/utils/format';

export default function AcademicHistoryPage() {
  const { data, loading, error, reload } = useAsyncData(listMyGrades, []);
  const grades = data ?? [];
  const terms = termSummaries(grades);
  const overall = averagePercent(grades);

  return (
    <>
      <PageHeader
        title="Academic history"
        description={grades.length > 0 ? `Cumulative average ${formatPercent(overall)} across ${grades.length} assessments.` : 'Your grades by school year and grading period.'}
      />

      {error && (
        <div className="mb-6 space-y-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </div>
      )}

      {!loading && !error && terms.length === 0 && (
        <Card>
          <EmptyState title="No academic history yet" description="Each school year and grading period will be summarised here once grades are posted." />
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {terms.map((t) => (
          <Card key={`${t.schoolYear}-${t.gradingPeriod}`}>
            <CardHeader
              title={`${t.schoolYear} - ${t.gradingPeriod}`}
              description={`${t.assessments} assessments`}
              action={<Badge tone="brand">Average {formatPercent(t.average)}</Badge>}
            />
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <caption className="sr-only">{`Subject averages for ${t.schoolYear} ${t.gradingPeriod}`}</caption>
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-semibold">Subject</th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">Assessments</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {t.subjects.map((s) => (
                  <tr key={s.subject}>
                    <td className="px-5 py-2.5 text-slate-800">{s.subject}</td>
                    <td className="px-5 py-2.5 text-slate-600">{s.count}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-900">{formatPercent(s.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </>
  );
}
