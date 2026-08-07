'use client';

import {
  PlugSettings,
  PlugsInterface,
  usePlugs,
} from '@gitroom/frontend/components/plugs/plugs.context';
import { Button } from '@gitroom/react/form/button';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR, { mutate } from 'swr';
import {
  ModalFormActions,
  useModals,
} from '@gitroom/frontend/components/layout/new-modal';
import {
  FormProvider,
  SubmitHandler,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { Input } from '@gitroom/react/form/input';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import clsx from 'clsx';
import { string, object } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Slider } from '@gitroom/react/form/slider';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';
export function convertBackRegex(s: string) {
  const matches = s.match(/\/(.*)\/([a-z]*)/);
  const pattern = matches?.[1] || '';
  const flags = matches?.[2] || '';
  return new RegExp(pattern, flags);
}
export const TextArea: FC<{
  name: string;
  placeHolder: string;
}> = (props) => {
  const form = useFormContext();
  const { onChange, onBlur, ...all } = form.register(props.name);
  const value = form.watch(props.name);
  const { aiEnabled } = useVariables();
  const fieldClass = clsx(
    '!min-h-40 !max-h-80 !bg-transparent p-[10px_12px] text-[14px] leading-[1.55] text-pqText outline-none overflow-hidden placeholder:text-pqSoft w-full resize-none border-0'
  );
  return (
    <>
      <textarea className="hidden" {...all}></textarea>
      <div className="overflow-hidden rounded-[10px] bg-pqTableHeader shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--brand)]">
        {aiEnabled ? (
          <CopilotTextarea
            disableBranding={true}
            placeholder={props.placeHolder}
            value={value}
            className={fieldClass}
            onChange={(e) => {
              onChange({
                target: {
                  name: props.name,
                  value: e.target.value,
                },
              });
            }}
            autosuggestionsConfig={{
              textareaPurpose: `Assist me in writing social media posts.`,
              chatApiConfigs: {},
            }}
          />
        ) : (
          <textarea
            placeholder={props.placeHolder}
            value={value}
            className={fieldClass}
            onChange={(e) => {
              onChange({
                target: {
                  name: props.name,
                  value: e.target.value,
                },
              });
            }}
          />
        )}
      </div>
      <div className="text-[12px] text-pqWarn">
        {form?.formState?.errors?.[props.name]?.message as string}
      </div>
    </>
  );
};
export const PlugPop: FC<{
  plug: PlugsInterface;
  settings: PlugSettings;
  data?: {
    activated: boolean;
    data: string;
    id: string;
    integrationId: string;
    organizationId: string;
    plugFunction: string;
  };
}> = (props) => {
  const { plug, settings, data } = props;
  const { closeAll } = useModals();
  const fetch = useFetch();
  const toaster = useToaster();
  const values = useMemo(() => {
    if (!data?.data) {
      return {};
    }
    return JSON.parse(data.data).reduce((acc: any, current: any) => {
      return {
        ...acc,
        [current.name]: current.value,
      };
    }, {} as any);
  }, []);
  const yupSchema = useMemo(() => {
    return object(
      plug.fields.reduce((acc, field) => {
        return {
          ...acc,
          [field.name]: field.validation
            ? string().matches(convertBackRegex(field.validation), {
                message: 'Invalid value',
              })
            : null,
        };
      }, {})
    );
  }, []);
  const form = useForm({
    resolver: yupResolver(yupSchema),
    values,
    mode: 'all',
  });
  const submit: SubmitHandler<any> = useCallback(async (data) => {
    await fetch(`/integrations/${settings.providerId}/plugs`, {
      method: 'POST',
      body: JSON.stringify({
        func: plug.methodName,
        fields: Object.keys(data).map((key) => ({
          name: key,
          value: data[key],
        })),
      }),
    });
    toaster.show('Plug updated', 'success');
    closeAll();
  }, []);

  const t = useT();

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative mx-auto flex flex-col gap-[16px]">
          <div className="text-[14px] text-pqMuted">{plug.description}</div>
          <div className="flex flex-col gap-[16px]">
            {plug.fields.map((field) => (
              <div key={field.name}>
                {field.type === 'richtext' ? (
                  <TextArea name={field.name} placeHolder={field.placeholder} />
                ) : (
                  <Input
                    name={field.name}
                    label={field.description}
                    placeholder={field.placeholder}
                    type={field.type}
                  />
                )}
              </div>
            ))}
          </div>
          <ModalFormActions onCancel={() => closeAll()}>
            <Button
              type="submit"
              className="h-[40px] shrink-0 rounded-[10px] px-[18px] text-[13.5px] font-[600]"
            >
              {t('activate', 'Activate')}
            </Button>
          </ModalFormActions>
        </div>
      </form>
    </FormProvider>
  );
};
const PlugBoltIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <path
      d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlugItem: FC<{
  plug: PlugsInterface;
  addPlug: (data: any) => void;
  channelLabel: string;
  data?: {
    activated: boolean;
    data: string;
    id: string;
    integrationId: string;
    organizationId: string;
    plugFunction: string;
  };
}> = (props) => {
  const { plug, addPlug, data, channelLabel } = props;
  const t = useT();
  const [activated, setActivated] = useState(!!data?.activated);
  useEffect(() => {
    setActivated(!!data?.activated);
  }, [data?.activated]);
  const fetch = useFetch();
  const changeActivated = useCallback(
    async (status: 'on' | 'off') => {
      await fetch(`/integrations/plugs/${data?.id}/activate`, {
        body: JSON.stringify({
          status: status === 'on',
        }),
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setActivated(status === 'on');
    },
    [activated]
  );
  const ctaLabel =
    data && activated
      ? t('edit_plug', 'Edit plug')
      : t('set_up_plug', 'Set up plug');
  return (
    <div
      onClick={() => addPlug(data)}
      key={plug.title}
      className="flex cursor-pointer flex-col gap-[11px] rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)] transition-[box-shadow] hover:shadow-[inset_0_0_0_1px_var(--brand)]"
    >
      <div className="flex items-start gap-[11px]">
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-pqBrandSoft text-pqFocused">
          <PlugBoltIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-[600] text-pqText">{plug.title}</div>
          <div className="mt-[2px] text-[12px] text-pqSoft">{channelLabel}</div>
        </div>
        {!!data && (
          <div
            onClick={(e) => e.stopPropagation()}
            data-tooltip-id="tooltip"
            data-tooltip-content={
              activated
                ? t('turn_off', 'Turn off')
                : t('turn_on', 'Turn on')
            }
          >
            <Slider
              value={activated ? 'on' : 'off'}
              onChange={changeActivated}
              fill={true}
            />
          </div>
        )}
      </div>
      <div className="text-[13px] leading-[1.6] text-pqMuted">
        {plug.description}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          addPlug(data);
        }}
        className="self-start rounded-pqSm bg-pqSettings px-[12px] py-[6px] text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
      >
        {ctaLabel}
      </button>
    </div>
  );
};
export const Plug = () => {
  const plug = usePlugs();
  const modals = useModals();
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/integrations/${plug.providerId}/plugs`)).json();
  }, [plug.providerId]);
  const { data, isLoading, mutate } = useSWR(`plugs-${plug.providerId}`, load);
  const channelLabel = `${plug.name} · ${plug.identifier}`;
  const addEditPlug = useCallback(
    (p: PlugsInterface) =>
      (data?: {
        activated: boolean;
        data: string;
        id: string;
        integrationId: string;
        organizationId: string;
        plugFunction: string;
      }) => {
        modals.openModal({
          withCloseButton: true,
          onClose() {
            mutate();
          },
          title: `Auto Plug: ${p.title}`,
          children: (
            <PlugPop
              plug={p}
              data={data}
              settings={{
                identifier: plug.identifier,
                providerId: plug.providerId,
                name: plug.name,
              }}
            />
          ),
        });
      },
    [data]
  );
  if (isLoading) {
    return null;
  }
  return (
    <div className="mx-auto grid w-full max-w-[1000px] grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[10px]">
      {plug.plugs.map((p) => (
        <PlugItem
          key={p.title + '-' + plug.providerId}
          addPlug={addEditPlug(p)}
          channelLabel={channelLabel}
          plug={p}
          data={data?.find((a: any) => a.plugFunction === p.methodName)}
        />
      ))}
    </div>
  );
};
