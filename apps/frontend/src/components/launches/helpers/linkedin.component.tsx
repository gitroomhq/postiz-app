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
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import dayjs from 'dayjs';

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';
import { ReactComponent as LinkedInSvg } from '@gitroom/frontend/assets/linkedin.svg';

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
      return;
    }
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
            <CloseXSvg />
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
      icon: <LinkedInSvg />,
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
