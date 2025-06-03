'use client';

import { useModals } from '@mantine/modals';
import {
  cookieName,
  fallbackLng,
  languages,
} from '@gitroom/react/translation/i18n.config';
import i18next from 'i18next';
import useCookie from 'react-use-cookie';
import ReactCountryFlag from 'react-country-flag';
import { List, Box, Group, Text } from '@mantine/core';
import React, { useCallback } from 'react';
import countries from 'i18n-iso-countries';

// Register required locales
import countriesEn from 'i18n-iso-countries/langs/en.json';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { AddProviderComponent } from '@gitroom/frontend/components/launches/add.provider.component';
import clsx from 'clsx';
countries.registerLocale(countriesEn);
export const ChangeLanguageComponent = () => {
  const currentLanguage = i18next.resolvedLanguage || fallbackLng;
  const availableLanguages = languages;
  const [_, setCookie] = useCookie(cookieName, currentLanguage || fallbackLng);
  const modals = useModals();
  const t = useT();

  const handleLanguageChange = (language: string) => {
    setCookie(language);
    i18next.changeLanguage(language);
    modals.closeModal('change-language');
  };

  // Function to get language name in its native script
  const getLanguageName = useCallback((code: string) => {
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
  }, []);

  // Get appropriate country code for the flag based on language code
  const getCountryCodeForFlag = useCallback((languageCode: string) => {
    // For multi-region languages, here are some common defaults
    if (languageCode === 'en') return 'GB';
    if (languageCode === 'es') return 'ES';
    if (languageCode === 'ar') return 'SA';
    if (languageCode === 'zh') return 'CN';
    if (languageCode === 'he') return 'IL';
    if (languageCode === 'ja') return 'JP';
    if (languageCode === 'ko') return 'KR';

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
  }, []);
  return (
    <div className="bg-sixth p-[32px] w-full max-w-[920px] mx-auto flex flex-col rounded-[4px] border border-customColor6 relative">
      <button
        onClick={() => modals.closeModal('change-language')}
        className="outline-none absolute end-[20px] top-[15px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
      >
        <svg
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
        >
          <path
            d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          ></path>
        </svg>
      </button>
      <h1 className="text-[24px] mb-3">{t('change_language', 'Change Language')}</h1>
      <div className="grid grid-cols-4 gap-2">
        {availableLanguages.map((language) => (
          <div
            className={clsx("flex items-center flex-col bg-input p-[20px] cursor-pointer gap-2", language === currentLanguage ? 'border border-textColor' : '')}
            key={language}
            onClick={() => handleLanguageChange(language)}
          >
            <ReactCountryFlag
              countryCode={getCountryCodeForFlag(language)}
              svg
              style={{
                width: '1.5em',
                height: '1.5em',
              }}
              title={language}
            />
            <Text weight={language === currentLanguage ? 'bold' : 'normal'}>
              {getLanguageName(language)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
};
export const LanguageComponent = () => {
  const modal = useModals();
  const openModal = () => {
    modal.openModal({
      title: '',
      withCloseButton: false,
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      modalId: 'change-language',
      children: <ChangeLanguageComponent />,
      size: 'lg',
      centered: true,
    });
  };
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="me-2 cursor-pointer"
      onClick={openModal}
    >
      <path
        d="M16 3.5C13.5277 3.5 11.111 4.23311 9.05538 5.60663C6.99976 6.98015 5.39761 8.93238 4.45151 11.2165C3.50542 13.5005 3.25787 16.0139 3.74019 18.4386C4.2225 20.8634 5.41301 23.0907 7.16117 24.8388C8.90933 26.587 11.1366 27.7775 13.5614 28.2598C15.9861 28.7421 18.4995 28.4946 20.7835 27.5485C23.0676 26.6024 25.0199 25.0002 26.3934 22.9446C27.7669 20.889 28.5 18.4723 28.5 16C28.4964 12.6859 27.1782 9.5086 24.8348 7.16518C22.4914 4.82177 19.3141 3.50364 16 3.5ZM26.955 19.5H21.1863C21.6046 17.1854 21.6046 14.8146 21.1863 12.5H26.955C27.6817 14.7768 27.6817 17.2232 26.955 19.5ZM16 27.5C15.9346 27.5 15.8699 27.4863 15.81 27.4598C15.7502 27.4333 15.6965 27.3947 15.6525 27.3463C13.9463 25.5088 12.7125 23.1313 12.0513 20.5H19.9488C19.2875 23.1313 18.0538 25.5088 16.3475 27.3463C16.3035 27.3947 16.2498 27.4333 16.19 27.4598C16.1301 27.4863 16.0654 27.5 16 27.5ZM11.8313 19.5C11.3896 17.1876 11.3896 14.8124 11.8313 12.5H20.1688C20.6104 14.8124 20.6104 17.1876 20.1688 19.5H11.8313ZM16 4.5C16.0654 4.50003 16.1301 4.51371 16.19 4.54019C16.2498 4.56667 16.3035 4.60534 16.3475 4.65375C18.0538 6.49125 19.2875 8.875 19.9488 11.5H12.0513C12.7125 8.875 13.9463 6.49125 15.6525 4.65375C15.6965 4.60534 15.7502 4.56667 15.81 4.54019C15.8699 4.51371 15.9346 4.50003 16 4.5ZM26.5825 11.5H20.9763C20.3625 8.90875 19.2263 6.535 17.6438 4.6175C19.5983 4.90355 21.4466 5.68662 23.0117 6.89172C24.5768 8.09681 25.8064 9.68356 26.5825 11.5ZM14.3563 4.6175C12.7775 6.535 11.6375 8.90875 11.0238 11.5H5.41751C6.19366 9.68356 7.42318 8.09681 8.98831 6.89172C10.5534 5.68662 12.4018 4.90355 14.3563 4.6175ZM5.04501 12.5H10.8138C10.3954 14.8146 10.3954 17.1854 10.8138 19.5H5.04501C4.31835 17.2232 4.31835 14.7768 5.04501 12.5ZM5.42001 20.5H11.0238C11.6375 23.0912 12.7738 25.465 14.3563 27.3825C12.4018 27.0964 10.5534 26.3134 8.98831 25.1083C7.42318 23.9032 6.19366 22.3164 5.41751 20.5H5.42001ZM17.6463 27.3825C19.225 25.465 20.365 23.0912 20.9788 20.5H26.585C25.8086 22.3168 24.5787 23.9037 23.0131 25.1088C21.4475 26.314 19.5987 27.0968 17.6438 27.3825H17.6463Z"
        fill="currentColor"
      />
    </svg>
  );
};
