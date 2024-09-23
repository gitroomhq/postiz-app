'use client';

import { useCallback } from 'react';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const LogoutComponent = () => {
  const fetch = useFetch();
  const {isGeneral} = useVariables();
  const logout = useCallback(async () => {
    if (await deleteDialog('Are you sure you want to logout?', 'Yes logout')) {
      await fetch('/user/logout', {
        method: 'POST',
      });

      window.location.href = '/';
    }
  }, []);

  return <div className="text-red-400 cursor-pointer" onClick={logout}>Logout from {isGeneral ? 'Postiz' : 'Gitroom'}</div>;
};
