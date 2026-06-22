import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';
import { fallbackLng, languages, defaultNS } from './i18n.config';
const runsOnServerSide = typeof window === 'undefined';

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend((language: any, namespace: any) => {
      return import(`./locales/${language}/${namespace}.json`);
    })
  )
  .init({
    supportedLngs: languages,
    fallbackLng,
    lng: undefined,
    fallbackNS: defaultNS,
    defaultNS,
    detection: {
      // 'header' (Accept-Language) desativado: pt fica fixo p/ todos os
      // visitantes em vez de auto-detectar pelo navegador, ver i18n.config.ts.
      order: ['cookie'],
    },
    // Só pre-carrega o idioma fixo (pt); 'en' fica em stand-by, sem custo de
    // boot, e só seria carregado on-demand se algo chamasse changeLanguage('en').
    preload: runsOnServerSide ? [fallbackLng] : [],
  });

export default i18next;
