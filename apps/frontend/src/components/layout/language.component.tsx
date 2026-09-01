'use client';

import {
  cookieName,
  fallbackLng,
  languages,
} from '@gitroom/react/translation/i18n.config';
import { useTranslation } from 'react-i18next';
import useCookie from 'react-use-cookie';
import ReactCountryFlag from 'react-country-flag';
import React, { useCallback, useMemo, useState } from 'react';
import countries from 'i18n-iso-countries';

// Register required locales
import countriesEn from 'i18n-iso-countries/langs/en.json';
import { useClickOutside } from '@mantine/hooks';
import {
  dropdownPanelClass,
  DropdownRow,
} from '@gitroom/frontend/components/layout/dropdown.styles';

countries.registerLocale(countriesEn);

const getCountryCodeForFlag = (languageCode: string) => {
  // For multi-region languages, here are some common defaults
  if (languageCode === 'en') return 'GB';
  if (languageCode === 'es') return 'ES';
  if (languageCode === 'ar') return 'SA';
  if (languageCode === 'zh') return 'CN';
  if (languageCode === 'he') return 'IL';
  if (languageCode === 'ja') return 'JP';
  if (languageCode === 'ko') return 'KR';
  if (languageCode === 'vi') return 'VN';

  // Check if language code itself is a valid country code
  try {
    const countryName = countries.getName(languageCode.toUpperCase(), 'en');
    if (countryName) {
      return languageCode.toUpperCase();
    }
  } catch (e) {
    // Not a valid country code, continue to next approach
  }

  // Try to extract region code if language code has a region component (e.g., en-US)
  const parts = languageCode.split('-');
  if (parts.length > 1) {
    const regionCode = parts[1].toUpperCase();
    try {
      const countryName = countries.getName(regionCode, 'en');
      if (countryName) {
        return regionCode;
      }
    } catch (e) {
      // Not a valid country code, continue to next approach
    }
  }

  // For most language codes that match their primary country
  // Examples: fr->FR, it->IT, de->DE, etc.
  return languageCode.toUpperCase();
};

// Function to get language name in its native script
const getLanguageName = (code: string) => {
  try {
    // Use browser's Intl API to get language name in native script
    const displayNames = new Intl.DisplayNames([code], {
      type: 'language',
    });
    return displayNames.of(code);
  } catch (error) {
    // Fallback to language code if the API isn't supported or language is not found
    return code;
  }
};

export const LanguageComponent = () => {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const { i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || fallbackLng;
  const [, setLanguageCookie] = useCookie(
    cookieName,
    currentLanguage || fallbackLng
  );

  const toggleOpen = useCallback(() => setOpen((prev) => !prev), []);

  const sortedLanguages = useMemo(
    () =>
      [...languages].sort((a, b) =>
        (getLanguageName(a) || a).localeCompare(getLanguageName(b) || b)
      ),
    []
  );

  const handleLanguageChange = useCallback(
    (language: string) => {
      setLanguageCookie(language);
      i18n.changeLanguage(language);
      setOpen(false);
      const rtlLanguages = ['he', 'ar'];
      const dir = rtlLanguages.includes(language) ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
    },
    [setLanguageCookie, i18n]
  );

  return (
    <div className="relative select-none" ref={ref}>
      <div
        onClick={toggleOpen}
        className="rounded-full overflow-hidden h-[22px] w-[22px] relative cursor-pointer"
      >
        <ReactCountryFlag
          countryCode={getCountryCodeForFlag(currentLanguage)}
          svg
          style={{
            width: '22px',
            height: '22px',
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            objectFit: 'cover',
          }}
          title={currentLanguage}
        />
      </div>
      <div
        className={dropdownPanelClass(
          open,
          'min-w-[200px] max-h-[320px] overflow-y-auto'
        )}
      >
        {sortedLanguages.map((language) => (
          <DropdownRow
            key={language}
            selected={language === currentLanguage}
            onClick={() => handleLanguageChange(language)}
          >
            <ReactCountryFlag
              countryCode={getCountryCodeForFlag(language)}
              svg
              style={{
                width: '1.2em',
                height: '1.2em',
              }}
              title={language}
            />
            <span>{getLanguageName(language)}</span>
          </DropdownRow>
        ))}
      </div>
    </div>
  );
};
