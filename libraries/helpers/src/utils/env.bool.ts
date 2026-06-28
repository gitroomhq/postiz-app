const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function isEnvTrue(value?: string | null) {
  return typeof value === 'string' && TRUE_VALUES.has(value.trim().toLowerCase());
}
