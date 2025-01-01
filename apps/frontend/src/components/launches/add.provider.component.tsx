'use client';

import { useModals } from '@mantine/modals';
import React, { FC, useCallback, useMemo } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Input } from '@gitroom/react/form/input';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ApiKeyDto } from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';
import { useRouter } from 'next/navigation';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

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
    <button
      className="text-white p-[8px] rounded-md bg-forth flex gap-[5px]"
      onClick={add}
    >
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="25"
          height="25"
          viewBox="0 0 32 32"
          fill="none"
        >
          <path
            d="M7 26C7 26.2652 6.89464 26.5196 6.70711 26.7071C6.51957 26.8946 6.26522 27 6 27C5.73478 27 5.48043 26.8946 5.29289 26.7071C5.10536 26.5196 5 26.2652 5 26C5 25.7348 4.89464 25.4804 4.70711 25.2929C4.51957 25.1054 4.26522 25 4 25C3.73478 25 3.48043 24.8946 3.29289 24.7071C3.10536 24.5196 3 24.2652 3 24C3 23.7348 3.10536 23.4804 3.29289 23.2929C3.48043 23.1054 3.73478 23 4 23C4.79565 23 5.55871 23.3161 6.12132 23.8787C6.68393 24.4413 7 25.2044 7 26ZM4 19C3.73478 19 3.48043 19.1054 3.29289 19.2929C3.10536 19.4804 3 19.7348 3 20C3 20.2652 3.10536 20.5196 3.29289 20.7071C3.48043 20.8946 3.73478 21 4 21C5.32608 21 6.59785 21.5268 7.53553 22.4645C8.47322 23.4021 9 24.6739 9 26C9 26.2652 9.10536 26.5196 9.29289 26.7071C9.48043 26.8946 9.73478 27 10 27C10.2652 27 10.5196 26.8946 10.7071 26.7071C10.8946 26.5196 11 26.2652 11 26C10.998 24.1441 10.2599 22.3648 8.94755 21.0524C7.63523 19.7401 5.85591 19.002 4 19ZM4 15C3.73478 15 3.48043 15.1054 3.29289 15.2929C3.10536 15.4804 3 15.7348 3 16C3 16.2652 3.10536 16.5196 3.29289 16.7071C3.48043 16.8946 3.73478 17 4 17C6.38614 17.0026 8.67378 17.9517 10.361 19.639C12.0483 21.3262 12.9974 23.6139 13 26C13 26.2652 13.1054 26.5196 13.2929 26.7071C13.4804 26.8946 13.7348 27 14 27C14.2652 27 14.5196 26.8946 14.7071 26.7071C14.8946 26.5196 15 26.2652 15 26C14.9967 23.0836 13.8367 20.2877 11.7745 18.2255C9.71234 16.1633 6.91637 15.0033 4 15ZM27 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V12C3 12.2652 3.10536 12.5196 3.29289 12.7071C3.48043 12.8946 3.73478 13 4 13C7.4467 13.0036 10.7512 14.3744 13.1884 16.8116C15.6256 19.2488 16.9964 22.5533 17 26C17 26.2652 17.1054 26.5196 17.2929 26.7071C17.4804 26.8946 17.7348 27 18 27H27C27.5304 27 28.0391 26.7893 28.4142 26.4142C28.7893 26.0391 29 25.5304 29 25V7C29 6.46957 28.7893 5.96086 28.4142 5.58579C28.0391 5.21071 27.5304 5 27 5Z"
            fill="white"
          />
        </svg>
      </div>
      <div className="flex-1 text-left">Add Channel</div>
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

export const UrlModal: FC<{
  gotoUrl(url: string): void;
}> = (props) => {
  const { gotoUrl } = props;
  const methods = useForm({
    mode: 'onChange',
  });

  const submit = useCallback(async (data: FieldValues) => {
    gotoUrl(data.url);
  }, []);

  return (
    <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative">
      <TopTitle title={`Instance URL`} />
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
            <Input label="URL" name="url" />
          </div>
          <div>
            <Button type="submit">Connect</Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export const CustomVariables: FC<{
  variables: Array<{
    key: string;
    label: string;
    defaultValue?: string;
    validation: string;
    type: 'text' | 'password';
  }>;
  close?: () => void;
  identifier: string;
  gotoUrl(url: string): void;
}> = (props) => {
  const { close, gotoUrl, identifier, variables } = props;
  const modals = useModals();
  const schema = useMemo(() => {
    return object({
      ...variables.reduce((aIcc, item) => {
        const splitter = item.validation.split('/');
        const regex = new RegExp(
          splitter.slice(1, -1).join('/'),
          splitter.pop()
        );
        return {
          ...aIcc,
          [item.key]: string()
            .matches(regex, `${item.label} is invalid`)
            .required(),
        };
      }, {}),
    });
  }, [variables]);

  const methods = useForm({
    mode: 'onChange',
    resolver: yupResolver(schema),
    values: variables.reduce(
      (acc, item) => ({
        ...acc,
        ...(item.defaultValue ? { [item.key]: item.defaultValue } : {}),
      }),
      {}
    ),
  });

  const submit = useCallback(
    async (data: FieldValues) => {
      gotoUrl(
        `/integrations/social/${identifier}?state=nostate&code=${Buffer.from(
          JSON.stringify(data)
        ).toString('base64')}`
      );
    },
    [variables]
  );

  return (
    <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative">
      <TopTitle title={`Custom URL`} />
      <button
        onClick={close || modals.closeAll}
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
          className="gap-[8px] flex flex-col pt-[10px]"
          onSubmit={methods.handleSubmit(submit)}
        >
          {variables.map((variable) => (
            <div key={variable.key}>
              <Input
                label={variable.label}
                name={variable.key}
                type={variable.type == 'text' ? 'text' : 'password'}
              />
            </div>
          ))}
          <div>
            <Button type="submit">Connect</Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export const AddProviderComponent: FC<{
  social: Array<{
    identifier: string;
    name: string;
    isExternal: boolean;
    customFields?: Array<{
      key: string;
      label: string;
      validation: string;
      type: 'text' | 'password';
    }>;
  }>;
  article: Array<{ identifier: string; name: string }>;
  update?: () => void;
}> = (props) => {
  const { update, social, article } = props;
  const { isGeneral } = useVariables();
  const toaster = useToaster();
  const router = useRouter();
  const fetch = useFetch();
  const modal = useModals();
  const getSocialLink = useCallback(
    (
        identifier: string,
        isExternal: boolean,
        customFields?: Array<{
          key: string;
          label: string;
          validation: string;
          defaultValue?: string;
          type: 'text' | 'password';
        }>
      ) =>
      async () => {
        const gotoIntegration = async (externalUrl?: string) => {
          const { url, err } = await (
            await fetch(
              `/integrations/social/${identifier}${
                externalUrl ? `?externalUrl=${externalUrl}` : ``
              }`
            )
          ).json();

          if (err) {
            toaster.show('Could not connect to the platform', 'warning');
            return;
          }
          window.location.href = url;
        };

        if (isExternal) {
          modal.closeAll();

          modal.openModal({
            title: '',
            withCloseButton: false,
            classNames: {
              modal: 'bg-transparent text-textColor',
            },
            children: <UrlModal gotoUrl={gotoIntegration} />,
          });

          return;
        }

        if (customFields) {
          modal.closeAll();

          modal.openModal({
            title: '',
            withCloseButton: false,
            classNames: {
              modal: 'bg-transparent text-textColor',
            },
            children: (
              <CustomVariables
                identifier={identifier}
                gotoUrl={(url: string) => router.push(url)}
                variables={customFields}
              />
            ),
          });
          return;
        }

        await gotoIntegration();
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
              onClick={getSocialLink(
                item.identifier,
                item.isExternal,
                item.customFields
              )}
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
