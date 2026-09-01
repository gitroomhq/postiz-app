'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCookie } from 'react-use-cookie';
import EventEmitter from 'events';
import { setCookie } from '@gitroom/frontend/components/layout/layout.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useClickOutside } from '@mantine/hooks';
import {
  dropdownPanelClass,
  DropdownRow,
} from '@gitroom/frontend/components/layout/dropdown.styles';

export const modeEmitter = new EventEmitter();

const MODE_COOKIE = 'mode';
const PREFERENCE_COOKIE = 'modePreference';
const COOKIE_DAYS = 365;

type Mode = 'light' | 'dark';
type Preference = Mode | 'system';

const getSystemMode = (): Mode =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : 'dark';

const resolveMode = (preference: Preference): Mode =>
  preference === 'system' ? getSystemMode() : preference;

// A returning user already has a `mode` cookie holding their explicit past
// choice (dark/light) - use it as the initial preference instead of
// resetting everyone to 'system' the day this ships.
const readPreference = (): Preference => {
  const preference = getCookie(PREFERENCE_COOKIE, '');
  if (preference === 'light' || preference === 'dark' || preference === 'system') {
    return preference;
  }

  return getCookie(MODE_COOKIE, '') === 'light' ? 'light' : 'dark';
};

const ModeComponent = () => {
  const t = useT();
  const [preference, setPreference] = useState<Preference>(readPreference);
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  // Only ever writes 'dark'/'light' to the `mode` cookie and only emits when
  // the resolved value actually changes - NoMediaIcon / embedded.billing
  // subscribe to this emitter without ever unsubscribing by reference
  // (they call removeAllListeners on cleanup), so a silent re-mount must not
  // fire it.
  const applyMode = useCallback((mode: Mode) => {
    const previous = getCookie(MODE_COOKIE, '');
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(mode);
    setCookie(MODE_COOKIE, mode, COOKIE_DAYS);
    if (previous !== mode) {
      modeEmitter.emit('mode', mode);
    }
  }, []);

  useEffect(() => {
    setCookie(PREFERENCE_COOKIE, preference, COOKIE_DAYS);
    applyMode(resolveMode(preference));
  }, [preference, applyMode]);

  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      applyMode(event.matches ? 'dark' : 'light');
    };

    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [preference, applyMode]);

  const select = useCallback(
    (next: Preference) => () => {
      setPreference(next);
      setOpen(false);
    },
    []
  );
  const toggleOpen = useCallback(() => setOpen((prev) => !prev), []);

  const options = useMemo(
    () =>
      [
        { value: 'light' as const, label: t('theme_light', 'Light') },
        { value: 'dark' as const, label: t('theme_dark', 'Dark') },
        { value: 'system' as const, label: t('theme_system', 'System') },
      ],
    [t]
  );

  return (
    <div className="relative select-none cursor-pointer" ref={ref}>
      <div onClick={toggleOpen}>
        {preference === 'light' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
          >
            <path
              d="M10.75 1V3M10.75 19V21M2.75 11H0.75M5.06412 5.31412L3.6499 3.8999M16.4359 5.31412L17.8501 3.8999M5.06412 16.69L3.6499 18.1042M16.4359 16.69L17.8501 18.1042M20.75 11H18.75M15.75 11C15.75 13.7614 13.5114 16 10.75 16C7.98858 16 5.75 13.7614 5.75 11C5.75 8.23858 7.98858 6 10.75 6C13.5114 6 15.75 8.23858 15.75 11Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : preference === 'dark' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M21.625 12.9011C20.2967 15.231 17.7898 16.8019 14.916 16.8019C10.6539 16.8019 7.19884 13.3468 7.19884 9.08473C7.19884 6.21071 8.76993 3.70363 11.1001 2.37549C6.20501 2.83962 2.37561 6.96182 2.37561 11.9784C2.37561 17.306 6.69447 21.6248 12.0221 21.6248C17.0384 21.6248 21.1605 17.7959 21.625 12.9011Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
          >
            <rect
              x="1.75"
              y="3"
              width="18.5"
              height="12.5"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.75 19.5H14.25M11 15.5V19.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className={dropdownPanelClass(open, 'min-w-[140px]')}>
        {options.map((option) => (
          <DropdownRow
            key={option.value}
            selected={preference === option.value}
            onClick={select(option.value)}
          >
            {option.label}
          </DropdownRow>
        ))}
      </div>
    </div>
  );
};
export default ModeComponent;
