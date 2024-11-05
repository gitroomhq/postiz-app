'use client';

import { EventEmitter } from 'events';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import {
  executeCommand,
  ExecuteState,
  ICommand,
  selectWord,
  TextAreaTextApi,
} from '@uiw/react-md-editor';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';

const postUrlEmitter = new EventEmitter();

export const ShowLinkedinCompany = () => {
  const [showPostSelector, setShowPostSelector] = useState(false);
  const [id, setId] = useState('');
  const [callback, setCallback] = useState<{
    callback: (tag: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  } | null>({ callback: (tag: string) => {} } as any);

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
  const fetch = useFetch();
  const [company, setCompany] = useState<any>(null);

  const getCompany = async () => {
    if (!company) {
      return ;
    }
    const {options} = await (
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
  };

  return (
    <div className="text-textColor fixed left-0 top-0 bg-primary/80 z-[300] w-full h-full p-[60px] animate-fade justify-center flex">
      <div className="flex flex-col w-[500px] h-[250px] bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative">
        <div className="flex">
          <div className="flex-1">
            <TopTitle title={'Select Company'} />
          </div>
          <button
            className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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
          <Button onClick={getCompany}>Add</Button>
        </div>
      </div>
    </div>
  );
};

export const linkedinCompany = (identifier: string, id: string): ICommand[] => {
  if (identifier !== 'linkedin' && identifier !== 'linkedin-page') {
    return [];
  }

  return [
    {
      name: 'linkedinCompany',
      keyCommand: 'linkedinCompany',
      shortcuts: 'ctrlcmd+p',
      prefix: '',
      suffix: '',
      buttonProps: {
        'aria-label': 'Add Post Url',
        title: 'Add Post Url',
      },
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 32 32"
          fill="currentColor"
        >
          <path
            d="M27 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V27C3 27.5304 3.21071 28.0391 3.58579 28.4142C3.96086 28.7893 4.46957 29 5 29H27C27.5304 29 28.0391 28.7893 28.4142 28.4142C28.7893 28.0391 29 27.5304 29 27V5C29 4.46957 28.7893 3.96086 28.4142 3.58579C28.0391 3.21071 27.5304 3 27 3ZM27 27H5V5H27V27ZM12 14V22C12 22.2652 11.8946 22.5196 11.7071 22.7071C11.5196 22.8946 11.2652 23 11 23C10.7348 23 10.4804 22.8946 10.2929 22.7071C10.1054 22.5196 10 22.2652 10 22V14C10 13.7348 10.1054 13.4804 10.2929 13.2929C10.4804 13.1054 10.7348 13 11 13C11.2652 13 11.5196 13.1054 11.7071 13.2929C11.8946 13.4804 12 13.7348 12 14ZM23 17.5V22C23 22.2652 22.8946 22.5196 22.7071 22.7071C22.5196 22.8946 22.2652 23 22 23C21.7348 23 21.4804 22.8946 21.2929 22.7071C21.1054 22.5196 21 22.2652 21 22V17.5C21 16.837 20.7366 16.2011 20.2678 15.7322C19.7989 15.2634 19.163 15 18.5 15C17.837 15 17.2011 15.2634 16.7322 15.7322C16.2634 16.2011 16 16.837 16 17.5V22C16 22.2652 15.8946 22.5196 15.7071 22.7071C15.5196 22.8946 15.2652 23 15 23C14.7348 23 14.4804 22.8946 14.2929 22.7071C14.1054 22.5196 14 22.2652 14 22V14C14.0012 13.7551 14.0923 13.5191 14.256 13.3369C14.4197 13.1546 14.6446 13.0388 14.888 13.0114C15.1314 12.9839 15.3764 13.0468 15.5765 13.188C15.7767 13.3292 15.918 13.539 15.9738 13.7775C16.6502 13.3186 17.4389 13.0526 18.2552 13.0081C19.0714 12.9637 19.8844 13.1424 20.6067 13.5251C21.329 13.9078 21.9335 14.48 22.3551 15.1803C22.7768 15.8806 22.9997 16.6825 23 17.5ZM12.5 10.5C12.5 10.7967 12.412 11.0867 12.2472 11.3334C12.0824 11.58 11.8481 11.7723 11.574 11.8858C11.2999 11.9994 10.9983 12.0291 10.7074 11.9712C10.4164 11.9133 10.1491 11.7704 9.93934 11.5607C9.72956 11.3509 9.5867 11.0836 9.52882 10.7926C9.47094 10.5017 9.50065 10.2001 9.61418 9.92597C9.72771 9.65189 9.91997 9.41762 10.1666 9.2528C10.4133 9.08797 10.7033 9 11 9C11.3978 9 11.7794 9.15804 12.0607 9.43934C12.342 9.72064 12.5 10.1022 12.5 10.5Z"
            fill="currentColor"
          />
        </svg>
      ),
      execute: async (state: ExecuteState, api: TextAreaTextApi) => {
        const newSelectionRange = selectWord({
          text: state.text,
          selection: state.selection,
          prefix: state.command.prefix!,
          suffix: state.command.suffix,
        });

        const state1 = api.setSelectionRange(newSelectionRange);
        const media = await showPostSelector(id);

        executeCommand({
          api,
          selectedText: state1.selectedText,
          selection: state.selection,
          prefix: media,
          suffix: '',
        });
      },
    },
  ];
};
