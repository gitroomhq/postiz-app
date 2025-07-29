'use client';

import { FC, useCallback } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { NeynarContextProvider, Theme, useNeynarContext } from '@neynar/react';
import { NeynarAuthButton } from '@gitroom/frontend/components/auth/nayner.auth.button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const FarcasterProvider = () => {
  const gotoLogin = useCallback(async (code: string) => {
    window.location.href = `/auth?provider=FARCASTER&code=${code}`;
  }, []);
  return <ButtonCaster login={gotoLogin} />;
};
export const ButtonCaster: FC<{
  login: (code: string) => void;
}> = (props) => {
  const { login } = props;
  const { neynarClientId } = useVariables();
  const t = useT();
  return (
    <NeynarContextProvider
      settings={{
        clientId: neynarClientId,
        defaultTheme: Theme.Dark,
      }}
    >
      <NeynarAuthButton onLogin={login}>
        <div
          className={`cursor-pointer bg-[#855ECD] h-[44px] rounded-[4px] flex justify-center items-center text-white gap-[4px]`}
        >
          <svg
            width="21px"
            height="21px"
            viewBox="0 0 1000 1000"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M257.778 155.556H742.222V844.445H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.445H257.778V155.556Z"
              fill="white"
            />
            <path
              d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.445H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"
              fill="white"
            />
            <path
              d="M675.556 746.667C663.282 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.445H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z"
              fill="white"
            />
          </svg>
          <div>{t('continue_with_farcaster', 'Continue with Farcaster')}</div>
        </div>
      </NeynarAuthButton>
    </NeynarContextProvider>
  );
};
