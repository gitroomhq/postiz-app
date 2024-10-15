import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import interClass from '@gitroom/react/helpers/inter.font';

import { ReactComponent as GoogleSvg } from '@gitroom/frontend/assets/google.svg';

export const GoogleProvider = () => {
  const fetch = useFetch();
  const gotoLogin = useCallback(async () => {
    const link = await (await fetch('/auth/oauth/GOOGLE')).text();
    window.location.href = link;
  }, []);

  return (
    <div
      onClick={gotoLogin}
      className={`cursor-pointer bg-white h-[44px] rounded-[4px] flex justify-center items-center text-customColor16 ${interClass} gap-[4px]`}
    >
      <div>
        <GoogleSvg />
      </div>
      <div>Sign in with Google</div>
    </div>
  );
};
