import { describe, expect, it } from 'vitest';
import { averagePercent, subjectAverages, summarizeAttendance, termSummaries, type GradeEntry } from './academic';

const g = (subject: string, score: number, total: number, year = '2026-2027', period = 'Prelim'): GradeEntry => ({
  subject_name: subject,
  score,
  total_score: total,
  school_year: year,
  grading_period: period,
});

describe('grade maths', () => {
  it('averages assessment percentages and handles no grades', () => {
    expect(averagePercent([g('Math', 8, 10), g('Math', 50, 100)])).toBe(65);
    expect(averagePercent([])).toBeNull();
  });

  it('groups by subject', () => {
    const result = subjectAverages([g('Math', 9, 10), g('Science', 5, 10), g('Math', 7, 10)]);
    expect(result).toEqual([
      { subject: 'Math', average: 80, count: 2 },
      { subject: 'Science', average: 50, count: 1 },
    ]);
  });

  it('orders terms newest year first, then Prelim to Final', () => {
    const terms = termSummaries([
      g('Math', 1, 1, '2025-2026', 'Final'),
      g('Math', 1, 1, '2026-2027', 'Midterm'),
      g('Math', 1, 1, '2026-2027', 'Prelim'),
    ]);
    expect(terms.map((t) => `${t.schoolYear} ${t.gradingPeriod}`)).toEqual([
      '2026-2027 Prelim',
      '2026-2027 Midterm',
      '2025-2026 Final',
    ]);
  });
});

describe('attendance summary', () => {
  it('counts late as attended and leaves excused out of the rate', () => {
    const summary = summarizeAttendance([
      { status: 'present' },
      { status: 'late' },
      { status: 'absent' },
      { status: 'excused' },
    ]);
    expect(summary).toMatchObject({ present: 1, late: 1, absent: 1, excused: 1, total: 4 });
    expect(summary.rate).toBeCloseTo(66.67, 1);
  });

  it('has no rate when nothing was recorded', () => {
    expect(summarizeAttendance([]).rate).toBeNull();
  });
});
