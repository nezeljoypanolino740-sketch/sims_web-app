import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, loading = false, hint }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        {loading ? <Skeleton className="mt-1 h-7 w-16" /> : <p className="text-2xl font-bold text-slate-900">{value}</p>}
        {hint && !loading && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </Card>
  );
}
