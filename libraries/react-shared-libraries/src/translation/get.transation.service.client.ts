'use client';

import i18next from './i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UseTranslationOptions } from 'react-i18next/index';
import useCookie from 'react-use-cookie';
import {
  cookieName,
  fallbackLng,
} from '@gitroom/react/translation/i18n.config';
import { useVariables } from '@gitroom/react/helpers/variable.context';
const runsOnServerSide = typeof window === 'undefined';
export function useT(ns?: string, options?: UseTranslationOptions<any>) {
  const { language } = useVariables();
  const [lng] = useCookie(cookieName, language || fallbackLng);
  if (typeof lng !== 'string') {
    throw new Error('useT is only available inside /app/[lng]');
  }
  const [activeLng, setActiveLng] = useState(i18next.resolvedLanguage);
  const { t } = useTranslation(ns, options);
  useEffect(() => {
    if (activeLng === i18next.resolvedLanguage) return;
    setActiveLng(i18next.resolvedLanguage);
  }, [activeLng]);
  useEffect(() => {
    if (!lng || i18next.resolvedLanguage === lng) return;
    i18next.changeLanguage(lng);
  }, [lng]);
  if (runsOnServerSide && i18next.resolvedLanguage !== lng) {
    i18next.changeLanguage(lng);
  }
  return t;
}
