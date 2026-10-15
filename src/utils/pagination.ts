/** Inclusive row range for Supabase .range(), for a 1-based page number. */
export function pageRange(page: number, pageSize: number): [number, number] {
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * pageSize;
  return [from, from + pageSize - 1];
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Client-side paging for lists that are already loaded (1-based page). */
export function slicePage<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const start = (Math.max(1, page) - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
