'use client';

import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Input } from '@gitroom/react/form/input';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ApiKeyDto } from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { web3List } from '@gitroom/frontend/components/launches/web3/web3.list';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ModalWrapperComponent } from '@gitroom/frontend/components/new-launch/modal.wrapper.component';
const resolver = classValidatorResolver(ApiKeyDto);
export const useAddProvider = (update?: () => void) => {
  const modal = useModals();
  const fetch = useFetch();
  return useCallback(async () => {
    const data = await (await fetch('/integrations')).json();
    modal.openModal({
      title: 'Add Channel',
      withCloseButton: true,
      children: <AddProviderComponent update={update} {...data} />,
    });
  }, []);
};
export const AddProviderButton: FC<{
  update?: () => void;
}> = (props) => {
  const { update } = props;
  const query = useSearchParams();
  const add = useAddProvider(update);
  const t = useT();

  useEffect(() => {
    if (query.get('onboarding')) {
      add();
    }
  }, []);

  return (
    <button
      className="text-btnText bg-btnSimple h-[44px] pt-[12px] pb-[14px] ps-[16px] pe-[20px] justify-center items-center flex rounded-[8px] gap-[8px]"
      onClick={add}
    >
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M1.66675 10.0417C3.35907 10.2299 4.93698 10.9884 6.14101 12.1924C7.34504 13.3964 8.10353 14.9743 8.29175 16.6667M1.66675 13.4167C2.46749 13.58 3.20253 13.9751 3.7804 14.553C4.35827 15.1309 4.75344 15.8659 4.91675 16.6667M1.66675 16.6667H1.67508M11.6667 17.5H14.3334C15.7335 17.5 16.4336 17.5 16.9684 17.2275C17.4388 16.9878 17.8212 16.6054 18.0609 16.135C18.3334 15.6002 18.3334 14.9001 18.3334 13.5V6.5C18.3334 5.09987 18.3334 4.3998 18.0609 3.86502C17.8212 3.39462 17.4388 3.01217 16.9684 2.77248C16.4336 2.5 15.7335 2.5 14.3334 2.5H5.66675C4.26662 2.5 3.56655 2.5 3.03177 2.77248C2.56137 3.01217 2.17892 3.39462 1.93923 3.86502C1.66675 4.3998 1.66675 5.09987 1.66675 6.5V6.66667"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="text-start text-[16px] group-[.sidebar]:hidden">
        {t('add_channel', 'Add Channel')}
      </div>
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
        body: JSON.stringify({
          api: data.api,
        }),
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

  const t = useT();

  return (
    <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative">
      <TopTitle title={`Add API key for ${name}`} />
      <button
        onClick={close}
        className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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
            <Button type="submit">{t('add_platform', 'Add platform')}</Button>
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

  const t = useT();

  const submit = useCallback(async (data: FieldValues) => {
    gotoUrl(data.url);
  }, []);
  return (
    <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative">
      <TopTitle title={`Instance URL`} />
      <button
        onClick={close}
        className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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
            <Button type="submit">{t('connect', 'Connect')}</Button>
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
        ...(item.defaultValue
          ? {
              [item.key]: item.defaultValue,
            }
          : {}),
      }),
      {}
    ),
  });
  const submit = useCallback(
    async (data: FieldValues) => {
      modals.closeAll();
      gotoUrl(
        `/integrations/social/${identifier}?state=nostate&code=${Buffer.from(
          JSON.stringify(data)
        ).toString('base64')}`
      );
    },
    [variables]
  );

  const t = useT();

  return (
    <div className="rounded-[4px] relative">
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
            <Button type="submit">{t('connect', 'Connect')}</Button>
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
    toolTip?: string;
    isExternal: boolean;
    isWeb3: boolean;
    customFields?: Array<{
      key: string;
      label: string;
      validation: string;
      type: 'text' | 'password';
    }>;
  }>;
  article: Array<{
    identifier: string;
    name: string;
  }>;
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
        isWeb3: boolean,
        customFields?: Array<{
          key: string;
          label: string;
          validation: string;
          defaultValue?: string;
          type: 'text' | 'password';
        }>
      ) =>
      async () => {
        const openWeb3 = async () => {
          const { component: Web3Providers } = web3List.find(
            (item) => item.identifier === identifier
          )!;
          const { url } = await (
            await fetch(`/integrations/social/${identifier}`)
          ).json();
          modal.openModal({
            title: 'Web3 provider',
            withCloseButton: false,
            classNames: {
              modal: 'bg-transparent text-textColor',
            },
            children: (
              <Web3Providers
                onComplete={(code, newState) => {
                  window.location.href = `/integrations/social/${identifier}?code=${code}&state=${newState}`;
                }}
                nonce={url}
              />
            ),
          });
          return;
        };
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
        if (isWeb3) {
          openWeb3();
          return;
        }
        if (isExternal) {
          modal.closeAll();
          modal.openModal({
            title: 'URL',
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
            title: 'Add Provider',
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

  const t = useT();

  return (
    <div className="w-full flex flex-col gap-[20px] rounded-[4px] relative">
      <div className="flex flex-col">
        <div className="grid grid-cols-5 gap-[10px] justify-items-center justify-center">
          {social.map((item) => (
            <div
              key={item.identifier}
              onClick={getSocialLink(
                item.identifier,
                item.isExternal,
                item.isWeb3,
                item.customFields
              )}
              {...(!!item.toolTip
                ? {
                    'data-tooltip-id': 'tooltip',
                    'data-tooltip-content': item.toolTip,
                  }
                : {})}
              className={
                'w-full h-[100px] text-[14px] p-[10px] rounded-[8px] bg-newTableHeader text-textColor relative justify-center items-center flex flex-col gap-[10px] cursor-pointer'
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
              <div className="whitespace-pre-wrap text-center">
                {item.name}
                {!!item.toolTip && (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 26 26"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute top-[10px] end-[10px]"
                  >
                    <path
                      d="M13 0C10.4288 0 7.91543 0.762437 5.77759 2.1909C3.63975 3.61935 1.97351 5.64968 0.989572 8.02512C0.0056327 10.4006 -0.251811 13.0144 0.249797 15.5362C0.751405 18.0579 1.98953 20.3743 3.80762 22.1924C5.6257 24.0105 7.94208 25.2486 10.4638 25.7502C12.9856 26.2518 15.5995 25.9944 17.9749 25.0104C20.3503 24.0265 22.3807 22.3603 23.8091 20.2224C25.2376 18.0846 26 15.5712 26 13C25.9964 9.5533 24.6256 6.24882 22.1884 3.81163C19.7512 1.37445 16.4467 0.00363977 13 0ZM13 21C12.7033 21 12.4133 20.912 12.1667 20.7472C11.92 20.5824 11.7277 20.3481 11.6142 20.074C11.5007 19.7999 11.471 19.4983 11.5288 19.2074C11.5867 18.9164 11.7296 18.6491 11.9393 18.4393C12.1491 18.2296 12.4164 18.0867 12.7074 18.0288C12.9983 17.9709 13.2999 18.0007 13.574 18.1142C13.8481 18.2277 14.0824 18.42 14.2472 18.6666C14.412 18.9133 14.5 19.2033 14.5 19.5C14.5 19.8978 14.342 20.2794 14.0607 20.5607C13.7794 20.842 13.3978 21 13 21ZM14 14.91V15C14 15.2652 13.8946 15.5196 13.7071 15.7071C13.5196 15.8946 13.2652 16 13 16C12.7348 16 12.4804 15.8946 12.2929 15.7071C12.1054 15.5196 12 15.2652 12 15V14C12 13.7348 12.1054 13.4804 12.2929 13.2929C12.4804 13.1054 12.7348 13 13 13C14.6538 13 16 11.875 16 10.5C16 9.125 14.6538 8 13 8C11.3463 8 10 9.125 10 10.5V11C10 11.2652 9.89465 11.5196 9.70711 11.7071C9.51958 11.8946 9.26522 12 9.00001 12C8.73479 12 8.48044 11.8946 8.2929 11.7071C8.10536 11.5196 8.00001 11.2652 8.00001 11V10.5C8.00001 8.01875 10.2425 6 13 6C15.7575 6 18 8.01875 18 10.5C18 12.6725 16.28 14.4913 14 14.91Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {!isGeneral && (
        <div className="flex flex-col">
          <h2 className="pb-[10px]">{t('articles', 'Articles')}</h2>
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
