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

export function useT(ns?: string, options?: UseTranslationOptions<any>) {
  const { language } = useVariables();
  const [lng] = useCookie(cookieName, language || fallbackLng);
  if (typeof lng !== 'string') {
    throw new Error('useT is only available inside /app/[lng]');
  }
  const { t } = useTranslation(ns, options);
  return t;
}

export function useTranslationSettings() {
  const { language } = useVariables();
  const [lng] = useCookie(cookieName, language || fallbackLng);
  const [savedI18next, setSavedI18next] = useState(i18next);

  if (typeof lng !== 'string') {
    throw new Error('useT is only available inside /app/[lng]');
  }
  useEffect(() => {
    if (lng !== i18next.resolvedLanguage) {
      i18next.changeLanguage(lng).then(() => {
        setSavedI18next(i18next);
      });
    }
  }, [lng]);

  return savedI18next;
}
