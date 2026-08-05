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
  const { identifier, update, onCancel } = props;
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
        toaster.show('Integration added successfully', 'success');
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
    [identifier, update, fetch, toaster, onCancel, router, methods]
  );

  return (
    <FormProvider {...methods}>
      <form
        className="flex flex-col gap-[16px]"
        onSubmit={methods.handleSubmit(submit)}
      >
        <Input label={t('api_key', 'API Key')} name="api" />
        <ModalFormActions onCancel={() => onCancel?.()}>
          <Button
            loading={loading}
            type="submit"
            className="h-[42px] flex-1 rounded-[10px] text-[14px] font-[600]"
          >
            {t('add_integration', 'Add Integration')}
          </Button>
        </ModalFormActions>
      </form>
    </FormProvider>
  );
};
