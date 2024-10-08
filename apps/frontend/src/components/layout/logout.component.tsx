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

  return <div 
      className="bg-red-500 text-white font-semibold px-4 py-2 rounded-full cursor-pointer hover:bg-red-600 transition duration-300 inline-block w-auto"
      onClick={logout}
    >
      Logout from {isGeneral ? 'Postiz' : 'Gitroom'}
    </div>;
};
