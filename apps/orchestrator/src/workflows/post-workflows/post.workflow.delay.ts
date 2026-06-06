const MAX_UI_COMMENT_DELAY_MINUTES = 120;

export const commentDelayToMilliseconds = (delay?: number | string | null) => {
  const numericDelay = Math.max(0, Number(delay ?? 0));

  if (!Number.isFinite(numericDelay) || numericDelay === 0) {
    return 0;
  }

  // UI-created comment delays are stored in minutes (1, 2, 5, 120, ...).
  // Public API / CLI-created comment delays are documented in milliseconds
  // and default to 5000. Treat values above the largest UI preset as the
  // documented millisecond unit so CLI-created threads do not wait for days.
  return numericDelay > MAX_UI_COMMENT_DELAY_MINUTES
    ? numericDelay
    : numericDelay * 60000;
};
