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
import { useModals } from '@mantine/modals';
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

export function convertBackRegex(s: string) {
  const matches = s.match(/\/(.*)\/([a-z]*)/);
  const pattern = matches?.[1] || '';
  const flags = matches?.[2] || '';

  return new RegExp(pattern, flags);
}

export const TextArea: FC<{ name: string; placeHolder: string }> = (props) => {
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
          onChange({ target: { name: props.name, value: e.target.value } });
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

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="fixed left-0 top-0 bg-primary/80 z-[300] w-full min-h-full p-4 md:p-[60px] animate-fade">
          <div className="max-w-[1000px] w-full h-full bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative mx-auto">
            <div className="flex flex-col">
              <div className="flex-1">
                <TopTitle title={`Auto Plug: ${plug.title}`} />
              </div>
              <button
                onClick={closeAll}
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
            <div className="my-[20px]">{plug.description}</div>
            <div>
              {plug.fields.map((field) => (
                <div key={field.name}>
                  {field.type === 'richtext' ? (
                    <TextArea
                      name={field.name}
                      placeHolder={field.placeholder}
                    />
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
              <Button type="submit">Activate</Button>
            </div>
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
      className="w-full h-[300px] bg-customColor48 hover:bg-customColor2 hover:border-customColor48 hover:border"
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
          classNames: {
            modal: 'bg-transparent text-textColor',
          },
          withCloseButton: false,
          onClose() {
            mutate();
          },
          size: '100%',
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
