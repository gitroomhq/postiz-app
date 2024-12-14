'use client';

import { useCallback } from 'react';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useTranslations } from 'next-intl';

export const LogoutComponent = () => {
  const fetch = useFetch();
  const {isGeneral} = useVariables();
  const t = useTranslations("Settings")
  const logout = useCallback(async () => {
    if (await deleteDialog(t("Settings.AreYouSureYouWantToLogout"), t("Settings.YesLogout"))) {
      await fetch('/user/logout', {
        method: 'POST',
      });

      window.location.href = '/';
    }
  }, []);

  return <div className="text-red-400 cursor-pointer" onClick={logout}>{t("Settings.LogoutFrom")} {isGeneral ? 'Postiz' : 'Gitroom'}</div>;
};
