'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { ModalFormActions } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { FormProvider, useForm } from 'react-hook-form';
import { array, object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Select } from '@gitroom/react/form/select';
import { PickPlatforms } from '@gitroom/frontend/components/launches/helpers/pick.platform.component';
import { sortIntegrationsByProviderImportance } from '@gitroom/frontend/components/launches/helpers/sort.integrations';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SettingsPaneEditor } from '@gitroom/frontend/components/settings/settings-pane-editor';
import { useSettingsTabChrome } from '@gitroom/frontend/components/settings/settings-tab-chrome.context';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

export const Webhooks: FC = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const user = useUser();
  const { setChromePatch } = useSettingsTabChrome();
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const list = useCallback(async () => {
    return (await fetch('/webhooks')).json();
  }, []);
  const { data, mutate } = useSWR('webhooks', list);

  useEffect(() => {
    const limit = user?.tier?.webhooks;
    if (!limit) return;
    setChromePatch({
      title: t('webhooks_quota_title', 'Webhooks ({{count}}/{{limit}})', {
        count: data?.length ?? 0,
        limit,
      }),
    });
    return () => setChromePatch(null);
  }, [data?.length, setChromePatch, t, user?.tier?.webhooks]);

  const closeEditor = useCallback(() => setEditing(undefined), []);
  const deleteHook = useCallback(
    (row: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete ${row.name}?`,
            { name: row.name }
          )
        )
      ) {
        await fetch(`/webhooks/${row.id}`, {
          method: 'DELETE',
        });
        mutate();
        toaster.show(
          t('webhook_deleted_successfully', 'Webhook deleted successfully'),
          'success'
        );
      }
    },
    [fetch, mutate, toaster, t]
  );

  if (editing !== undefined) {
    return (
      <SettingsPaneEditor
        title={
          editing
            ? t('update_webhook', 'Update webhook')
            : t('add_webhook', 'Add webhook')
        }
        description={t(
          'webhook_editor_description',
          'Send a ping when posts publish so your other tools can react.'
        )}
        onBack={closeEditor}
      >
        <AddOrEditWebhook
          data={editing || undefined}
          reload={() => {
            mutate();
            closeEditor();
          }}
          onCancel={closeEditor}
        />
      </SettingsPaneEditor>
    );
  }

  return (
    <div className="flex flex-col">
      {!!data?.length && (
        <div className="mt-[18px] overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
          {data?.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center gap-[11px] border-b border-pqLine p-[13px_15px] last:border-b-0"
            >
              <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-pqSettings text-pqMuted">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.2 13.8a4.2 4.2 0 0 0 6.3.45l2.4-2.4a4.2 4.2 0 0 0-5.95-5.95l-1.4 1.4M13.8 10.2a4.2 4.2 0 0 0-6.3-.45l-2.4 2.4a4.2 4.2 0 0 0 5.95 5.95l1.4-1.4" />
                </svg>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate text-[13.5px] font-[600]">{p.name}</div>
                <div className="mt-[2px] truncate font-mono text-[11.5px] text-pqSoft">
                  {p.url}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(p)}
                aria-label={t('edit', 'Edit')}
                title={t('edit', 'Edit')}
                className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={deleteHook(p)}
                aria-label={t('delete', 'Delete')}
                title={t('delete', 'Delete')}
                className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqWarn"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setEditing(null)}
        className={clsx(
          'flex h-[34px] items-center gap-[6px] self-start rounded-pqSm bg-pqBrand ps-[11px] pe-[13px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover',
          (data?.length || 0) > 0 ? 'mt-[13px]' : 'mt-[18px]'
        )}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 5.5v13M5.5 12h13" />
        </svg>
        {t('add_a_webhook', 'Add a webhook')}
      </button>
    </div>
  );
};
const details = object().shape({
  name: string().required(),
  url: string().url().required(),
  integrations: array(),
});
const getWebhookOptions = (t: (key: string, fallback: string) => string) => [
  {
    label: t('all_integrations', 'All integrations'),
    value: 'all',
  },
  {
    label: t('specific_integrations', 'Specific integrations'),
    value: 'specific',
  },
];
export const AddOrEditWebhook: FC<{
  data?: any;
  reload: () => void;
  onCancel?: () => void;
}> = (props) => {
  const { data, reload, onCancel } = props;
  const fetch = useFetch();
  const t = useT();
  const options = getWebhookOptions(t);
  const [allIntegrations, setAllIntegrations] = useState(
    (data?.integrations?.length || 0) > 0 ? options[1] : options[0]
  );
  const toast = useToaster();
  const form = useForm({
    resolver: yupResolver(details),
    values: {
      name: data?.name || '',
      url: data?.url || '',
      integrations: data?.integrations?.map((p: any) => p.integration) || [],
    },
  });
  const integrations = form.watch('integrations');
  const changeIntegration = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const findValue = options.find(
        (option) => option.value === e.target.value
      )!;
      setAllIntegrations(findValue);
      if (findValue.value === 'all') {
        form.setValue('integrations', []);
      }
    },
    []
  );
  // Shared list cache — array shape. Never reuse key `'integrations'` with a
  // full `{ integrations }` response (poisons AgentList / other consumers).
  const { data: dataList, isLoading } = useIntegrationList();
  const callBack = useCallback(
    async (values: any) => {
      await fetch('/webhooks', {
        method: data?.id ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...(data?.id
            ? {
                id: data.id,
              }
            : {}),
          ...values,
        }),
      });
      toast.show(
        data?.id
          ? t('webhook_updated_successfully', 'Webhook updated successfully')
          : t('webhook_added_successfully', 'Webhook added successfully'),
        'success'
      );
      reload();
    },
    [data, integrations]
  );
  const sendTest = useCallback(async () => {
    const url = form.getValues('url');
    try {
      const response = await fetch(
        `/webhooks/send?url=${encodeURIComponent(url)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            {
              id: 'cm6tcts4f0005qcwit25cis26',
              content: 'This is the first post to instagram',
              publishDate: '2025-02-06T13:09:00.000Z',
              releaseURL: 'https://facebook.com/release/release',
              state: 'PUBLISHED',
              integration: {
                id: 'cm6s4uyou0001i2r47pxix6z1',
                name: 'test',
                providerIdentifier: 'instagram',
                picture: 'https://example.com/sample-avatar.jpg',
                type: 'social',
              },
            },
            {
              id: 'cm6tcts4f0005qcwit25cis26',
              content: 'This is the second post to facebook',
              publishDate: '2025-02-06T13:09:00.000Z',
              releaseURL: 'https://facebook.com/release2/release2',
              state: 'PUBLISHED',
              integration: {
                id: 'cm6s4uyou0001i2r47pxix6z1',
                name: 'test2',
                providerIdentifier: 'facebook',
                picture: 'https://example.com/sample-avatar.jpg',
                type: 'social',
              },
            },
          ]),
        }
      );

      const result = await response.json().catch(() => ({ send: false }));

      toast.show(
        result?.send
          ? t('webhook_sent', 'Webhook delivered')
          : t('webhook_failed', 'The endpoint did not accept the test webhook'),
        result?.send ? 'success' : 'warning'
      );
    } catch (e: any) {
      toast.show(
        t('webhook_failed', 'The endpoint did not accept the test webhook'),
        'warning'
      );
    }
  }, []);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(callBack)}>
        <div className="relative flex flex-1 flex-col gap-[12px] pt-0">
          <Input
            label="Name"
            translationKey="label_name"
            removeError={true}
            {...form.register('name')}
          />
          <Input
            label="URL"
            translationKey="label_url"
            removeError={true}
            {...form.register('url')}
          />
          <Select
            value={allIntegrations.value}
            name="integrations"
            label="Integrations"
            translationKey="label_integrations"
            disableForm={true}
            hideErrors={true}
            onChange={changeIntegration}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {allIntegrations.value === 'specific' && dataList && !isLoading && (
            <PickPlatforms
              integrations={sortIntegrationsByProviderImportance(dataList)}
              selectedIntegrations={integrations as any[]}
              onChange={(e) => form.setValue('integrations', e)}
              singleSelect={false}
              toolTip={true}
              isMain={true}
            />
          )}
          <ModalFormActions onCancel={() => onCancel?.()}>
            <Button
              type="submit"
              className="h-[40px] shrink-0 rounded-[10px] px-[18px] text-[13.5px] font-[600]"
              disabled={
                !form.formState.isValid ||
                (allIntegrations.value === 'specific' && !integrations?.length)
              }
            >
              {t('save', 'Save')}
            </Button>
            <Button
              type="button"
              secondary={true}
              className="h-[40px] shrink-0 rounded-[10px] px-[16px] text-[13.5px] font-[600]"
              onClick={sendTest}
              disabled={
                !form.formState.isValid ||
                (allIntegrations.value === 'specific' && !integrations?.length)
              }
            >
              {t('send_test', 'Send Test')}
            </Button>
          </ModalFormActions>
        </div>
      </form>
    </FormProvider>
  );
};
