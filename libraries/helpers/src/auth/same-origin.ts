/**
 * CSRF check for cookie-authenticated mutations. Session cookies are
 * SameSite=None when secured, so Origin/Referer must match FRONTEND_URL.
 */
export const isSameFrontendOrigin = (
  headers: { origin?: string | string[]; referer?: string | string[] },
  frontendUrl = process.env.FRONTEND_URL
) => {
  if (!frontendUrl) {
    return false;
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(frontendUrl).origin;
  } catch {
    return false;
  }

  const headerValue = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const origin = headerValue(headers.origin);
  if (origin) {
    try {
      return new URL(origin).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  const referer = headerValue(headers.referer);
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  return false;
};
