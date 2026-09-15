const RANGE_SPLIT = /\s[-–—]\s/;

/** Tooltip title is one day. A leftover "Sep 8 - Sep 14" bucket keeps the first day. */
export function chartDayLabel(date: string, locale?: string): string {
  const first = (date || '').split(RANGE_SPLIT)[0]?.trim() || date;
  const isoDay = first.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const parsed = Date.parse(isoDay ? `${isoDay}T00:00:00` : first);
  if (Number.isNaN(parsed)) {
    return first;
  }
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(parsed));
}

export function chartTooltipBox(
  caretX: number,
  caretY: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  gap = 12,
  minTop = 8,
) {
  const left = caretX - width / 2;
  let top = caretY - height - gap;
  if (top < minTop) {
    top = caretY + gap;
  }
  const maxLeft = Math.max(8, viewportWidth - width - 8);
  const maxTop = Math.max(minTop, viewportHeight - height - 8);
  return {
    left: Math.min(Math.max(8, left), maxLeft),
    top: Math.min(Math.max(minTop, top), maxTop),
  };
}
