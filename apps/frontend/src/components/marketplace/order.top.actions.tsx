import React, { FC, useCallback, useContext, useMemo, useState } from 'react';
import { MarketplaceProvider } from '@gitroom/frontend/components/marketplace/marketplace.provider';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useModals } from '@mantine/modals';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Input } from '@gitroom/react/form/input';
import { CustomSelect } from '@gitroom/react/form/custom.select';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { Total } from '@gitroom/react/form/total';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { array, number, object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';
import { ReactComponent as PlusSvg } from '@gitroom/frontend/assets/plus.svg';

const schema = object({
  socialMedia: array()
    .min(1)
    .of(
      object({
        total: number().required(),
        value: object({
          value: string().required('Platform is required'),
        }).required(),
        price: string().matches(/^\d+$/, 'Price must be a number').required(),
      })
    )
    .required(),
}).required();

export const NewOrder: FC<{ group: string }> = (props) => {
  const { group } = props;
  const modal = useModals();
  const fetch = useFetch();
  const [update, setUpdate] = useState(0);
  const toast = useToaster();
  const loadIntegrations = useCallback(async () => {
    return (
      await (await fetch('/integrations/list')).json()
    ).integrations.filter((f: any) => !f.disabled);
  }, []);

  const { data } = useSWR('integrations', loadIntegrations);

  const options: Array<{ label: string; value: string; icon: string }> =
    useMemo(() => {
      if (!data) {
        return [];
      }

      return data?.map((p: any) => ({
        label: p.name,
        value: p.identifier,
        id: p.id,
        icon: (
          <div className="relative">
            <img
              className="w-[20px] h-[20px] rounded-full"
              src={p.picture}
              alt={p.name}
            />
            <img
              className="absolute left-[10px] top-[10px] w-[15px] h-[15px] rounded-full"
              src={`/icons/platforms/${p.identifier}.png`}
              alt={p.name}
            />
          </div>
        ),
      }));
    }, [data]);

  const change = useCallback(() => {
    setUpdate((prev) => prev + 1);
  }, [update]);

  const form = useForm<{
    price: string;
    socialMedia: Array<{ value?: string; total: number; price: any }>;
  }>({
    values: {
      price: '',
      socialMedia: [{ value: undefined, total: 1, price: '' }],
    },
    criteriaMode: 'all',
    // @ts-ignore
    resolver: yupResolver(schema),
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'socialMedia',
  });

  const possibleOptions = useMemo(() => {
    return fields.map((z, index) => {
      const field = form.getValues(`socialMedia.${index}.value`) as {
        value?: { value?: string; total?: number };
      };
      return options.filter((f) => {
        const getAllValues = fields.reduce((all, p, innerIndex) => {
          if (index === innerIndex) {
            return all;
          }

          const newField = form.getValues(
            `socialMedia.${innerIndex}.value`
          ) as { value?: { value?: string } };
          all.push(newField);
          return all;
        }, [] as any[]);

        return (
          field?.value?.value === f.value ||
          !getAllValues.some((v) => v?.value === f.value)
        );
      });
    });
  }, [update, fields, options]);

  const canAddMoreOptions = useMemo(() => {
    return fields.length < options.length;
  }, [update, fields, options]);

  const close = useCallback(() => {
    return modal.closeAll();
  }, []);

  const submit = useCallback(async (data: any) => {
    await (
      await fetch('/marketplace/offer', {
        method: 'POST',
        body: JSON.stringify({
          group,
          socialMedia: data.socialMedia.map((z: any) => ({
            total: z.total,
            price: +z.price,
            value: z.value.id,
          })),
        }),
      })
    ).json();

    toast.show('Offer sent successfully');
    modal.closeAll();
  }, []);

  const totalPrice = useMemo(() => {
    return fields.reduce((total, field, index) => {
      return (
        total +
        (+(form.getValues(`socialMedia.${index}.price`) || 0) *
          form.getValues(`socialMedia.${index}.total`) || 0)
      );
    }, 0);
  }, [update, fields, options]);

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <FormProvider {...form}>
        <div className="w-full max-w-[647px] mx-auto bg-sixth px-[16px] rounded-[4px] border border-customColor6 gap-[24px] flex flex-col relative">
          <button
            onClick={close}
            className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
            type="button"
          >
            <CloseXSvg />
          </button>
          <div className="text-[18px] font-[500] flex flex-col">
            <TopTitle title={`Send a new offer`} />
            <div className="p-[16px] -mx-[16px]">
              {fields.map((field, index) => (
                <div className="relative flex gap-[10px]" key={field.id}>
                  {index !== 0 && (
                    <div
                      onClick={() => remove(index)}
                      className="cursor-pointer top-[3px] z-[99] w-[15px] h-[15px] bg-red-500 rounded-full text-textColor absolute left-[60px] text-[12px] flex justify-center items-center pb-[2px] select-none"
                    >
                      x
                    </div>
                  )}
                  <div className="flex-1">
                    <CustomSelect
                      {...form.register(`socialMedia.${index}.value`)}
                      onChange={change}
                      options={possibleOptions[index]}
                      placeholder="Select social media"
                      label="Platform"
                      disableForm={true}
                    />
                  </div>
                  <div>
                    <Total
                      customOnChange={change}
                      {...form.register(`socialMedia.${index}.total`)}
                    />
                  </div>
                  <div>
                    <Input
                      icon={<div className="text-[14px]">$</div>}
                      className="text-[14px]"
                      label="Price per post"
                      error={
                        form.formState.errors?.socialMedia?.[index]?.price
                          ?.message
                      }
                      customUpdate={change}
                      name={`socialMedia.${index}.price`}
                    />
                  </div>
                </div>
              ))}
              {canAddMoreOptions && (
                <div>
                  <div
                    onClick={() =>
                      append({ value: undefined, total: 1, price: '' })
                    }
                    className="select-none rounded-[4px] border-2 border-customColor21 flex py-[9.5px] px-[24px] items-center gap-[4px] text-[14px] float-left cursor-pointer"
                  >
                    <div>
                      <PlusSvg />
                    </div>
                    <div>Add another platform</div>
                  </div>
                </div>
              )}
            </div>
            <div className="py-[16px] flex justify-end">
              <Button type="submit" className="rounded-[4px]">
                Send an offer for ${totalPrice}
              </Button>
            </div>
          </div>
        </div>
      </FormProvider>
    </form>
  );
};

export const OrderInProgress: FC<{
  group: string;
  buyer: boolean;
  order: string;
}> = (props) => {
  const { group, buyer, order } = props;
  const fetch = useFetch();

  const completeOrder = useCallback(async () => {
    if (
      await deleteDialog(
        'Are you sure you want to pay the seller and end the order? this is irreversible action'
      )
    ) {
      await (
        await fetch(`/marketplace/offer/${order}/complete`, {
          method: 'POST',
        })
      ).json();
    }
  }, [order]);

  return (
    <div className="flex gap-[10px]">
      {buyer && (
        <div
          onClick={completeOrder}
          className="rounded-[34px] border-[1px] border-customColor21 !bg-sixth h-[28px] justify-center items-center text-[12px] px-[12px] flex font-[600] cursor-pointer"
        >
          Complete order and pay early
        </div>
      )}
      <div className="h-[28px] justify-center items-center bg-customColor42 text-[12px] px-[12px] flex rounded-[34px] font-[600]">
        Order in progress
      </div>
    </div>
  );
};

export const CreateNewOrder: FC<{ group: string }> = (props) => {
  const { group } = props;
  const modals = useModals();

  const createOrder = useCallback(() => {
    modals.openModal({
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
      size: '100%',
      children: <NewOrder group={group} />,
    });
  }, [group]);

  return (
    <div
      className="h-[28px] justify-center items-center bg-customColor42 text-[12px] px-[12px] flex rounded-[34px] font-[600] cursor-pointer"
      onClick={createOrder}
    >
      Create a new offer
    </div>
  );
};

enum OrderOptions {
  CREATE_A_NEW_ORDER = 'CREATE_A_NEW_ORDER',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PUBLICATION = 'WAITING_PUBLICATION',
}

export const OrderTopActions = () => {
  const { message } = useContext(MarketplaceProvider);
  const user = useUser();

  const isBuyer = useMemo(() => {
    return user?.id === message?.buyerId;
  }, [user, message]);

  const myOptions: OrderOptions | undefined = useMemo(() => {
    if (
      !isBuyer &&
      (!message?.orders.length ||
        message.orders[0].status === 'COMPLETED' ||
        message.orders[0].status === 'CANCELED')
    ) {
      return OrderOptions.CREATE_A_NEW_ORDER;
    }

    if (message?.orders?.[0]?.status === 'PENDING') {
      return OrderOptions.IN_PROGRESS;
    }

    if (message?.orders?.[0]?.status === 'ACCEPTED') {
      return OrderOptions.WAITING_PUBLICATION;
    }
  }, [isBuyer, user, message]);

  if (!myOptions) {
    return null;
  }

  switch (myOptions) {
    case OrderOptions.CREATE_A_NEW_ORDER:
      return <CreateNewOrder group={message?.id!} />;
    case OrderOptions.WAITING_PUBLICATION:
      return (
        <OrderInProgress
          group={message?.id!}
          buyer={isBuyer}
          order={message?.orders[0]?.id!}
        />
      );
  }
  return <div />;
};
