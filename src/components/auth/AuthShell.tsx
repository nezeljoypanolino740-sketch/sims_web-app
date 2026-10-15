import type { ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-brand-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          SIMS School Portal
        </div>
        <div className="max-w-sm space-y-3">
          <p className="text-3xl font-bold leading-tight">Grades, attendance and student records in one place.</p>
          <p className="text-brand-200">Students see their own records. Staff manage the school day. Every action is checked by the database.</p>
        </div>
        <p className="text-sm text-brand-300">Student Information Management System</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-slate-600">{subtitle}</p>}
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8">{children}</div>
          {footer && <div className="text-center text-sm text-slate-600">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
