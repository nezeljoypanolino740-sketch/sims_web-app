import { useState, type FormEvent, type ReactNode } from 'react';
import { BarChart3, CalendarCheck, ClipboardList, GraduationCap, Search, UserCheck, UserPlus, Users, Percent } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AttendanceChart, EnrollmentChart, GradeChart } from '@/components/charts/DashboardCharts';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useBasePath, useIsAdministrator } from '@/hooks/useBasePath';
import { getDashboardStats } from '@/services/dashboardService';
import type { DashboardStats } from '@/types/models';
import { formatDateTime, formatPercent } from '@/utils/format';

const ACTION_WORDS: Record<string, string> = { insert: 'added', update: 'updated', delete: 'deleted' };

function attendanceRate(stats: DashboardStats): number | null {
  const s = stats.attendance_by_status;
  const present = s.present ?? 0;
  const late = s.late ?? 0;
  const absent = s.absent ?? 0;
  const counted = present + late + absent;
  return counted > 0 ? ((present + late) / counted) * 100 : null;
}

function ChartCard({ title, description, empty, loading, children }: { title: string; description: string; empty: boolean; loading: boolean; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="p-5">
        {loading ? <Skeleton className="h-72 w-full" /> : empty ? <EmptyState title="No data yet" description="This chart fills in as records are added." /> : children}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const base = useBasePath();
  const isAdministrator = useIsAdministrator();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useAsyncData(getDashboardStats, []);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `${base}/students?q=${encodeURIComponent(term)}` : `${base}/students`);
  };

  const rate = data ? attendanceRate(data) : null;

  return (
    <>
      <PageHeader title={isAdministrator ? 'Administrator dashboard' : 'Admin dashboard'} description="School-wide numbers, straight from the database." />

      {error && (
        <div className="mb-6 space-y-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      <form onSubmit={onSearch} role="search" className="mb-6 flex max-w-xl gap-2">
        <label htmlFor="dash-search" className="sr-only">
          Search students
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="dash-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a student by name, number or email"
            className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm placeholder:text-slate-400"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Students" value={data?.total_students ?? 0} icon={Users} loading={loading && !data} hint="Not archived" />
        <StatCard label="Teachers" value={data?.total_teachers ?? 0} icon={GraduationCap} loading={loading && !data} hint="Active" />
        <StatCard label="Active accounts" value={data?.active_accounts ?? 0} icon={UserCheck} loading={loading && !data} />
        <StatCard label="Average grade" value={formatPercent(data?.average_grade)} icon={Percent} loading={loading && !data} />
        <StatCard label="Attendance rate" value={formatPercent(rate)} icon={CalendarCheck} loading={loading && !data} hint="Last 30 days" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Quick actions" />
        <div className="flex flex-wrap gap-3 p-5">
          <Link to={`${base}/students?new=1`} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Add student
          </Link>
          <Link to={`${base}/attendance`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Take attendance
          </Link>
          <Link to={`${base}/grades?new=1`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <ClipboardList className="h-4 w-4" aria-hidden="true" /> Add grade
          </Link>
          <Link to={`${base}/reports`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <BarChart3 className="h-4 w-4" aria-hidden="true" /> Reports
          </Link>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="Student enrollment" description="Students per grade level" loading={loading && !data} empty={!!data && data.enrollment_by_grade_level.length === 0}>
          <EnrollmentChart data={data?.enrollment_by_grade_level ?? []} />
        </ChartCard>
        <ChartCard title="Attendance" description="Daily entries, last 14 days" loading={loading && !data} empty={!!data && data.attendance_trend.length === 0}>
          <AttendanceChart data={data?.attendance_trend ?? []} />
        </ChartCard>
        <ChartCard title="Grade performance" description="Average percentage per subject" loading={loading && !data} empty={!!data && data.grade_by_subject.length === 0}>
          <GradeChart data={data?.grade_by_subject ?? []} />
        </ChartCard>

        {isAdministrator && (
          <Card>
            <CardHeader title="Recent activity" description="Latest changes across the system" action={<Link to={`${base}/activity-logs`} className="text-sm font-medium text-brand-700 hover:underline">View all</Link>} />
            {loading && !data ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : !data || data.recent_activities.length === 0 ? (
              <EmptyState title="No activity yet" description="Changes to students, grades and attendance will be listed here." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recent_activities.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="text-slate-700">
                      <strong className="font-semibold text-slate-900">{a.actor_name ?? 'System'}</strong> {ACTION_WORDS[a.action] ?? a.action} a {a.entity_type.replace(/_/g, ' ')} record
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDateTime(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
