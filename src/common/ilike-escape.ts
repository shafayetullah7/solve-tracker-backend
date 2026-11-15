/** Build a literal ILIKE contains pattern (wildcards in user input are stripped). */
export function escapeIlikePattern(raw: string): string {
  const safe = raw.replaceAll('%', '').replaceAll('_', '');
  return `%${safe}%`;
}