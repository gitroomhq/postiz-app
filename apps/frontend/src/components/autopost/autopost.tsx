'use client';

import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { ModalFormActions } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { FormProvider, useForm } from 'react-hook-form';
import { array, boolean, object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Select } from '@gitroom/react/form/select';
import { FormChoice } from '@gitroom/react/form/form.choice';
import { PickPlatforms } from '@gitroom/frontend/components/launches/helpers/pick.platform.component';
import { sortIntegrationsByProviderImportance } from '@gitroom/frontend/components/launches/helpers/sort.integrations';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import { Slider } from '@gitroom/react/form/slider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SettingsPaneEditor } from '@gitroom/frontend/components/settings/settings-pane-editor';
import { useVariables } from '@gitroom/react/helpers/variable.context';
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
      const label = data.title || data.name || '';
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete ${label}?`,
            { name: label }
          )
        )
      ) {
        await fetch(`/autopost/${data.id}`, {
          method: 'DELETE',
        });
        mutate();
        toaster.show(
          t('autopost_deleted_successfully', 'Autopost deleted successfully'),
          'success'
        );
      }
    },
    [fetch, mutate, toaster, t]
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
        description={t(
          'autopost_editor_description',
          'Watch an RSS or Atom feed and turn new items into scheduled posts.'
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
        onClick={addWebhook()}
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
  const { aiEnabled } = useVariables();
  const options = getOptions(t);
  const optionsChoose = getOptionsChoose(t);
  const postImmediately = getPostImmediately(t);
  const [step, setStep] = useState(0);
  const [allIntegrations, setAllIntegrations] = useState(
    (JSON.parse(data?.integrations || '[]')?.length || 0) > 0
      ? options[1]
      : options[0]
  );
  const toast = useToaster();
  const isEdit = !!data?.id;
  // Create: valid stays empty until Send Test. Edit: trust the saved URL until
  // the user changes it (otherwise Next stays locked forever when lastUrl is
  // empty and syncLast is off).
  const [valid, setValid] = useState('');
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
  const title = form.watch('title');
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
    const feedUrl = form.getValues('url');
    try {
      const { success, url: newUrl } = await (
        await fetch(`/autopost/send?url=${encodeURIComponent(feedUrl)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ).json();
      if (!success) {
        setValid('');
        toast.show(
          t('could_not_use_rss_feed', 'Could not use this RSS feed'),
          'warning'
        );
        return;
      }
      toast.show(t('rss_valid', 'RSS valid!'), 'success');
      setValid(feedUrl);
      setLastUrl(newUrl);
    } catch (e: any) {
      /** empty **/
    }
  }, []);

  const urlUnchanged = isEdit && !!url && url === (data?.url || '');
  const feedReady =
    !!url &&
    (urlUnchanged || (valid === url && (syncLast || !!lastUrl)));
  const channelsOk =
    allIntegrations.value !== 'specific' || !!integrations?.length;
  const canSave = feedReady && form.formState.isValid && channelsOk;

  const steps = [
    {
      key: 'feed',
      label: t('autopost_step_feed', 'Feed'),
    },
    {
      key: 'timing',
      label: t('autopost_step_timing', 'Timing'),
    },
    {
      key: 'content',
      label: t('autopost_step_content', 'Content'),
    },
    {
      key: 'channels',
      label: t('autopost_step_channels', 'Channels'),
    },
  ] as const;

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }, [steps.length]);
  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(callBack)}>
        <div className="relative flex flex-1 flex-col gap-[16px] pt-0">
          {/* Step chrome — numbered pills (owner stepped LOOK). */}
          <div
            data-autopost-steps="1"
            className="flex flex-wrap items-center gap-[8px]"
          >
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-[8px]">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="h-px w-[10px] bg-pqLine mobile:hidden"
                  />
                )}
                <span
                  role={i === 0 || feedReady ? 'button' : undefined}
                  tabIndex={i === 0 || feedReady ? 0 : undefined}
                  onClick={() => {
                    if (i === 0 || feedReady) setStep(i);
                  }}
                  onKeyDown={(e) => {
                    if (
                      (i === 0 || feedReady) &&
                      (e.key === 'Enter' || e.key === ' ')
                    ) {
                      e.preventDefault();
                      setStep(i);
                    }
                  }}
                  className={clsx(
                    'flex h-[26px] items-center gap-[7px] rounded-full pe-[10px] ps-[4px] text-[12px] font-[600]',
                    i === step
                      ? 'bg-pqBrand text-pqOnBrand'
                      : i < step
                        ? 'bg-pqBrandSoft text-pqText'
                        : 'bg-pqSettings text-pqMuted',
                    (i === 0 || feedReady) && 'cursor-pointer'
                  )}
                >
                  <span
                    className={clsx(
                      'grid size-[18px] place-items-center rounded-full text-[11px] font-[700]',
                      i === step
                        ? 'bg-pqOnBrand text-pqBrand'
                        : i < step
                          ? 'bg-pqBrand text-pqOnBrand'
                          : 'bg-pqInner text-pqMuted'
                    )}
                  >
                    {i + 1}
                  </span>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="flex flex-col gap-[12px]">
              <Input
                label="Title"
                translationKey="label_title"
                removeError={true}
                {...form.register('title')}
              />
              <Input
                label="URL"
                translationKey="label_url"
                removeError={true}
                {...form.register('url')}
              />
              <p className="text-[13px] leading-[1.45] text-pqMuted">
                {urlUnchanged
                  ? t(
                      'autopost_feed_tip_edit',
                      'This feed is already saved. Change the URL and Send Test again, or continue with Next.'
                    )
                  : t(
                      'autopost_feed_tip',
                      'Send Test checks the feed once. Next unlocks after a successful check.'
                    )}
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-[12px]">
              <FormChoice
                name="syncLast"
                label="Should we sync the current last post?"
                translationKey="label_should_sync_last_post"
                options={optionsChoose}
              />
              <FormChoice
                name="onSlot"
                label="When should we post it?"
                translationKey="label_when_post"
                options={postImmediately}
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-[12px]">
              <FormChoice
                name="generateContent"
                label="Autogenerate content"
                translationKey="label_autogenerate_content"
                options={optionsChoose}
              />
              {!generateContent && (
                <div className="flex flex-col gap-[5px]">
                  <div className="text-[13px] font-[500] text-pqMuted">
                    {t('post_content', 'Post content')}
                  </div>
                  <div className="overflow-hidden rounded-[10px] bg-pqTableHeader shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--brand)]">
                    {aiEnabled ? (
                      <CopilotTextarea
                        disableBranding={true}
                        className={clsx(
                          '!min-h-28 !max-h-56 !bg-transparent p-[10px_12px] text-[14px] leading-[1.55] text-pqText outline-none overflow-x-hidden scrollbar scrollbar-thumb-pqBorder scrollbar-track-transparent placeholder:text-pqSoft'
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
                    ) : (
                      <textarea
                        className={clsx(
                          '!min-h-28 !max-h-56 !bg-transparent p-[10px_12px] text-[14px] leading-[1.55] text-pqText outline-none overflow-x-hidden scrollbar scrollbar-thumb-pqBorder scrollbar-track-transparent placeholder:text-pqSoft w-full resize-none border-0'
                        )}
                        value={content}
                        onChange={(e) => {
                          form.setValue('content', e.target.value);
                        }}
                        placeholder={t(
                          'write_your_post_placeholder',
                          'Write your post...'
                        )}
                      />
                    )}
                  </div>
                </div>
              )}
              <FormChoice
                name="addPicture"
                label="Generate Picture?"
                translationKey="label_generate_picture"
                options={optionsChoose}
              />
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-[12px]">
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
              {allIntegrations.value === 'specific' &&
                dataList &&
                !isLoading && (
                  <PickPlatforms
                    integrations={sortIntegrationsByProviderImportance(
                      dataList
                    )}
                    selectedIntegrations={integrations as any[]}
                    onChange={(e) => form.setValue('integrations', e)}
                    singleSelect={false}
                    toolTip={true}
                    isMain={true}
                  />
                )}
            </div>
          )}

          <ModalFormActions onCancel={() => onCancel?.()}>
            {step > 0 && (
              <Button
                type="button"
                secondary={true}
                className="h-[40px] shrink-0 rounded-[10px] px-[16px] text-[13.5px] font-[600]"
                onClick={goBack}
              >
                {t('back', 'Back')}
              </Button>
            )}
            {step === 0 && (
              <Button
                type="button"
                secondary={true}
                className="h-[40px] shrink-0 rounded-[10px] px-[16px] text-[13.5px] font-[600]"
                onClick={sendTest}
                disabled={!url || !title}
              >
                {t('send_test', 'Send Test')}
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                type="button"
                className="h-[40px] shrink-0 rounded-[10px] px-[18px] text-[13.5px] font-[600]"
                onClick={goNext}
                disabled={step === 0 && !feedReady}
              >
                {t('next', 'Next')}
              </Button>
            ) : (
              <Button
                type="submit"
                className="h-[40px] shrink-0 rounded-[10px] px-[18px] text-[13.5px] font-[600]"
                disabled={!canSave}
              >
                {t('save', 'Save')}
              </Button>
            )}
          </ModalFormActions>
        </div>
      </form>
    </FormProvider>
  );
};
