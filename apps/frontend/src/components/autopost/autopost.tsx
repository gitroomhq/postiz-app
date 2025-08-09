import React, { FC, Fragment, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { useModals } from '@mantine/modals';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Input } from '@gitroom/react/form/input';
import { FormProvider, useForm } from 'react-hook-form';
import { array, boolean, object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Select } from '@gitroom/react/form/select';
import { PickPlatforms } from '@gitroom/frontend/components/launches/helpers/pick.platform.component';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import { Slider } from '@gitroom/react/form/slider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const Autopost: FC = () => {
  const fetch = useFetch();
  const t = useT();
  const modal = useModals();
  const toaster = useToaster();
  const list = useCallback(async () => {
    return (await fetch('/autopost')).json();
  }, []);
  const { data, mutate } = useSWR('autopost', list);
  const addWebhook = useCallback(
    (data?: any) => () => {
      modal.openModal({
        title: '',
        withCloseButton: false,
        classNames: {
          modal: 'bg-transparent text-textColor',
        },
        children: <AddOrEditWebhook data={data} reload={mutate} />,
      });
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
        toaster.show('Webhook deleted successfully', 'success');
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
  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('autopost', 'Autopost')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'autopost_can_automatically_posts_your_rss_new_items_to_social_media',
          'Autopost can automatically posts your RSS new items to social media'
        )}
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth items-center border rounded-[4px] p-[24px] flex gap-[24px]">
        <div className="flex flex-col w-full">
          {!!data?.length && (
            <div className="grid grid-cols-[1fr,1fr,1fr,1fr,1fr] w-full gap-y-[10px]">
              <div>{t('title', 'Title')}</div>
              <div>{t('url', 'URL')}</div>
              <div>{t('edit', 'Edit')}</div>
              <div>{t('delete', 'Delete')}</div>
              <div>{t('active', 'Active')}</div>
              {data?.map((p: any) => (
                <Fragment key={p.id}>
                  <div className="flex flex-col justify-center">{p.title}</div>
                  <div className="flex flex-col justify-center">{p.url}</div>
                  <div className="flex flex-col justify-center">
                    <div>
                      <Button onClick={addWebhook(p)}>
                        {t('edit', 'Edit')}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div>
                      <Button onClick={deleteHook(p)}>
                        {t('delete', 'Delete')}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Slider
                      value={p.active ? 'on' : 'off'}
                      onChange={changeActive(p)}
                      fill={true}
                    />
                  </div>
                </Fragment>
              ))}
            </div>
          )}
          <div>
            <Button
              onClick={addWebhook()}
              className={clsx((data?.length || 0) > 0 && 'my-[16px]')}
            >
              {t('add_an_autopost', 'Add an autopost')}
            </Button>
          </div>
        </div>
      </div>
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
const options = [
  {
    label: 'All integrations',
    value: 'all',
  },
  {
    label: 'Specific integrations',
    value: 'specific',
  },
];
const optionsChoose = [
  {
    label: 'Yes',
    value: true,
  },
  {
    label: 'No',
    value: false,
  },
];
const postImmediately = [
  {
    label: 'Post on the next available slot',
    value: true,
  },
  {
    label: 'Post Immediately',
    value: false,
  },
];
export const AddOrEditWebhook: FC<{
  data?: any;
  reload: () => void;
}> = (props) => {
  const { data, reload } = props;
  const fetch = useFetch();
  const [allIntegrations, setAllIntegrations] = useState(
    (JSON.parse(data?.integrations || '[]')?.length || 0) > 0
      ? options[1]
      : options[0]
  );
  const modal = useModals();
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
          ? 'Autopost updated successfully'
          : 'Autopost added successfully',
        'success'
      );
      modal.closeAll();
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
            contentType: 'application/json',
          },
        })
      ).json();
      if (!success) {
        setValid('');
        toast.show('Could not use this RSS feed', 'warning');
        return;
      }
      toast.show('RSS valid!', 'success');
      setValid(url);
      setLastUrl(newUrl);
    } catch (e: any) {
      /** empty **/
    }
  }, []);

  const t = useT();

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(callBack)}>
        <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] pt-0 w-[500px]">
          <TopTitle title={data ? 'Edit autopost' : 'Add autopost'} />
          <button
            className="outline-none absolute end-[20px] top-[15px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
            type="button"
            onClick={modal.closeAll}
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

          <div>
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
              <>
                <div className={`text-[14px] mb-[6px]`}>
                  {t('post_content', 'Post content')}
                </div>
                <CopilotTextarea
                  disableBranding={true}
                  className={clsx(
                    '!min-h-40 !max-h-80 p-2 overflow-x-hidden scrollbar scrollbar-thumb-[#612AD5] bg-customColor2 outline-none mb-[16px] border-fifth border rounded-[4px]'
                  )}
                  value={content}
                  onChange={(e) => {
                    form.setValue('content', e.target.value);
                  }}
                  placeholder="Write your post..."
                  autosuggestionsConfig={{
                    textareaPurpose: `Assist me in writing social media post`,
                    chatApiConfigs: {},
                  }}
                />
              </>
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
                integrations={dataList.integrations}
                selectedIntegrations={integrations as any[]}
                onChange={(e) => form.setValue('integrations', e)}
                singleSelect={false}
                toolTip={true}
                isMain={true}
              />
            )}
            <div className="flex gap-[10px]">
              {valid === url && (syncLast || !!lastUrl) && (
                <Button
                  type="submit"
                  className="mt-[24px]"
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
                className="mt-[24px]"
                onClick={sendTest}
                disabled={
                  !form.formState.isValid ||
                  (allIntegrations.value === 'specific' &&
                    !integrations?.length)
                }
              >
                {t('send_test', 'Send Test')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
