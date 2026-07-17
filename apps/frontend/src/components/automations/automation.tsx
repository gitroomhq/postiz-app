'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { array, object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Textarea } from '@gitroom/react/form/textarea';
import { Slider } from '@gitroom/react/form/slider';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

export interface WebhookActionInterface {
  type: string;
  title: string;
  description: string;
  placeholder: string;
  required: boolean;
}
export interface WebhookInterface {
  identifier: string;
  title: string;
  description: string;
  methodName: string;
  scopes: string[];
  trigger: {
    title: string;
    description: string;
    placeholder: string;
  };
  actions: WebhookActionInterface[];
}
export interface WebhookPlatformInterface {
  name: string;
  identifier: string;
  webhooks: WebhookInterface[];
}
export interface AutomationInterface {
  id: string;
  name: string;
  platform: string;
  automationFunction: string;
  data: string;
  activated: boolean;
}

const automationSchema = object({
  name: string().required('Name is required'),
  keywords: string(),
  actions: array()
    .of(
      object({
        variations: array().of(
          object({
            value: string().required('Variation can not be empty'),
          })
        ),
      })
    )
    .required(),
});

const ActionVariations: FC<{
  actionIndex: number;
  action: WebhookActionInterface;
}> = (props) => {
  const { actionIndex, action } = props;
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `actions.${actionIndex}.variations`,
  });
  const t = useT();
  const minVariations = action.required ? 1 : 0;
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="text-[18px]">
        {action.title}{' '}
        {!action.required && (
          <span className="text-[14px] opacity-70">
            ({t('optional', 'Optional')})
          </span>
        )}
      </div>
      <div className="text-[14px] opacity-70">{action.description}</div>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-[8px]">
          <div className="flex-1">
            <Textarea
              label={`${t('variation', 'Variation')} ${index + 1}`}
              name={`actions.${actionIndex}.variations.${index}.value`}
              placeholder={action.placeholder}
              className="!min-h-[80px] w-full"
              error={
                (form.formState.errors as any)?.actions?.[actionIndex]
                  ?.variations?.[index]?.value?.message
              }
            />
          </div>
          {fields.length > minVariations && (
            <div className="pt-[26px]">
              <Button secondary={true} onClick={() => remove(index)}>
                {t('remove', 'Remove')}
              </Button>
            </div>
          )}
        </div>
      ))}
      <div>
        <Button secondary={true} onClick={() => append({ value: '' })}>
          {t('add_variation', 'Add variation')}
        </Button>
      </div>
    </div>
  );
};

const AutomationModal: FC<{
  platform: WebhookPlatformInterface;
  webhook: WebhookInterface;
  data?: AutomationInterface;
  reload: () => void;
}> = (props) => {
  const { platform, webhook, data, reload } = props;
  const fetch = useFetch();
  const toaster = useToaster();
  const modal = useModals();
  const t = useT();
  const values = useMemo(() => {
    const existing = data?.data ? JSON.parse(data.data) : null;
    const existingActions = Array.isArray(existing)
      ? existing
      : existing?.actions || [];
    const existingKeywords = Array.isArray(existing)
      ? []
      : existing?.keywords || [];
    return {
      name: data?.name || '',
      keywords: existingKeywords.join(', '),
      actions: webhook.actions.map((action) => {
        const existing = existingActions.find(
          (f: any) => f.type === action.type
        );
        const variations =
          existing?.variations || (action.required ? [''] : []);
        return {
          variations: variations.map((value: string) => ({ value })),
        };
      }),
    };
  }, []);
  const form = useForm<any>({
    resolver: yupResolver(automationSchema) as any,
    values,
    mode: 'all',
  });
  const submit = useCallback(
    async (formValues: any) => {
      const response = await fetch(
        data?.id ? `/automations/${data.id}` : '/automations',
        {
          method: data?.id ? 'PUT' : 'POST',
          body: JSON.stringify({
            name: formValues.name,
            platform: platform.identifier,
            automationFunction: webhook.methodName,
            keywords: (formValues.keywords || '')
              .split(',')
              .map((keyword: string) => keyword.trim())
              .filter(Boolean),
            actions: formValues.actions
              .map((action: any, index: number) => ({
                type: webhook.actions[index].type,
                variations: action.variations.map((v: any) => v.value),
              }))
              .filter((action: any) => action.variations.length),
          }),
        }
      );

      if (!response.ok) {
        toaster.show(
          t('failed_to_save_automation', 'Failed to save the automation'),
          'warning'
        );
        return;
      }

      toaster.show(
        data?.id
          ? 'Automation updated successfully'
          : 'Automation added successfully',
        'success'
      );
      modal.closeCurrent();
      reload();
    },
    [data, modal, reload]
  );
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px]">
          <div>{webhook.description}</div>
          <Input
            label={t('name', 'Name')}
            name="name"
            placeholder={t('automation_name', 'Automation name')}
          />
          {!!webhook.trigger && (
            <div className="flex flex-col gap-[8px]">
              <div className="text-[14px] opacity-70">
                {webhook.trigger.description}
              </div>
              <Input
                label={webhook.trigger.title}
                name="keywords"
                placeholder={webhook.trigger.placeholder}
              />
            </div>
          )}
          {webhook.actions.map((action, index) => (
            <ActionVariations
              key={action.type}
              actionIndex={index}
              action={action}
            />
          ))}
          <Button type="submit">{t('save', 'Save')}</Button>
        </div>
      </form>
    </FormProvider>
  );
};

const AutomationItem: FC<{
  webhook: WebhookInterface;
  automation: AutomationInterface;
  edit: () => void;
  reload: () => void;
}> = (props) => {
  const { webhook, automation, edit, reload } = props;
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const [activated, setActivated] = useState(automation.activated);
  useEffect(() => {
    setActivated(automation.activated);
  }, [automation.activated]);
  const changeActivated = useCallback(
    async (status: 'on' | 'off') => {
      await fetch(`/automations/${automation.id}/activate`, {
        method: 'PUT',
        body: JSON.stringify({
          status: status === 'on',
        }),
      });
      setActivated(status === 'on');
    },
    [automation]
  );
  const deleteAutomation = useCallback(async () => {
    if (
      await deleteDialog(
        t('are_you_sure_you_want_to_delete', `Are you sure you want to delete?`, {
          name: automation.name,
        })
      )
    ) {
      await fetch(`/automations/${automation.id}`, {
        method: 'DELETE',
      });
      toaster.show('Automation deleted successfully', 'success');
      reload();
    }
  }, [automation, reload]);
  return (
    <div
      onClick={edit}
      className="w-full h-[300px] rounded-[8px] bg-newTableHeader hover:bg-newTableBorder"
    >
      <div className="p-[16px] h-full flex flex-col flex-1">
        <div className="flex">
          <div className="text-[20px] mb-[8px] flex-1">{automation.name}</div>
          <div onClick={(e) => e.stopPropagation()}>
            <Slider
              value={activated ? 'on' : 'off'}
              onChange={changeActivated}
              fill={true}
            />
          </div>
        </div>
        <div className="flex-1">{webhook.title}</div>
        <div className="flex gap-[8px]">
          <Button className="flex-1">{t('edit_automation', 'Edit Automation')}</Button>
          <Button
            secondary={true}
            onClick={(e) => {
              e.stopPropagation();
              deleteAutomation();
            }}
          >
            {t('delete', 'Delete')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const AutomationPlatform: FC<{
  platform: WebhookPlatformInterface;
}> = (props) => {
  const { platform } = props;
  const fetch = useFetch();
  const modals = useModals();
  const t = useT();
  const [tab, setTab] = useState<'create' | 'created'>('create');
  const load = useCallback(async () => {
    return (await fetch(`/automations?platform=${platform.identifier}`)).json();
  }, [platform.identifier]);
  const { data, isLoading, mutate } = useSWR(
    `automations-${platform.identifier}`,
    load
  );
  useEffect(() => {
    if (!isLoading && !data?.length && tab === 'created') {
      setTab('create');
    }
  }, [data?.length, isLoading, tab]);
  const addEditAutomation = useCallback(
    (webhook: WebhookInterface, automation?: AutomationInterface) => () => {
      modals.openModal({
        withCloseButton: true,
        onClose() {
          mutate();
        },
        size: '500px',
        title: `${t('automation', 'Automation')}: ${webhook.title}`,
        children: (
          <AutomationModal
            platform={platform}
            webhook={webhook}
            data={automation}
            reload={() => {
              mutate();
              setTab('created');
            }}
          />
        ),
      });
    },
    [platform, mutate]
  );
  if (isLoading) {
    return null;
  }
  return (
    <div className="flex flex-col gap-[20px]">
      {!!data?.length && (
        <div className="flex gap-[8px]">
          <Button
            secondary={tab !== 'create'}
            onClick={() => setTab('create')}
          >
            {t('create_automation', 'Create Automation')}
          </Button>
          <Button
            secondary={tab !== 'created'}
            onClick={() => setTab('created')}
          >
            {t('my_automations', 'My Automations')} ({data?.length})
          </Button>
        </div>
      )}
      {tab === 'create' ? (
        <div className="grid grid-cols-3 gap-[30px]">
          {platform.webhooks.map((webhook) => (
            <div
              key={webhook.identifier}
              onClick={addEditAutomation(webhook)}
              className="w-full h-[300px] rounded-[8px] bg-newTableHeader hover:bg-newTableBorder cursor-pointer"
            >
              <div className="p-[16px] h-full flex flex-col flex-1">
                <div className="text-[20px] mb-[8px]">{webhook.title}</div>
                <div className="flex-1">{webhook.description}</div>
                <Button>{t('add_automation', 'Add Automation')}</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[30px]">
          {(data || []).map((automation: AutomationInterface) => {
            const webhook = platform.webhooks.find(
              (w) => w.methodName === automation.automationFunction
            );
            if (!webhook) {
              return null;
            }
            return (
              <AutomationItem
                key={automation.id}
                webhook={webhook}
                automation={automation}
                edit={addEditAutomation(webhook, automation)}
                reload={mutate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
