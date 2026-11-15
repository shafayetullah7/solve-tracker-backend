/** Unicode code points, matching auth/topic name counting. */
export function measureCodePoints(value: string): number {
  return Array.from(value).length;
}