import React, { FC, Fragment, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Input } from '@gitroom/react/form/input';
import { FormProvider, useForm } from 'react-hook-form';
import { array, object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Select } from '@gitroom/react/form/select';
import { PickPlatforms } from '@gitroom/frontend/components/launches/helpers/pick.platform.component';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const Webhooks: FC = () => {
  const fetch = useFetch();
  const user = useUser();
  const modal = useModals();
  const toaster = useToaster();
  const list = useCallback(async () => {
    return (await fetch('/webhooks')).json();
  }, []);
  const { data, mutate } = useSWR('webhooks', list);
  const addWebhook = useCallback(
    (data?: any) => () => {
      modal.openModal({
        title: data ? 'Update webhook' : 'Add webhook',
        withCloseButton: true,
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
        await fetch(`/webhooks/${data.id}`, {
          method: 'DELETE',
        });
        mutate();
        toaster.show('Webhook deleted successfully', 'success');
      }
    },
    []
  );

  const t = useT();

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">
        {t('webhooks', 'Webhooks')} ({data?.length || 0}/{user?.tier?.webhooks})
      </h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'webhooks_are_a_way_to_get_notified_when_something_happens_in_postiz_via_an_http_request',
          'Webhooks are a way to get notified when something happens in Postiz via\n        an HTTP request.'
        )}
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth items-center border rounded-[4px] p-[24px] flex gap-[24px]">
        <div className="flex flex-col w-full">
          {!!data?.length && (
            <div className="grid grid-cols-[1fr,1fr,1fr,1fr] w-full gap-y-[10px]">
              <div>{t('name', 'Name')}</div>
              <div>{t('url', 'URL')}</div>
              <div>{t('edit', 'Edit')}</div>
              <div>{t('delete', 'Delete')}</div>
              {data?.map((p: any) => (
                <Fragment key={p.id}>
                  <div className="flex flex-col justify-center">{p.name}</div>
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
                </Fragment>
              ))}
            </div>
          )}
          <div>
            <Button
              onClick={addWebhook()}
              className={clsx((data?.length || 0) > 0 && 'my-[16px]')}
            >
              {t('add_a_webhook', 'Add a webhook')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
const details = object().shape({
  name: string().required(),
  url: string().url().required(),
  integrations: array(),
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
export const AddOrEditWebhook: FC<{
  data?: any;
  reload: () => void;
}> = (props) => {
  const { data, reload } = props;
  const fetch = useFetch();
  const [allIntegrations, setAllIntegrations] = useState(
    (data?.integrations?.length || 0) > 0 ? options[1] : options[0]
  );
  const modal = useModals();
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
          ? 'Webhook updated successfully'
          : 'Webhook added successfully',
        'success'
      );
      modal.closeAll();
      reload();
    },
    [data, integrations]
  );
  const sendTest = useCallback(async () => {
    const url = form.getValues('url');
    toast.show('Webhook send', 'success');
    try {
      await fetch(`/webhooks/send?url=${encodeURIComponent(url)}`, {
        method: 'POST',
        headers: {
          contentType: 'application/json',
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
              picture: 'https://uploads.gitroom.com/F6LSCD8wrrQ.jpeg',
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
              picture: 'https://uploads.gitroom.com/F6LSCD8wrrQ.jpeg',
              type: 'social',
            },
          },
        ]),
      });
    } catch (e: any) {
      /** empty **/
    }
  }, []);

  const t = useT();

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(callBack)}>
        <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px] pt-0">
          <div>
            <Input
              label="Name"
              translationKey="label_name"
              {...form.register('name')}
            />
            <Input
              label="URL"
              translationKey="label_url"
              {...form.register('url')}
            />
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
              <Button
                type="submit"
                className="mt-[24px]"
                disabled={
                  !form.formState.isValid ||
                  (allIntegrations.value === 'specific' &&
                    !integrations?.length)
                }
              >
                {t('save', 'Save')}
              </Button>
              <Button
                type="button"
                secondary={true}
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
