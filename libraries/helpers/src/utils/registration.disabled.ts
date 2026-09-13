/**
 * Self-hosted installs can turn sign-up off. Unset is open (hosted PostQueen).
 *
 * The login form hides Create account when this is true. `/auth` still has its
 * own server check (`/auth/can-register`) so the first user of a locked install
 * is not locked out of the URL.
 */
export const isRegistrationDisabled = () =>
  process.env.DISABLE_REGISTRATION === 'true';
