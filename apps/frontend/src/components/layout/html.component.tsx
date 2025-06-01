'use client';
import { FC, ReactNode, useEffect, useState } from 'react';
import i18next from '@gitroom/react/translation/i18next';

export const HtmlComponent: FC<{ className: string; children: ReactNode }> = (
  props
) => {
  const { className } = props;
  const [dir, setDir] = useState(i18next.dir());

  useEffect(() => {
    i18next.on('languageChanged', (lng) => {
      setDir(i18next.dir());
    });
  }, []);

  useEffect(() => {
    const htmlElement = document.querySelector('html');
    if (htmlElement) {
      htmlElement.setAttribute('dir', dir);
    }
  }, [dir]);

  return <html className={className}>{props.children}</html>;
};
