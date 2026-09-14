export const CONTINUE_PICKER_AVATAR_ATTR = 'data-avatar';

export const continuePickerItemClasses = {
  fallback:
    'flex size-[44px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-pqSettings text-pqMuted',
  text: 'min-w-0 max-w-full',
  name: 'block truncate text-[14px] font-[600] text-pqText',
  meta: 'mt-[2px] block truncate text-[12px] text-pqMuted',
} as const;

export function joinContinuePickerMeta(
  ...parts: Array<string | false | null | undefined>
): string | undefined {
  const tokens = parts.flatMap((part) => {
    if (!part) {
      return [];
    }
    const trimmed = part.trim();
    return trimmed ? [trimmed] : [];
  });
  return tokens.length ? tokens.join(' · ') : undefined;
}

export function continuePickerInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}
