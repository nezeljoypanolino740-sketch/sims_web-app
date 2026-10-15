import { useMemo, useState } from 'react';
import { CalendarCheck, Clock, ShieldCheck, UserX } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField } from '@/components/ui/SelectField';
import { StatCard } from '@/components/ui/StatCard';
import { TextField } from '@/components/ui/TextField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ATTENDANCE_STATUSES, PAGE_SIZE } from '@/lib/constants';
import { listMyAttendance, type MyAttendance } from '@/services/studentPortalService';
import type { AttendanceStatus } from '@/types/models';
import { summarizeAttendance } from '@/utils/academic';
import { formatDate, formatPercent, titleCase } from '@/utils/format';
import { slicePage } from '@/utils/pagination';
import { toOptions } from '@/utils/options';

export default function MyAttendancePage() {
  const { data, loading, error, reload } = useAsyncData(listMyAttendance, []);
  const [status, setStatus] = useState<'' | AttendanceStatus>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const all = data ?? [];
  const filtered = useMemo(
    () =>
      all.filter(
        (a) =>
          (!status || a.status === status) &&
          (!dateFrom || a.attendance_date >= dateFrom) &&
          (!dateTo || a.attendance_date <= dateTo),
      ),
    [all, status, dateFrom, dateTo],
  );
  const summary = summarizeAttendance(filtered);

  const columns: Column<MyAttendance>[] = [
    { key: 'date', header: 'Date', cell: (a) => formatDate(a.attendance_date) },
    { key: 'subject', header: 'Subject', cell: (a) => a.subject_name ?? 'Whole day' },
    { key: 'status', header: 'Status', cell: (a) => <Badge tone={statusTone(a.status)}>{titleCase(a.status)}</Badge> },
    { key: 'remarks', header: 'Remarks', cell: (a) => a.remarks ?? '-' },
  ];

  return (
    <>
      <PageHeader title="My attendance" description="Your attendance record, newest first." />

      {error && (
        <div className="mb-6 space-y-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance rate" value={formatPercent(summary.rate)} icon={CalendarCheck} loading={loading && !data} hint="Late counts as attended" />
        <StatCard label="Late" value={summary.late} icon={Clock} loading={loading && !data} />
        <StatCard label="Excused" value={summary.excused} icon={ShieldCheck} loading={loading && !data} />
        <StatCard label="Absent" value={summary.absent} icon={UserX} loading={loading && !data} />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SelectField label="Status" placeholder="All statuses" options={toOptions(ATTENDANCE_STATUSES)} value={status} onChange={(e) => { setStatus(e.target.value as '' | AttendanceStatus); setPage(1); }} />
        <TextField label="From" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        <TextField label="To" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
      </div>

      <DataTable
        caption="My attendance"
        columns={columns}
        rows={slicePage(filtered, page, PAGE_SIZE)}
        rowKey={(a) => a.id}
        loading={loading}
        error={null}
        empty={{
          title: all.length === 0 ? 'No attendance recorded yet' : 'No entries match these filters',
          description: all.length === 0 ? 'Your attendance will appear here after your teachers record it.' : 'Try a wider date range.',
        }}
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
      />
    </>
  );
}
