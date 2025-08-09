'use client';

import { EventEmitter } from 'events';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
const postUrlEmitter = new EventEmitter();
export const ShowLinkedinCompany = () => {
  const [showPostSelector, setShowPostSelector] = useState(false);
  const [id, setId] = useState('');
  const [callback, setCallback] = useState<{
    callback: (tag: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  } | null>({
    callback: (tag: string) => {},
  } as any);
  useEffect(() => {
    postUrlEmitter.on(
      'show',
      (params: { id: string; callback: (url: string) => void }) => {
        setCallback(params);
        setId(params.id);
        setShowPostSelector(true);
      }
    );
    return () => {
      setShowPostSelector(false);
      setCallback(null);
      setId('');
      postUrlEmitter.removeAllListeners();
    };
  }, []);
  const close = useCallback(() => {
    setShowPostSelector(false);
    setCallback(null);
    setId('');
  }, []);
  if (!showPostSelector) {
    return <></>;
  }
  return (
    <LinkedinCompany id={id} onClose={close} onSelect={callback?.callback!} />
  );
};

export const LinkedinCompanyPop: FC<{
  addText: (value: any) => void;
}> = (props) => {
  const current = useLaunchStore((state) => state.current);
  return (
    <svg
      onClick={() => {
        postUrlEmitter.emit('show', {
          id: current,
          callback: (value: any) => {
            props.addText(value);
          },
        });
      }}
      data-tooltip-id="tooltip"
      data-tooltip-content="Add a LinkedIn Company"
      className="mx-[10px] cursor-pointer"
      width="20"
      height="20"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 0H2C1.46957 0 0.960859 0.210714 0.585786 0.585786C0.210714 0.960859 0 1.46957 0 2V24C0 24.5304 0.210714 25.0391 0.585786 25.4142C0.960859 25.7893 1.46957 26 2 26H24C24.5304 26 25.0391 25.7893 25.4142 25.4142C25.7893 25.0391 26 24.5304 26 24V2C26 1.46957 25.7893 0.960859 25.4142 0.585786C25.0391 0.210714 24.5304 0 24 0ZM9 19C9 19.2652 8.89464 19.5196 8.70711 19.7071C8.51957 19.8946 8.26522 20 8 20C7.73478 20 7.48043 19.8946 7.29289 19.7071C7.10536 19.5196 7 19.2652 7 19V11C7 10.7348 7.10536 10.4804 7.29289 10.2929C7.48043 10.1054 7.73478 10 8 10C8.26522 10 8.51957 10.1054 8.70711 10.2929C8.89464 10.4804 9 10.7348 9 11V19ZM8 9C7.70333 9 7.41332 8.91203 7.16665 8.7472C6.91997 8.58238 6.72771 8.34811 6.61418 8.07403C6.50065 7.79994 6.47094 7.49834 6.52882 7.20736C6.5867 6.91639 6.72956 6.64912 6.93934 6.43934C7.14912 6.22956 7.41639 6.0867 7.70736 6.02882C7.99834 5.97094 8.29994 6.00065 8.57403 6.11418C8.84811 6.22771 9.08238 6.41997 9.2472 6.66665C9.41203 6.91332 9.5 7.20333 9.5 7.5C9.5 7.89782 9.34196 8.27936 9.06066 8.56066C8.77936 8.84196 8.39782 9 8 9ZM20 19C20 19.2652 19.8946 19.5196 19.7071 19.7071C19.5196 19.8946 19.2652 20 19 20C18.7348 20 18.4804 19.8946 18.2929 19.7071C18.1054 19.5196 18 19.2652 18 19V14.5C18 13.837 17.7366 13.2011 17.2678 12.7322C16.7989 12.2634 16.163 12 15.5 12C14.837 12 14.2011 12.2634 13.7322 12.7322C13.2634 13.2011 13 13.837 13 14.5V19C13 19.2652 12.8946 19.5196 12.7071 19.7071C12.5196 19.8946 12.2652 20 12 20C11.7348 20 11.4804 19.8946 11.2929 19.7071C11.1054 19.5196 11 19.2652 11 19V11C11.0012 10.7551 11.0923 10.5191 11.256 10.3369C11.4197 10.1546 11.6446 10.0388 11.888 10.0114C12.1314 9.98392 12.3764 10.0468 12.5765 10.188C12.7767 10.3292 12.918 10.539 12.9738 10.7775C13.6502 10.3186 14.4389 10.0526 15.2552 10.0081C16.0714 9.96368 16.8844 10.1424 17.6067 10.5251C18.329 10.9078 18.9335 11.48 19.3551 12.1803C19.7768 12.8806 19.9997 13.6825 20 14.5V19Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const showPostSelector = (id: string) => {
  return new Promise<string>((resolve) => {
    postUrlEmitter.emit('show', {
      id,
      callback: (tag: string) => {
        resolve(tag);
      },
    });
  });
};
export const LinkedinCompany: FC<{
  onClose: () => void;
  onSelect: (tag: string) => void;
  id: string;
}> = (props) => {
  const { onClose, onSelect, id } = props;
  const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);
  useEffect(() => {
    setActivateExitButton(false);
    return () => {
      setActivateExitButton(true);
    };
  }, []);
  const fetch = useFetch();
  const [company, setCompany] = useState<any>(null);
  const toast = useToaster();
  const t = useT();
  const getCompany = async () => {
    if (!company) {
      return;
    }
    try {
      const { options } = await (
        await fetch('/integrations/function', {
          method: 'POST',
          body: JSON.stringify({
            id,
            name: 'company',
            data: {
              url: company,
            },
          }),
        })
      ).json();
      onSelect(options.value);
      onClose();
    } catch (e) {
      toast.show('Failed to load profile', 'warning');
    }
  };
  return (
    <div className="text-textColor fixed start-0 top-0 bg-primary/80 z-[300] w-full h-full p-[60px] animate-fade justify-center flex">
      <div className="flex flex-col w-[500px] h-[250px] bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative">
        <div className="flex">
          <div className="flex-1">
            <TopTitle title={'Select Company'} />
          </div>
          <button
            onClick={onClose}
            className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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
        <div className="mt-[10px]">
          <Input
            name="url"
            disableForm={true}
            label="URL"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="https://www.linkedin.com/company/gitroom"
          />
          <Button onClick={getCompany}>{t('add', 'Add')}</Button>
        </div>
      </div>
    </div>
  );
};

