import { useState } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField } from '@/components/ui/SelectField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { PAGE_SIZE } from '@/lib/constants';
import { listActivityLogs, type ActivityLogRow } from '@/services/dashboardService';
import { formatDateTime, titleCase } from '@/utils/format';

const ENTITY_TYPES = ['students', 'teachers', 'subjects', 'grades', 'attendance', 'academic_years', 'profiles'];
const ACTION_TONE: Record<string, BadgeTone> = { insert: 'success', update: 'brand', delete: 'danger' };
const ACTION_LABEL: Record<string, string> = { insert: 'Added', update: 'Updated', delete: 'Deleted' };

export default function ActivityLogsPage() {
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsyncData(() => listActivityLogs(page, PAGE_SIZE, entityType || undefined), [page, entityType]);

  const columns: Column<ActivityLogRow>[] = [
    { key: 'when', header: 'When', cell: (l) => formatDateTime(l.created_at) },
    { key: 'who', header: 'Who', cell: (l) => l.profiles?.full_name || 'System' },
    { key: 'action', header: 'Action', cell: (l) => <Badge tone={ACTION_TONE[l.action] ?? 'neutral'}>{ACTION_LABEL[l.action] ?? titleCase(l.action)}</Badge> },
    { key: 'entity', header: 'Record type', cell: (l) => titleCase(l.entity_type) },
    { key: 'id', header: 'Record ID', cell: (l) => <code className="text-xs text-slate-500">{l.entity_id ? l.entity_id.slice(0, 8) : '-'}</code> },
  ];

  return (
    <>
      <PageHeader title="Activity logs" description="Every change to school records, written automatically by the database. Logs cannot be edited from the app." />
      <div className="mb-4 max-w-xs">
        <SelectField
          label="Record type"
          hideLabel
          placeholder="All record types"
          options={ENTITY_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable
        caption="Activity logs"
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(l) => l.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{ title: 'No activity yet', description: 'Changes to students, grades, attendance and accounts will appear here.' }}
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}
