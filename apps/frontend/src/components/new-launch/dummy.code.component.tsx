import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import React, { FC } from 'react';
import { Button } from '@gitroom/react/form/button';
import copy from 'copy-to-clipboard';
import { useToaster } from '@gitroom/react/toaster/toaster';

export const DummyCodeComponent: FC<{ code: any }> = ({ code }) => {
  const modal = useModals();
  const toaster = useToaster();

  return (
    <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative w-full">
      <TopTitle title={`Output`}>
        <Button
          className="mr-[50px]"
          onClick={() => {
            copy(JSON.stringify(code, null, 2));
            toaster.show('Code copied to clipboard', 'success');
          }}
        >
          Copy Code
        </Button>
      </TopTitle>
      <button
        className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
        onClick={() => modal.closeAll()}
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
      <pre>{JSON.stringify(code, null, 2)}</pre>
    </div>
  );
};
