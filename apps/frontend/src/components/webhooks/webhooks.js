'use client';
import { __awaiter } from "tslib";
import React, { Fragment, useCallback, useState } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { useUser } from "../layout/user.context";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { useModals } from "../layout/new-modal";
import { Input } from "../../../../../libraries/react-shared-libraries/src/form/input";
import { FormProvider, useForm } from 'react-hook-form';
import { array, object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Select } from "../../../../../libraries/react-shared-libraries/src/form/select";
import { PickPlatforms } from "../launches/helpers/pick.platform.component";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import clsx from 'clsx';
import { deleteDialog } from "../../../../../libraries/react-shared-libraries/src/helpers/delete.dialog";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const Webhooks = () => {
    var _a;
    const fetch = useFetch();
    const user = useUser();
    const modal = useModals();
    const toaster = useToaster();
    const t = useT();
    const list = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch('/webhooks')).json();
    }), []);
    const { data, mutate } = useSWR('webhooks', list);
    const addWebhook = useCallback((data) => () => {
        modal.openModal({
            title: data ? t('update_webhook', 'Update webhook') : t('add_webhook', 'Add webhook'),
            withCloseButton: true,
            children: <AddOrEditWebhook data={data} reload={mutate}/>,
        });
    }, [t]);
    const deleteHook = useCallback((data) => () => __awaiter(void 0, void 0, void 0, function* () {
        if (yield deleteDialog(t('are_you_sure_you_want_to_delete', `Are you sure you want to delete ${data.name}?`, { name: data.name }))) {
            yield fetch(`/webhooks/${data.id}`, {
                method: 'DELETE',
            });
            mutate();
            toaster.show(t('webhook_deleted_successfully', 'Webhook deleted successfully'), 'success');
        }
    }), []);
    return (<div className="flex flex-col">
      <h3 className="text-[20px]">
        {t('webhooks', 'Webhooks')} ({(data === null || data === void 0 ? void 0 : data.length) || 0}/{(_a = user === null || user === void 0 ? void 0 : user.tier) === null || _a === void 0 ? void 0 : _a.webhooks})
      </h3>
      <div className="text-customColor18 mt-[4px]">
        {t('webhooks_are_a_way_to_get_notified_when_something_happens_in_postiz_via_an_http_request', 'Webhooks are a way to get notified when something happens in Postiz via\n        an HTTP request.')}
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth items-center border rounded-[4px] p-[24px] flex gap-[24px]">
        <div className="flex flex-col w-full">
          {!!(data === null || data === void 0 ? void 0 : data.length) && (<div className="grid grid-cols-[1fr,1fr,1fr,1fr] w-full gap-y-[10px]">
              <div>{t('name', 'Name')}</div>
              <div>{t('url', 'URL')}</div>
              <div>{t('edit', 'Edit')}</div>
              <div>{t('delete', 'Delete')}</div>
              {data === null || data === void 0 ? void 0 : data.map((p) => (<Fragment key={p.id}>
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
                </Fragment>))}
            </div>)}
          <div>
            <Button onClick={addWebhook()} className={clsx(((data === null || data === void 0 ? void 0 : data.length) || 0) > 0 && 'my-[16px]')}>
              {t('add_a_webhook', 'Add a webhook')}
            </Button>
          </div>
        </div>
      </div>
    </div>);
};
const details = object().shape({
    name: string().required(),
    url: string().url().required(),
    integrations: array(),
});
const getWebhookOptions = (t) => [
    {
        label: t('all_integrations', 'All integrations'),
        value: 'all',
    },
    {
        label: t('specific_integrations', 'Specific integrations'),
        value: 'specific',
    },
];
export const AddOrEditWebhook = (props) => {
    var _a, _b;
    const { data, reload } = props;
    const fetch = useFetch();
    const t = useT();
    const options = getWebhookOptions(t);
    const [allIntegrations, setAllIntegrations] = useState((((_a = data === null || data === void 0 ? void 0 : data.integrations) === null || _a === void 0 ? void 0 : _a.length) || 0) > 0 ? options[1] : options[0]);
    const modal = useModals();
    const toast = useToaster();
    const form = useForm({
        resolver: yupResolver(details),
        values: {
            name: (data === null || data === void 0 ? void 0 : data.name) || '',
            url: (data === null || data === void 0 ? void 0 : data.url) || '',
            integrations: ((_b = data === null || data === void 0 ? void 0 : data.integrations) === null || _b === void 0 ? void 0 : _b.map((p) => p.integration)) || [],
        },
    });
    const integrations = form.watch('integrations');
    const integration = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch('/integrations/list')).json();
    }), []);
    const changeIntegration = useCallback((e) => {
        const findValue = options.find((option) => option.value === e.target.value);
        setAllIntegrations(findValue);
        if (findValue.value === 'all') {
            form.setValue('integrations', []);
        }
    }, []);
    const { data: dataList, isLoading } = useSWR('integrations', integration, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
    });
    const callBack = useCallback((values) => __awaiter(void 0, void 0, void 0, function* () {
        yield fetch('/webhooks', {
            method: (data === null || data === void 0 ? void 0 : data.id) ? 'PUT' : 'POST',
            body: JSON.stringify(Object.assign(Object.assign({}, ((data === null || data === void 0 ? void 0 : data.id)
                ? {
                    id: data.id,
                }
                : {})), values)),
        });
        toast.show((data === null || data === void 0 ? void 0 : data.id)
            ? t('webhook_updated_successfully', 'Webhook updated successfully')
            : t('webhook_added_successfully', 'Webhook added successfully'), 'success');
        modal.closeAll();
        reload();
    }), [data, integrations]);
    const sendTest = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const url = form.getValues('url');
        toast.show(t('webhook_sent', 'Webhook send'), 'success');
        try {
            yield fetch(`/webhooks/send?url=${encodeURIComponent(url)}`, {
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
        }
        catch (e) {
            /** empty **/
        }
    }), []);
    return (<FormProvider {...form}>
      <form onSubmit={form.handleSubmit(callBack)}>
        <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px] pt-0">
          <div>
            <Input label="Name" translationKey="label_name" {...form.register('name')}/>
            <Input label="URL" translationKey="label_url" {...form.register('url')}/>
            <Select value={allIntegrations.value} name="integrations" label="Integrations" translationKey="label_integrations" disableForm={true} onChange={changeIntegration}>
              {options.map((option) => (<option key={option.value} value={option.value}>
                  {option.label}
                </option>))}
            </Select>
            {allIntegrations.value === 'specific' && dataList && !isLoading && (<PickPlatforms integrations={dataList.integrations} selectedIntegrations={integrations} onChange={(e) => form.setValue('integrations', e)} singleSelect={false} toolTip={true} isMain={true}/>)}
            <div className="flex gap-[10px]">
              <Button type="submit" className="mt-[24px]" disabled={!form.formState.isValid ||
            (allIntegrations.value === 'specific' &&
                !(integrations === null || integrations === void 0 ? void 0 : integrations.length))}>
                {t('save', 'Save')}
              </Button>
              <Button type="button" secondary={true} className="mt-[24px]" onClick={sendTest} disabled={!form.formState.isValid ||
            (allIntegrations.value === 'specific' &&
                !(integrations === null || integrations === void 0 ? void 0 : integrations.length))}>
                {t('send_test', 'Send Test')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>);
};
//# sourceMappingURL=webhooks.js.map