/**
 * Channel list + detail subtitle: the real handle from `/integrations/list`
 * (`display` = DB `profile`), not the platform slug or display name.
 */
export function formatChannelHandle(display?: string | null): string {
  const raw = (display || '').trim();
  if (!raw) {
    return '';
  }
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, '');
      const path = url.pathname.replace(/\/$/, '');
      return `${host}${path}`;
    } catch {
      return raw;
    }
  }
  return raw.startsWith('@') ? raw : `@${raw}`;
}

/** List subtitle: handle when we have one, otherwise the platform slug. */
export function channelListSubtitle(
  integration: { display?: string | null; identifier?: string },
  reconnect?: string
): string {
  if (reconnect) {
    return reconnect;
  }
  return formatChannelHandle(integration.display) || integration.identifier || '';
}

/** Tooltip / compact chip: "Name · @handle", or whichever piece we have. */
export function channelNameWithHandle(integration: {
  name?: string | null;
  display?: string | null;
}): string {
  const name = (integration.name || '').trim();
  const handle = formatChannelHandle(integration.display);
  if (name && handle) {
    return `${name} · ${handle}`;
  }
  return name || handle;
}

/** Continue-picker subtitle: formatted handle, or nothing if display is empty. */
export function continuePickerHandle(username?: string): string | undefined {
  return formatChannelHandle(username) || undefined;
}
