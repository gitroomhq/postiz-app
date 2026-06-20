import React, { FC, useCallback, useEffect, useState } from 'react';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { timer } from '@gitroom/helpers/utils/timer';
import { Button } from '@gitroom/react/form/button';

export const FinishTrial: FC<{ close: () => void }> = (props) => {
  const [finished, setFinished] = useState(false);
  const fetch = useFetch();

  const finishSubscription = useCallback(async () => {
    await fetch('/billing/finish-trial', {
      method: 'POST',
    });
    checkFinished();
  }, []);

  const checkFinished = useCallback(async () => {
    const {finished} = await (await fetch('/billing/is-trial-finished')).json();
    if (!finished) {
      await timer(2000);
      return checkFinished();
    }

    setFinished(true);
  }, []);

  useEffect(() => {
    finishSubscription();
  }, []);

  return (
    <div className="text-textColor fixed start-0 top-0 bg-primary/80 z-[300] w-full h-full p-[60px] animate-fade justify-center flex bg-black/50">
      <div>
        <div className="flex gap-[10px] flex-col w-[500px] h-auto bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative">
          <div className="flex">
            <div className="flex-1">
              <TopTitle title={'Finishing Trial'} />
            </div>
            <button
              onClick={props.close}
              className="outline-none absolute end-[10px] top-[10px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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
          </div>
          <div className="relative h-[400px]">
            <div className="absolute left-0 top-0 w-full h-full overflow-hidden overflow-y-auto">
              <div className="mt-[10px] flex w-full justify-center items-center gap-[10px]">
                {!finished && <LoadingComponent height={150} width={150} />}
                {finished && (
                  <div className="flex flex-col">
                    <div>
                      You trial has been successfully finished and you have been charged.
                    </div>
                    <div className="flex gap-[10px] mt-[20px]">
                      <Button className="flex-1" onClick={() => window.close()}>Close window</Button>
                      <Button className="flex-1" onClick={() => props.close()}>Close dialog</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
