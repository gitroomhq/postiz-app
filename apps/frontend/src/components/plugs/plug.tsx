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
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
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
import { ModalWrapperComponent } from '@gitroom/frontend/components/new-launch/modal.wrapper.component';
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
  return (
    <>
      <textarea className="hidden" {...all}></textarea>
      <CopilotTextarea
        disableBranding={true}
        placeholder={props.placeHolder}
        value={value}
        className={clsx(
          '!min-h-40 !max-h-80 p-[24px] overflow-hidden bg-customColor2 outline-none rounded-[4px] border-fifth border'
        )}
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
      <div className="text-red-400 text-[12px]">
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
        <div className="relative mx-auto">
          <div className="my-[20px]">{plug.description}</div>
          <div>
            {plug.fields.map((field) => (
              <div key={field.name}>
                {field.type === 'richtext' ? (
                  <TextArea name={field.name} placeHolder={field.placeholder} />
                ) : (
                  <Input
                    name={field.name}
                    label={field.description}
                    className="w-full mt-[8px] p-[8px] border border-tableBorder rounded-md text-black"
                    placeholder={field.placeholder}
                    type={field.type}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-[20px]">
            <Button type="submit">{t('activate', 'Activate')}</Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
export const PlugItem: FC<{
  plug: PlugsInterface;
  addPlug: (data: any) => void;
  data?: {
    activated: boolean;
    data: string;
    id: string;
    integrationId: string;
    organizationId: string;
    plugFunction: string;
  };
}> = (props) => {
  const { plug, addPlug, data } = props;
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
  return (
    <div
      onClick={() => addPlug(data)}
      key={plug.title}
      className="w-full h-[300px] rounded-[8px] bg-newTableHeader hover:bg-newTableBorder"
    >
      <div key={plug.title} className="p-[16px] h-full flex flex-col flex-1">
        <div className="flex">
          <div className="text-[20px] mb-[8px] flex-1">{plug.title}</div>
          {!!data && (
            <div onClick={(e) => e.stopPropagation()}>
              <Slider
                value={activated ? 'on' : 'off'}
                onChange={changeActivated}
                fill={true}
              />
            </div>
          )}
        </div>
        <div className="flex-1">{plug.description}</div>
        <Button>{!data ? 'Set Plug' : 'Edit Plug'}</Button>
      </div>
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
          withCloseButton: false,
          onClose() {
            mutate();
          },
          size: '500px',
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
    <div className="grid grid-cols-3 gap-[30px]">
      {plug.plugs.map((p) => (
        <PlugItem
          key={p.title + '-' + plug.providerId}
          addPlug={addEditPlug(p)}
          plug={p}
          data={data?.find((a: any) => a.plugFunction === p.methodName)}
        />
      ))}
    </div>
  );
};
