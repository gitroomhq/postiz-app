import { getRequestConfig } from 'next-intl/server';
import { cookies,  } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies(); // `cookies()` is not asynchronous
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en'; // `.get()` returns a `RequestCookie`, so access `.value`

  return {
    locale,
    messages: (await import(`../languages/${locale}.json`)).default,
  };
});
