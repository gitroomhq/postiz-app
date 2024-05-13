'use client';

import { FC, useEffect } from 'react';
import { CustomSelect } from '@gitroom/react/form/custom.select';
import { FormProvider, useForm } from 'react-hook-form';

export interface Information {
  buyer: Buyer;
  usedIds: Array<{ id: string; status: 'NO' | 'WAITING_CONFIRMATION' | 'YES' }>;
  id: string;
  missing: Missing[];
}

export interface Buyer {
  id: string;
  name: string;
  picture: Picture;
}

export interface Picture {
  id: string;
  path: string;
}

export interface Missing {
  integration: Integration;
  missing: number;
}

export interface Integration {
  quantity: number;
  integration: Integration2;
}

export interface Integration2 {
  id: string;
  name: string;
  providerIdentifier: string;
}

export const PostToOrganization: FC<{
  information: Information[];
  onChange: (order?: Information) => void;
  selected?: string;
}> = (props) => {
  const { information, onChange, selected } = props;
  const form = useForm();
  const postFor = form.watch('post_for');
  useEffect(() => {
    onChange(information?.find((p) => p.id === postFor?.value)!);
  }, [postFor]);

  useEffect(() => {
    if (!selected || !information?.length) {
      return;
    }

    const findIt = information?.find((p) => p.id === selected);
    form.setValue('post_for', {
      value: findIt?.id,
    });
    onChange(information?.find((p) => p.id === selected)!);
  }, [selected, information]);

  if (!information?.length) {
    return null;
  }

  return (
    <FormProvider {...form}>
      <CustomSelect
        className="w-[240px]"
        removeError={true}
        label=""
        placeholder="Select order from marketplace"
        name="post_for"
        options={information?.map((p) => ({
          label: 'For: ' + p?.buyer?.name,
          value: p?.id,
          icon: (
            <img
              src={p?.buyer?.picture?.path}
              className="w-[24px] h-[24px] rounded-full"
            />
          ),
        }))}
      />
    </FormProvider>
  );
};
