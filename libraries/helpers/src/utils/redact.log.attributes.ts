const SENSITIVE_KEY = /(token|secret|password|passwd|authorization|auth|cookie|session|api[-_]?key|apikey|credential|signature|private[-_]?key)/i;

const MAX_VALUE_LENGTH = 2048;

export const redactLogAttributes = (attributes: Record<string, any>) => {
  const redacted: Record<string, any> = {};

  for (const [key, value] of Object.entries(attributes || {})) {
    if (SENSITIVE_KEY.test(key)) {
      redacted[key] = '[redacted]';
      continue;
    }

    if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) {
      redacted[key] = `${value.slice(0, MAX_VALUE_LENGTH)}…[truncated]`;
      continue;
    }

    redacted[key] = value;
  }

  return redacted;
};
