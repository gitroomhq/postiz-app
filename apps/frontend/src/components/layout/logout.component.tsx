'use client';

import { useCallback } from 'react';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { setCookie } from '@gitroom/frontend/components/layout/layout.context';

export const LogoutComponent = () => {
  const fetch = useFetch();
  const { isGeneral, isSecured } = useVariables();
  const logout = useCallback(async () => {
    if (await deleteDialog('Are you sure you want to logout?', 'Yes logout')) {
      if (!isSecured) {
        setCookie('auth', '', -10);
      } else {
        await fetch('/user/logout', {
          method: 'POST',
        });
      }

      window.location.href = '/';
    }
  }, []);

  return (
    <div className="text-red-400 cursor-pointer" onClick={logout}>
      Logout from {isGeneral ? 'Postiz' : 'Gitroom'}
    </div>
  );
};
