'use client';
import { FC, useEffect, useState } from 'react';
import { useTranslationSettings } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const HtmlComponent: FC = () => {
  const settings = useTranslationSettings();
  const { desktopMode } = useVariables();
  // Desktop runs locally — no RTL languages supported; always use LTR to
  // prevent the sidebar from flipping sides when a stale RTL cookie exists.
  const [dir, setDir] = useState(desktopMode ? 'ltr' : settings.dir());

  useEffect(() => {
    if (desktopMode) return;
    settings.on('languageChanged', (lng) => {
      setDir(settings.dir());
    });
  }, []);

  useEffect(() => {
    const htmlElement = document.querySelector('html');
    if (htmlElement) {
      htmlElement.setAttribute('dir', dir);
    }
  }, [dir]);

  return null;
};
