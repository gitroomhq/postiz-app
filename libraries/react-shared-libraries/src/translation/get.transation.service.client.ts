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
  const { t } = useTranslation(ns, options);
  return t;
}

export function useTranslationSettings() {
  const { language } = useVariables();
  const [lng] = useCookie(cookieName, language || fallbackLng);
  const [savedI18next, setSavedI18next] = useState(i18next);

  return savedI18next;
}
