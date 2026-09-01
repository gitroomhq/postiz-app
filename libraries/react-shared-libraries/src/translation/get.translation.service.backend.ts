import { cookies } from 'next/headers';
import i18next from './i18next';
import { cookieName, fallbackLng } from './i18n.config';
export async function getT(ns?: string, options?: any) {
  if (ns && !i18next.hasLoadedNamespace(ns)) {
    await i18next.loadNamespaces(ns);
  }
  const cookieStore = await cookies();
  const language = cookieStore.get(cookieName)?.value || fallbackLng;
  return i18next.getFixedT(
    language,
    Array.isArray(ns) ? ns[0] : ns,
    options?.keyPrefix
  );
}
