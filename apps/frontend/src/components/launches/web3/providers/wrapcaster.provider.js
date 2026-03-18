'use client';
import '@neynar/react/dist/style.css';
import React, { useState, useCallback } from 'react';
import { useModals } from "../../../layout/new-modal";
import { LoadingComponent } from "../../../layout/loading";
import { ButtonCaster } from "../../../auth/providers/farcaster.provider";
export const WrapcasterProvider = (props) => {
    const [_, state] = props.nonce.split('||');
    const modal = useModals();
    const [hide, setHide] = useState(false);
    const auth = useCallback((code) => {
        setHide(true);
        return props.onComplete(code, state);
    }, [state]);
    return (<div className="justify-center items-center flex">
      {hide ? (<div className="justify-center items-center flex -mt-[90px]">
          <LoadingComponent width={100} height={100}/>
        </div>) : (<div className="justify-center items-center py-[20px] flex-col w-[500px]">
          <div>Click on the bottom below to start the process</div>
          <ButtonCaster login={auth}/>
        </div>)}
    </div>);
};
//# sourceMappingURL=wrapcaster.provider.js.map