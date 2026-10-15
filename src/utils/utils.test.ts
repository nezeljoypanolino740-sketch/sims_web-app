import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';
import { formatPercent, initials, studentFullName, titleCase } from './format';
import { pageCount, pageRange } from './pagination';
import { sanitizeSearch } from './search';

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"']])).toBe('a,b\r\n"x,y","say ""hi"""');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(toCsv(['a'], [['=SUM(A1:A2)'], ['+1'], ['@cmd']])).toBe("a\r\n'=SUM(A1:A2)\r\n'+1\r\n'@cmd");
  });

  it('keeps negative numbers as numbers', () => {
    expect(toCsv(['n'], [[-5]])).toBe('n\r\n-5');
  });
});

describe('search and pagination', () => {
  it('removes characters that break filters', () => {
    expect(sanitizeSearch('  a,b(c)%d*  ')).toBe('a b c d');
  });

  it('computes inclusive ranges and page counts', () => {
    expect(pageRange(1, 10)).toEqual([0, 9]);
    expect(pageRange(3, 10)).toEqual([20, 29]);
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(25, 10)).toBe(3);
  });
});

describe('format', () => {
  it('formats names, statuses and percentages', () => {
    expect(studentFullName({ first_name: 'Ana', middle_name: null, last_name: 'Cruz' })).toBe('Ana Cruz');
    expect(titleCase('on_leave')).toBe('On leave');
    expect(formatPercent(87.456)).toBe('87.5%');
    expect(formatPercent(null)).toBe('-');
    expect(initials('Ana Maria Cruz')).toBe('AC');
  });
});
