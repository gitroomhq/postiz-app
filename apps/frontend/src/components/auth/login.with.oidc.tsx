'use client';

import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const LoginWithOidc = () => {
  const { isGeneral, genericOauth } = useVariables();
  const t = useT();

  if (!(isGeneral && genericOauth)) {
    return null;
  }

  return (
    <>
      <div>
        <h1 className="mb-4 cursor-pointer text-start text-[40px] font-[700] tracking-[-0.04em] text-white">
          {t('sign_up', 'Sign Up')}
        </h1>
      </div>
      <OauthProvider />
      <div className="h-[20px] mb-[24px] mt-[24px] relative">
        <div className="absolute top-[50%] h-[1px] w-full -translate-y-[50%] bg-white/10" />
        <div
          className={`absolute z-[1] justify-center items-center w-full start-0 top-0 flex`}
        />
      </div>
    </>
  );
};
