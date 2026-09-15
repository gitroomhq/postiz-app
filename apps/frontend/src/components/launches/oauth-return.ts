/**
 * After provider OAuth, land on Channels — not Calendar (`/launches`).
 * Two-step connect already did this; Update credentials / refresh did not.
 */
export function oauthReturnPath(opts: {
  added?: string;
  /** Integration UUID to focus on Channels. Not `id` — Google OAuth uses that. */
  focus?: string;
  msg?: string;
  onboarding?: boolean;
  precondition?: boolean;
}): string {
  const params = new URLSearchParams();
  if (opts.added) {
    params.set('added', opts.added);
  }
  if (opts.focus) {
    params.set('focus', opts.focus);
  }
  if (opts.msg) {
    params.set('msg', opts.msg);
  }
  if (opts.onboarding) {
    params.set('onboarding', 'true');
  }
  if (opts.precondition) {
    params.set('precondition', 'true');
  }
  const qs = params.toString();
  return qs ? `/channels?${qs}` : '/channels';
}

/**
 * Deep-link a notification (refresh error, reconnect needed) onto Channels.
 * `channel` is the provider identifier; `focus` is the integration UUID.
 * Distinct from `added=`, which is the OAuth-success toast path.
 */
export function channelFocusPath(opts: {
  provider?: string;
  focus?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.provider) {
    params.set('channel', opts.provider);
  }
  if (opts.focus) {
    params.set('focus', opts.focus);
  }
  const qs = params.toString();
  return qs ? `/channels?${qs}` : '/channels';
}
