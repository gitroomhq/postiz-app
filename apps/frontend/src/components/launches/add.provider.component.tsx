'use client';

import { useModals } from '@mantine/modals';
import React, { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Input } from '@gitroom/react/form/input';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ApiKeyDto } from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';
import { useRouter } from 'next/navigation';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useVariables } from '@gitroom/react/helpers/variable.context';

const resolver = classValidatorResolver(ApiKeyDto);

export const useAddProvider = (update?: () => void) => {
  const modal = useModals();
  const fetch = useFetch();
  return useCallback(async () => {
    const data = await (await fetch('/integrations')).json();
    modal.openModal({
      title: '',
      withCloseButton: false,
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      children: <AddProviderComponent update={update} {...data} />,
      size: 'auto',
    });
  }, []);
};

export const AddProviderButton: FC<{ update?: () => void }> = (props) => {
  const { update } = props;
  const add = useAddProvider(update);
  return (
    <button className="text-white p-[8px] rounded-md bg-forth" onClick={add}>
      Add Channel
    </button>
  );
};

export const ApiModal: FC<{
  identifier: string;
  name: string;
  update?: () => void;
  close?: () => void;
}> = (props) => {
  const { update, name, close: closePopup } = props;
  const fetch = useFetch();
  const router = useRouter();
  const modal = useModals();
  const methods = useForm({
    mode: 'onChange',
    resolver,
  });

  const close = useCallback(() => {
    if (closePopup) {
      return closePopup();
    }
    modal.closeAll();
  }, []);

  const submit = useCallback(async (data: FieldValues) => {
    const add = await fetch(
      `/integrations/article/${props.identifier}/connect`,
      {
        method: 'POST',
        body: JSON.stringify({ api: data.api }),
      }
    );

    if (add.ok) {
      if (closePopup) {
        closePopup();
      } else {
        modal.closeAll();
      }
      router.refresh();
      if (update) update();
      return;
    }

    methods.setError('api', {
      message: 'Invalid API key',
    });
  }, []);

  return (
    <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative">
      <TopTitle title={`Add API key for ${name}`} />
      <button
        onClick={close}
        className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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
      <FormProvider {...methods}>
        <form
          className="gap-[8px] flex flex-col"
          onSubmit={methods.handleSubmit(submit)}
        >
          <div className="pt-[10px]">
            <Input label="API Key" name="api" />
          </div>
          <div>
            <Button type="submit">Add platform</Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
export const AddProviderComponent: FC<{
  social: Array<{ identifier: string; name: string }>;
  article: Array<{ identifier: string; name: string }>;
  update?: () => void;
}> = (props) => {
  const { update } = props;
  const {isGeneral} = useVariables();

  const fetch = useFetch();
  const modal = useModals();
  const { social, article } = props;
  const getSocialLink = useCallback(
    (identifier: string) => async () => {
      const { url } = await (
        await fetch('/integrations/social/' + identifier)
      ).json();
      window.location.href = url;
    },
    []
  );

  const close = useCallback(() => {
    modal.closeAll();
  }, []);

  const showApiButton = useCallback(
    (identifier: string, name: string) => async () => {
      modal.openModal({
        title: '',
        withCloseButton: false,
        classNames: {
          modal: 'bg-transparent text-textColor',
        },
        children: (
          <ApiModal update={update} name={name} identifier={identifier} />
        ),
      });
    },
    []
  );
  return (
    <div className="w-full flex flex-col gap-[20px] rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative">
      <div className="flex flex-col">
        <TopTitle title="Add Channel" />
        <button
          onClick={close}
          className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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
        <h2 className="pt-[16px] pb-[10px]">Social</h2>
        <div className="grid grid-cols-3 gap-[10px] justify-items-center justify-center">
          {social.map((item) => (
            <div
              key={item.identifier}
              onClick={getSocialLink(item.identifier)}
              className={
                'w-[120px] h-[100px] bg-input text-textColor justify-center items-center flex flex-col gap-[10px] cursor-pointer'
              }
            >
              <div>
                {item.identifier === 'youtube' ? (
                  <img src={`/icons/platforms/youtube.svg`} />
                ) : (
                  <img
                    className="w-[32px] h-[32px] rounded-full"
                    src={`/icons/platforms/${item.identifier}.png`}
                  />
                )}
              </div>
              <div>{item.name}</div>
            </div>
          ))}
        </div>
      </div>
      {!isGeneral && (
        <div className="flex flex-col">
          <h2 className="pb-[10px]">Articles</h2>
          <div className="grid grid-cols-3 gap-[10px]">
            {article.map((item) => (
              <div
                key={item.identifier}
                onClick={showApiButton(item.identifier, item.name)}
                className="w-[120px] h-[100px] bg-input text-textColor justify-center items-center flex flex-col gap-[10px] cursor-pointer"
              >
                <div>
                  <img
                    className="w-[32px] h-[32px] rounded-full"
                    src={`/icons/platforms/${item.identifier}.png`}
                  />
                </div>
                <div>{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
