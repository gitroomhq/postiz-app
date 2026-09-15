export function toOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(String(value));
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}
