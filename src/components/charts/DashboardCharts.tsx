import type { ReactElement } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AttendanceTrendPoint, DashboardStats } from '@/types/models';

const COLORS = {
  brand: '#7c3aed',
  present: '#10b981',
  late: '#f59e0b',
  absent: '#ef4444',
  excused: '#a78bfa',
} as const;

function ChartFrame({ label, children }: { label: string; children: ReactElement }) {
  return (
    <div role="img" aria-label={label} className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function EnrollmentChart({ data }: { data: DashboardStats['enrollment_by_grade_level'] }) {
  return (
    <ChartFrame label="Bar chart of enrolled students per grade level">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="grade_level" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="total" name="Students" fill={COLORS.brand} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

export function AttendanceChart({ data }: { data: AttendanceTrendPoint[] }) {
  const shown = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <ChartFrame label="Stacked bar chart of daily attendance for the last two weeks">
      <BarChart data={shown} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="present" name="Present" stackId="a" fill={COLORS.present} />
        <Bar dataKey="late" name="Late" stackId="a" fill={COLORS.late} />
        <Bar dataKey="excused" name="Excused" stackId="a" fill={COLORS.excused} />
        <Bar dataKey="absent" name="Absent" stackId="a" fill={COLORS.absent} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

export function GradeChart({ data }: { data: DashboardStats['grade_by_subject'] }) {
  return (
    <ChartFrame label="Bar chart of average grade percentage per subject">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => `${value}%`} />
        <Bar dataKey="average" name="Average %" fill={COLORS.brand} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}
