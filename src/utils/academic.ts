import { GRADING_PERIODS } from '@/lib/constants';
import type { AttendanceStatus } from '@/types/models';

export interface GradeEntry {
  score: number;
  total_score: number;
  school_year: string;
  grading_period: string;
  subject_name: string;
}

export interface SubjectAverage {
  subject: string;
  average: number;
  count: number;
}

export interface TermSummary {
  schoolYear: string;
  gradingPeriod: string;
  assessments: number;
  average: number | null;
  subjects: SubjectAverage[];
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  /** (present + late) / (all entries except excused), as a percentage. */
  rate: number | null;
}

export function percentOf(score: number, total: number): number {
  return total > 0 ? (score / total) * 100 : 0;
}

/** Mean of each assessment's percentage (the same method the staff dashboard uses). */
export function averagePercent(entries: readonly Pick<GradeEntry, 'score' | 'total_score'>[]): number | null {
  if (entries.length === 0) return null;
  const sum = entries.reduce((acc, e) => acc + percentOf(e.score, e.total_score), 0);
  return sum / entries.length;
}

export function subjectAverages(entries: readonly GradeEntry[]): SubjectAverage[] {
  const groups = new Map<string, GradeEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.subject_name);
    if (list) list.push(e);
    else groups.set(e.subject_name, [e]);
  }
  return [...groups.entries()]
    .map(([subject, list]) => ({ subject, average: averagePercent(list) ?? 0, count: list.length }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

function periodRank(period: string): number {
  const index = (GRADING_PERIODS as readonly string[]).indexOf(period);
  return index === -1 ? GRADING_PERIODS.length : index;
}

/** One summary per school year and grading period, newest school year first. */
export function termSummaries(entries: readonly GradeEntry[]): TermSummary[] {
  const groups = new Map<string, GradeEntry[]>();
  for (const e of entries) {
    const key = `${e.school_year}|${e.grading_period}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  return [...groups.values()]
    .map((list) => {
      const first = list[0];
      return {
        schoolYear: first?.school_year ?? '',
        gradingPeriod: first?.grading_period ?? '',
        assessments: list.length,
        average: averagePercent(list),
        subjects: subjectAverages(list),
      };
    })
    .sort((a, b) => b.schoolYear.localeCompare(a.schoolYear) || periodRank(a.gradingPeriod) - periodRank(b.gradingPeriod));
}

export function summarizeAttendance(rows: readonly { status: AttendanceStatus }[]): AttendanceSummary {
  const summary: AttendanceSummary = { present: 0, absent: 0, late: 0, excused: 0, total: rows.length, rate: null };
  for (const row of rows) summary[row.status] += 1;
  const counted = summary.total - summary.excused;
  summary.rate = counted > 0 ? ((summary.present + summary.late) / counted) * 100 : null;
  return summary;
}
