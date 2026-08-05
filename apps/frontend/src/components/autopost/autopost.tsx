'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { ModalFormActions } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { FormProvider, useForm } from 'react-hook-form';
import { array, boolean, object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Select } from '@gitroom/react/form/select';
import { PickPlatforms } from '@gitroom/frontend/components/launches/helpers/pick.platform.component';
import { sortIntegrationsByProviderImportance } from '@gitroom/frontend/components/launches/helpers/sort.integrations';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import { Slider } from '@gitroom/react/form/slider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SettingsPaneEditor } from '@gitroom/frontend/components/settings/settings-pane-editor';
export const Autopost: FC = () => {
  const fetch = useFetch();
  const t = useT();
  const toaster = useToaster();
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const list = useCallback(async () => {
    return (await fetch('/autopost')).json();
  }, []);
  const { data, mutate } = useSWR('autopost', list);
  const closeEditor = useCallback(() => setEditing(undefined), []);
  const addWebhook = useCallback(
    (row?: any) => () => {
      setEditing(row ?? null);
    },
    []
  );
  const deleteHook = useCallback(
    (data: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete ${data.name}?`,
            { name: data.name }
          )
        )
      ) {
        await fetch(`/autopost/${data.id}`, {
          method: 'DELETE',
        });
        mutate();
        toaster.show(t('webhook_deleted_successfully', 'Webhook deleted successfully'), 'success');
      }
    },
    []
  );
  const changeActive = useCallback(
    (data: any) => async (ac: 'on' | 'off') => {
      await fetch(`/autopost/${data.id}/active`, {
        body: JSON.stringify({
          active: ac === 'on',
        }),
        method: 'POST',
      });
      mutate();
    },
    [mutate]
  );
  if (editing !== undefined) {
    return (
      <SettingsPaneEditor
        title={
          editing
            ? t('edit_autopost', 'Edit Autopost')
            : t('add_autopost_title', 'Add Autopost')
        }
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
                  <path d="M5 19.5h.01M5 12a7.5 7.5 0 0 1 7.5 7.5M5 5a14.5 14.5 0 0 1 14.5 14.5" />
                </svg>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate text-[13.5px] font-[600]">
                  {p.title}
                </div>
                <div className="mt-[2px] truncate font-mono text-[11.5px] text-pqSoft">
                  {p.url}
                </div>
              </div>
              <Slider
                value={p.active ? 'on' : 'off'}
                onChange={changeActive(p)}
                fill={true}
              />
              <button
                type="button"
                onClick={addWebhook(p)}
                aria-label={t('edit', 'Edit')}
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
        onClick={addWebhook()}
        className={clsx(
          'flex h-[34px] items-center gap-[6px] self-start rounded-pqSm bg-pqBrand ps-[11px] pe-[13px] text-[13px] font-[600] text-white transition-colors hover:bg-pqBrandHover',
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
        {t('add_an_autopost', 'Add an autopost')}
      </button>
    </div>
  );
};
const details = object().shape({
  title: string().required(),
  content: string(),
  onSlot: boolean().required(),
  syncLast: boolean().required(),
  url: string().url().required(),
  active: boolean().required(),
  addPicture: boolean().required(),
  generateContent: boolean().required(),
  integrations: array().of(
    object().shape({
      id: string().required(),
    })
  ),
});
const getOptions = (t: (key: string, fallback: string) => string) => [
  {
    label: t('all_integrations', 'All integrations'),
    value: 'all',
  },
  {
    label: t('specific_integrations', 'Specific integrations'),
    value: 'specific',
  },
];
const getOptionsChoose = (t: (key: string, fallback: string) => string) => [
  {
    label: t('yes', 'Yes'),
    value: true,
  },
  {
    label: t('no', 'No'),
    value: false,
  },
];
const getPostImmediately = (t: (key: string, fallback: string) => string) => [
  {
    label: t('post_on_next_available_slot', 'Post on the next available slot'),
    value: true,
  },
  {
    label: t('post_immediately', 'Post Immediately'),
    value: false,
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
  const options = getOptions(t);
  const optionsChoose = getOptionsChoose(t);
  const postImmediately = getPostImmediately(t);
  const [allIntegrations, setAllIntegrations] = useState(
    (JSON.parse(data?.integrations || '[]')?.length || 0) > 0
      ? options[1]
      : options[0]
  );
  const toast = useToaster();
  const [valid, setValid] = useState(data?.url || '');
  const [lastUrl, setLastUrl] = useState(data?.lastUrl || '');
  const form = useForm({
    resolver: yupResolver(details),
    values: {
      title: data?.title || '',
      content: data?.content || '',
      onSlot: data?.onSlot || false,
      syncLast: data?.syncLast || false,
      url: data?.url || '',
      // eslint-disable-next-line no-prototype-builtins
      active: data?.hasOwnProperty?.('active') ? data?.active : true,
      addPicture: data?.addPicture || false,
      // eslint-disable-next-line no-prototype-builtins
      generateContent: data?.hasOwnProperty?.('generateContent')
        ? data?.generateContent
        : true,
      integrations: JSON.parse(data?.integrations || '[]') || [],
    },
  });
  const generateContent = form.watch('generateContent');
  const content = form.watch('content');
  const url = form.watch('url');
  const syncLast = form.watch('syncLast');
  const integrations = form.watch('integrations');
  const integration = useCallback(async () => {
    return (await fetch('/integrations/list')).json();
  }, []);
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
  const { data: dataList, isLoading } = useSWR('integrations', integration, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
  const callBack = useCallback(
    async (values: any) => {
      await fetch(data?.id ? `/autopost/${data?.id}` : '/autopost', {
        method: data?.id ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...(data?.id
            ? {
                id: data.id,
              }
            : {}),
          ...values,
          ...(!syncLast
            ? {
                lastUrl,
              }
            : {
                lastUrl: '',
              }),
        }),
      });
      toast.show(
        data?.id
          ? t('autopost_updated_successfully', 'Autopost updated successfully')
          : t('autopost_added_successfully', 'Autopost added successfully'),
        'success'
      );
      reload();
    },
    [data, integrations, lastUrl, syncLast]
  );
  const sendTest = useCallback(async () => {
    const url = form.getValues('url');
    try {
      const { success, url: newUrl } = await (
        await fetch(`/autopost/send?url=${encodeURIComponent(url)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ).json();
      if (!success) {
        setValid('');
        toast.show(t('could_not_use_rss_feed', 'Could not use this RSS feed'), 'warning');
        return;
      }
      toast.show(t('rss_valid', 'RSS valid!'), 'success');
      setValid(url);
      setLastUrl(newUrl);
    } catch (e: any) {
      /** empty **/
    }
  }, []);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(callBack)}>
        {/* Match Webhooks in-pane form: no outer pqLine box (that token is a
            light hairline on dark and read as unintended white rules). */}
        <div className="relative flex flex-1 flex-col gap-[16px] pt-0">
          <Input
            label="Title"
            translationKey="label_title"
            {...form.register('title')}
          />
          <Input
            label="URL"
            translationKey="label_url"
            {...form.register('url')}
          />
          <Select
            label="Should we sync the current last post?"
            translationKey="label_should_sync_last_post"
            {...form.register('syncLast', {
              setValueAs: (value) => {
                return value === 'true' || value === true;
              },
            })}
          >
            {optionsChoose.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="When should we post it?"
            translationKey="label_when_post"
            {...form.register('onSlot', {
              setValueAs: (value) => value === 'true' || value === true,
            })}
          >
            {postImmediately.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Autogenerate content"
            translationKey="label_autogenerate_content"
            {...form.register('generateContent', {
              setValueAs: (value) => value === 'true' || value === true,
            })}
          >
            {optionsChoose.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
          {!generateContent && (
            <div className="flex flex-col gap-[6px]">
              <div className="text-[14px] text-pqMuted">
                {t('post_content', 'Post content')}
              </div>
              <div className="overflow-hidden rounded-[10px] bg-pqTableHeader shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--brand)]">
                <CopilotTextarea
                  disableBranding={true}
                  className={clsx(
                    '!min-h-40 !max-h-80 !bg-transparent p-[10px_12px] text-[14px] leading-[1.55] text-pqText outline-none overflow-x-hidden scrollbar scrollbar-thumb-pqBorder scrollbar-track-transparent placeholder:text-pqSoft'
                  )}
                  value={content}
                  onChange={(e) => {
                    form.setValue('content', e.target.value);
                  }}
                  placeholder={t(
                    'write_your_post_placeholder',
                    'Write your post...'
                  )}
                  autosuggestionsConfig={{
                    textareaPurpose: `Assist me in writing social media post`,
                    chatApiConfigs: {},
                  }}
                />
              </div>
            </div>
          )}
          <Select
            label="Generate Picture?"
            translationKey="label_generate_picture"
            {...form.register('addPicture', {
              setValueAs: (value) => value === 'true' || value === true,
            })}
          >
            {optionsChoose.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={allIntegrations.value}
            name="integrations"
            label="Integrations"
            translationKey="label_integrations"
            disableForm={true}
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
                integrations={sortIntegrationsByProviderImportance(
                  dataList.integrations || []
                )}
                selectedIntegrations={integrations as any[]}
                onChange={(e) => form.setValue('integrations', e)}
                singleSelect={false}
                toolTip={true}
                isMain={true}
              />
            )}
          <ModalFormActions onCancel={() => onCancel?.()}>
            {valid === url && (syncLast || !!lastUrl) && (
              <Button
                type="submit"
                className="h-[42px] flex-1 rounded-[10px] text-[14px] font-[600]"
                disabled={
                  valid !== url ||
                  !form.formState.isValid ||
                  (allIntegrations.value === 'specific' &&
                    !integrations?.length)
                }
              >
                {t('save', 'Save')}
              </Button>
            )}
            <Button
              type="button"
              secondary={true}
              className="h-[44px] rounded-[8px] px-[18px] text-[14px] font-[600]"
              onClick={sendTest}
              disabled={
                !form.formState.isValid ||
                (allIntegrations.value === 'specific' &&
                  !integrations?.length)
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
