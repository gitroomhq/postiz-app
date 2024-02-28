'use client';

import { useModals } from '@mantine/modals';
import { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Input } from '@gitroom/react/form/input';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ApiKeyDto } from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';
import { useRouter } from 'next/navigation';

const resolver = classValidatorResolver(ApiKeyDto);

export const useAddProvider = () => {
  const modal = useModals();
  const fetch = useFetch();
  return useCallback(async () => {
    const data = await (await fetch('/integrations')).json();
    modal.openModal({
      title: 'Add Channel',
      children: <AddProviderComponent {...data} />,
    });
  }, []);
};

export const AddProviderButton = () => {
  const add = useAddProvider();
  return (
    <button
      className="text-white p-[8px] rounded-md bg-forth"
      onClick={add}
    >
      Add Channel
    </button>
  );
};

export const ApiModal: FC<{ identifier: string; name: string }> = (props) => {
  const fetch = useFetch();
  const router = useRouter();
  const modal = useModals();
  const methods = useForm({
    mode: 'onChange',
    resolver,
  });

  const submit = useCallback(async (data: FieldValues) => {
    const add = await fetch(
      `/integrations/article/${props.identifier}/connect`,
      {
        method: 'POST',
        body: JSON.stringify({ api: data.api }),
      }
    );

    if (add.ok) {
      modal.closeAll();
      router.refresh();
      return;
    }

    methods.setError('api', {
      message: 'Invalid API key',
    });
  }, []);

  return (
    <FormProvider {...methods}>
      <form
        className="gap-[8px] flex flex-col"
        onSubmit={methods.handleSubmit(submit)}
      >
        <div>
          <Input label="API Key" name="api" />
        </div>
        <div>
          <Button type="submit">Add platform</Button>
        </div>
      </form>
    </FormProvider>
  );
};
export const AddProviderComponent: FC<{
  social: Array<{ identifier: string; name: string }>;
  article: Array<{ identifier: string; name: string }>;
}> = (props) => {
  const fetch = useFetch();
  const modal = useModals();
  const { social, article } = props;
  const getSocialLink = useCallback(
    (identifier: string) => async () => {
      const { url } = await (
        await fetch('/integrations/social/' + identifier)
      ).json();
      window.location.href = url;
    },
    []
  );

  const showApiButton = useCallback(
    (identifier: string, name: string) => async () => {
      modal.openModal({
        title: `Add ${name}`,
        children: <ApiModal name={name} identifier={identifier} />,
      });
    },
    []
  );
  return (
    <div className="w-full flex flex-col gap-[20px]">
      <div className="flex flex-col">
        <h2>Social</h2>
        <div className="flex flex-wrap gap-[10px]">
          {social.map((item) => (
            <div
              key={item.identifier}
              onClick={getSocialLink(item.identifier)}
              className="w-[100px] h-[100px] bg-forth text-white justify-center items-center flex"
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        <h2>Articles</h2>
        <div className="flex flex-wrap gap-[10px]">
          {article.map((item) => (
            <div
              key={item.identifier}
              onClick={showApiButton(item.identifier, item.name)}
              className="w-[100px] h-[100px] bg-forth text-white justify-center items-center flex"
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
