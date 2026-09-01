'use client';

import React, { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import clsx from 'clsx';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { EditIcon, TrashIcon } from '@gitroom/frontend/components/ui/icons';
import { boolean, object, string } from 'yup';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import { Select } from '@gitroom/react/form/select';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
export const SignaturesComponent: FC<{
  appendSignature?: (value: string) => void;
}> = (props) => {
  const { appendSignature } = props;
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const load = useCallback(async () => {
    return (await fetch('/signatures')).json();
  }, []);
  const { data, mutate } = useSWR('signatures', load);
  const addSignature = useCallback(
    (data?: any) => () => {
      modal.openModal({
        title: data ? t('edit_signature', 'Edit Signature') : t('add_signature', 'Add Signature'),
        withCloseButton: true,
        children: <AddOrRemoveSignature data={data} reload={mutate} />,
      });
    },
    [mutate]
  );

  const deleteSignature = useCallback(
    (data: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete?`,
            { name: data.content.slice(0, 15) + '...' }
          )
        )
      ) {
        await fetch(`/signatures/${data.id}`, {
          method: 'DELETE',
        });
        mutate();
        toaster.show(t('signature_deleted_successfully', 'Signature deleted successfully'), 'success');
      }
    },
    []
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('signatures', 'Signatures')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'you_can_add_signatures_to_your_account_to_be_used_in_your_posts',
          'You can add signatures to your account to be used in your posts.'
        )}
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth items-center border rounded-[4px] p-[24px] flex gap-[24px]">
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between mb-[16px]">
            <div className="mt-[4px]">{t('signatures', 'Signatures')}</div>
            <Button onClick={addSignature()}>
              {t('add_a_signature', 'Add a signature')}
            </Button>
          </div>
          {!data?.length ? (
            <div className="text-customColor18 text-center py-[24px]">
              {t('no_signatures_yet', 'No signatures yet.')}
            </div>
          ) : (
            <div className="flex flex-col">
              {data?.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center gap-[16px] py-[12px] border-b border-newTableBorder last:border-b-0"
                >
                  <div className="flex-1 truncate">
                    {p.content.slice(0, 60) +
                      (p.content.length > 60 ? '...' : '')}
                  </div>
                  <div className="w-[150px] shrink-0 whitespace-nowrap text-customColor18 text-[13px]">
                    {t('auto_add', 'Auto Add?')}:{' '}
                    {p.autoAdd ? t('yes', 'Yes') : t('no', 'No')}
                  </div>
                  {!!appendSignature && (
                    <Button
                      secondary={true}
                      onClick={() => appendSignature(p.content)}
                    >
                      {t('use_signature', 'Use Signature')}
                    </Button>
                  )}
                  <div className="flex gap-[12px] justify-end w-[64px]">
                    <div
                      className="cursor-pointer text-customColor18 hover:text-newTextColor"
                      onClick={addSignature(p)}
                    >
                      <EditIcon size={16} />
                    </div>
                    <div
                      className="cursor-pointer text-red-400 hover:text-red-500"
                      onClick={deleteSignature(p)}
                    >
                      <TrashIcon size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
const details = object().shape({
  content: string().required(),
  autoAdd: boolean().required(),
});
const AddOrRemoveSignature: FC<{
  data?: any;
  reload: () => void;
}> = (props) => {
  const { data, reload } = props;
  const t = useT();
  const toast = useToaster();
  const fetch = useFetch();
  const form = useForm({
    resolver: yupResolver(details),
    values: {
      content: data?.content || '',
      autoAdd: data?.autoAdd || false,
    },
  });
  const text = form.watch('content');
  const autoAdd = form.watch('autoAdd');
  const modal = useModals();
  const callBack = useCallback(
    async (values: any) => {
      await fetch(data?.id ? `/signatures/${data.id}` : '/signatures', {
        method: data?.id ? 'PUT' : 'POST',
        body: JSON.stringify(values),
      });
      toast.show(
        data?.id
          ? t('signature_updated_successfully', 'Signature updated successfully')
          : t('signature_added_successfully', 'Signature added successfully'),
        'success'
      );
      modal.closeCurrent();
      reload();
    },
    [data, modal]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(callBack)}>
        <div className="relative flex gap-[10px] flex-col flex-1 p-[16px] pt-0">
          <div className="relative bg-customColor2">
            <CopilotTextarea
              disableBranding={true}
              className={clsx(
                '!min-h-40 !max-h-80 p-2 overflow-x-hidden scrollbar scrollbar-thumb-[#612AD5] bg-bigStrip outline-none'
              )}
              value={text}
              onChange={(e) => {
                form.setValue('content', e.target.value);
              }}
              placeholder={t('write_your_signature', 'Write your signature...')}
              autosuggestionsConfig={{
                textareaPurpose: `Assist me in writing social media signature`,
                chatApiConfigs: {},
              }}
            />
          </div>

          <Select
            label="Auto add signature?"
            translationKey="label_auto_add_signature"
            {...form.register('autoAdd', {
              setValueAs: (value) => value === 'true',
            })}
          >
            <option value="false">
              {t('no', 'No')}
            </option>
            <option value="true">
              {t('yes', 'Yes')}
            </option>
          </Select>

          <Button type="submit" className="mt-[18px]">{t('save', 'Save')}</Button>
        </div>
      </form>
    </FormProvider>
  );
};
