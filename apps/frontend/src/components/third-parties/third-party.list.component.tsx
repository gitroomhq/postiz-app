'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import React, { FC, useCallback, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';
import { ModalFormActions } from '@gitroom/frontend/components/layout/new-modal';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Input } from '@gitroom/react/form/input';
import { useToaster } from '@gitroom/react/toaster/toaster';

export const ApiModal: FC<{
  identifier: string;
  title: string;
  update: () => void;
  onCancel?: () => void;
}> = (props) => {
  const { identifier, title, update, onCancel } = props;
  const fetch = useFetch();
  const router = useRouter();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const t = useT();

  const methods = useForm({
    mode: 'onChange',
  });

  const submit = useCallback(
    async (data: FieldValues) => {
      setLoading(true);
      const add = await fetch(`/third-party/${identifier}`, {
        method: 'POST',
        body: JSON.stringify({
          api: data.api,
        }),
      });

      if (add.ok) {
        toaster.show(
          t('integration_added_successfully', 'Integration added successfully'),
          'success'
        );
        onCancel?.();
        router.refresh();
        if (update) update();
        return;
      }

      const { message } = await add.json();

      methods.setError('api', {
        message,
      });

      setLoading(false);
    },
    [identifier, update, fetch, toaster, onCancel, router, methods, t]
  );

  return (
    <FormProvider {...methods}>
      <form
        className="flex flex-col gap-[16px]"
        onSubmit={methods.handleSubmit(submit)}
      >
        <Input
          label={t('api_key', 'API Key')}
          name="api"
          placeholder={t(
            'paste_your_api_key',
            'Paste your {{name}} API key',
            { name: title }
          )}
        />
        <p className="-mt-[4px] text-[12.5px] leading-[1.45] text-pqMuted">
          {t(
            'add_integration_api_hint',
            'Keys stay on your workspace and are only used to call {{name}}.',
            { name: title }
          )}
        </p>
        <ModalFormActions onCancel={() => onCancel?.()}>
          <Button
            loading={loading}
            type="submit"
            className="h-[40px] shrink-0 rounded-[10px] px-[18px] text-[13.5px] font-[600]"
          >
            {t('add_integration', 'Add integration')}
          </Button>
        </ModalFormActions>
      </form>
    </FormProvider>
  );
};
