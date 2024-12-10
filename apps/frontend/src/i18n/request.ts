import { getRequestConfig } from 'next-intl/server';
import { cookies,  } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies(); // `cookies()` is not asynchronous
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en'; // `.get()` returns a `RequestCookie`, so access `.value`

  return {
    locale,
    messages: await import(`./translations/${locale}.json`)
    .then(module => module.default)
    .catch(async () => {
      console.error(`Translation file for locale "${locale}" not found, falling back to "en"`);
      return (await import('./translations/en.json')).default;
    }),
  };
});
