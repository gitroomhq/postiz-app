import i18next from './i18next';
import { fallbackLng } from './i18n.config';
export async function getT(ns?: string, options?: any) {
  if (ns && !i18next.hasLoadedNamespace(ns)) {
    await i18next.loadNamespaces(ns);
  }
  return i18next.getFixedT(
    i18next.resolvedLanguage || fallbackLng,
    Array.isArray(ns) ? ns[0] : ns,
    options?.keyPrefix
  );
}
