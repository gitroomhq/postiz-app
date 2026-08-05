'use client';

import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  cookieName,
  fallbackLng,
  languages,
} from '@gitroom/react/translation/i18n.config';
import i18next from 'i18next';
import useCookie from 'react-use-cookie';
import ReactCountryFlag from 'react-country-flag';
import React from 'react';
import countries from 'i18n-iso-countries';

// Register required locales
import countriesEn from 'i18n-iso-countries/langs/en.json';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

import clsx from 'clsx';
countries.registerLocale(countriesEn);

/**
 * Canonical picker autonyms (same inventory as `languages` in i18n.config).
 * Intl.DisplayNames returns locale-grammar casing (français, español, русский)
 * which looks uneven next to English / Deutsch in a UI grid. Latin scripts use
 * conventional title case; Hebrew / CJK / Arabic stay as proper native forms.
 */
const LANGUAGE_AUTONYMS: Record<string, string> = {
  en: 'English',
  he: 'עברית',
  ru: 'Русский',
  zh: '中文',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  tr: 'Türkçe',
  vi: 'Tiếng Việt',
};

const getLanguageName = (code: string) => {
  if (LANGUAGE_AUTONYMS[code]) {
    return LANGUAGE_AUTONYMS[code];
  }
  try {
    const displayNames = new Intl.DisplayNames([code], {
      type: 'language',
    });
    const name = displayNames.of(code);
    return name ? titleCaseLatinAutonym(name) : code;
  } catch {
    return code;
  }
};

/** Title-case Latin (and Cyrillic) word starts; leave other scripts untouched. */
const titleCaseLatinAutonym = (name: string) => {
  return name.replace(/[\p{Script=Latin}\p{Script=Cyrillic}]+/gu, (word) => {
    const [first, ...rest] = [...word];
    if (!first) {
      return word;
    }
    return first.toLocaleUpperCase() + rest.join('').toLocaleLowerCase();
  });
};

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

export const ChangeLanguageComponent = ({
  hideHeader,
}: {
  /** The top-bar flag opens this in a modal that carries its own title. */
  hideHeader?: boolean;
} = {}) => {
  const currentLanguage = i18next.resolvedLanguage || fallbackLng;
  const availableLanguages = languages;
  const [_, setCookie] = useCookie(cookieName, currentLanguage || fallbackLng);
  const modals = useModals();
  const t = useT();

  const handleLanguageChange = (language: string) => {
    setCookie(language);
    i18next.changeLanguage(language);
    modals.closeCurrent();
    const rtlLanguages = ['he', 'ar'];
    const dir = rtlLanguages.includes(language) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
  };

  return (
    <div className="flex flex-col">
      {!hideHeader && (
        <>
          <h3 className="m-0 font-display text-[20px] font-[600] -tracking-[0.015em] text-pqText">
            {t('language', 'Language')}
          </h3>
          <div className="mt-[6px] text-[14px] leading-[1.45] text-pqMuted">
            {t(
              'language_settings_description',
              'Pick the language for the interface, emails and AI prompts.'
            )}
          </div>
        </>
      )}
      <div className="mt-[18px] grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-[10px]">
        {availableLanguages.map((language) => {
          const selected = language === currentLanguage;
          return (
            <button
              type="button"
              aria-pressed={selected}
              className={clsx(
                'flex h-[48px] min-h-[48px] items-center gap-[10px] rounded-pqMd px-[14px] text-[13.5px] tracking-[-0.01em] text-pqText transition-[box-shadow,background-color] cursor-pointer',
                selected
                  ? 'bg-pqBrandFaint font-[600] shadow-[inset_0_0_0_1.5px_var(--brand)]'
                  : 'bg-pqPop font-[500] shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover hover:shadow-[inset_0_0_0_1px_var(--brand)]'
              )}
              key={language}
              onClick={() => handleLanguageChange(language)}
            >
              <span className="flex size-[20px] shrink-0 items-center justify-center overflow-hidden rounded-[3px]">
                <ReactCountryFlag
                  countryCode={getCountryCodeForFlag(language)}
                  svg
                  style={{
                    width: '18px',
                    height: '18px',
                  }}
                  title={language}
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-start">
                {getLanguageName(language)}
              </span>
              {selected && (
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  className="shrink-0 text-pqBrand"
                  aria-hidden
                >
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
export const LanguageComponent = () => {
  const modal = useModals();
  const currentLanguage = i18next.resolvedLanguage || fallbackLng;
  const t = useT();
  const openModal = () => {
    modal.openModal({
      title: t('change_language', 'Change Language'),
      withCloseButton: true,
      children: (
        <div className="flex flex-col">
          <p className="m-0 text-[14px] leading-[1.45] text-pqMuted">
            {t(
              'language_settings_description',
              'Pick the language for the interface, emails and AI prompts.'
            )}
          </p>
          <ChangeLanguageComponent hideHeader />
        </div>
      ),
    });
  };
  return (
    <div
      onClick={openModal}
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
  );
};
