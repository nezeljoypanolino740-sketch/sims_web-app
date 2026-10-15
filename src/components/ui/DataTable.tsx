import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty: { title: string; description?: string; action?: ReactNode };
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  empty,
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
}: DataTableProps<T>) {
  const firstLoad = loading && rows.length === 0;

  return (
    <Card className="overflow-hidden">
      {error && (
        <div className="space-y-3 p-5">
          <Alert tone="error">{error}</Alert>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}

      {!error && !firstLoad && rows.length === 0 ? (
        <EmptyState {...empty} />
      ) : (
        !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm" aria-busy={loading}>
              <caption className="sr-only">{caption}</caption>
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} scope="col" className={cn('whitespace-nowrap px-5 py-3 font-semibold', column.className)}>
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cn('divide-y divide-slate-100', loading && !firstLoad && 'opacity-60')}>
                {firstLoad
                  ? Array.from({ length: 5 }, (_, i) => (
                      <tr key={i}>
                        {columns.map((column) => (
                          <td key={column.key} className="px-5 py-4">
                            <Skeleton className="h-4 w-full max-w-[10rem]" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : rows.map((row) => (
                      <tr key={rowKey(row)} className="hover:bg-brand-50/40">
                        {columns.map((column) => (
                          <td key={column.key} className={cn('px-5 py-3.5 align-middle text-slate-700', column.className)}>
                            {column.cell(row)}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {!error && total !== undefined && onPageChange && total > pageSize && (
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
      )}
    </Card>
  );
}
