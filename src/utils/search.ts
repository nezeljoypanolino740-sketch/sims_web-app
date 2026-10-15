/** Removes characters that have a special meaning in PostgREST filters and LIKE patterns. */
export function sanitizeSearch(term: string): string {
  return term
    .replace(/[%*,()"'\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}
