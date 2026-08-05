'use client';

/**
 * Leave the Settings intercepting overlay (`@modal/(.)settings`) for another
 * app route. Soft `back()` + `push()` races — often only closes the scrim.
 * Hard assign clears the parallel modal slot and lands on `path`.
 */
export function leaveSettingsFor(
  path: string,
  router: { push: (href: string) => void }
) {
  if (
    typeof document !== 'undefined' &&
    document.querySelector('[data-settings-scrim]')
  ) {
    window.location.assign(path);
    return;
  }
  router.push(path);
}
