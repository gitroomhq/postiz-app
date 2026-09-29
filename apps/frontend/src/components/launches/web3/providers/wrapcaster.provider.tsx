'use client';

import React, { FC, useState, useCallback } from 'react';
import { Web3ProviderInterface } from '@gitroom/frontend/components/launches/web3/web3.provider.interface';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { FarcasterApproval } from '@gitroom/frontend/components/auth/providers/farcaster.provider';
export const WrapcasterProvider: FC<Web3ProviderInterface> = (props) => {
  const [_, state] = props.nonce.split('||');
  const modal = useModals();
  const [hide, setHide] = useState(false);
  const auth = useCallback(
    (code: string) => {
      setHide(true);
      return props.onComplete(code, state);
    },
    [state]
  );
  return (
    <div className="justify-center items-center flex">
      {hide ? (
        <div className="justify-center items-center flex -mt-[90px]">
          <LoadingComponent width={100} height={100} />
        </div>
      ) : (
        <div className="w-[500px]">
          <FarcasterApproval login={auth} onFail={modal.closeCurrent} />
        </div>
      )}
    </div>
  );
};
