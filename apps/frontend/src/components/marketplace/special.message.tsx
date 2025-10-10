'use client';

import React, { FC, useCallback, useContext, useMemo } from 'react';
import { MarketplaceProvider } from '@gitroom/frontend/components/marketplace/marketplace.provider';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { capitalize } from 'lodash';
import removeMd from 'remove-markdown';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Post as PrismaPost } from '@prisma/client';
import dynamic from 'next/dynamic';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
const PreviewPopupDynamic = dynamic(() =>
  import('@gitroom/frontend/components/marketplace/preview.popup.dynamic').then(
    (mod) => mod.PreviewPopupDynamic
  )
);
interface SpecialMessageInterface {
  type: string;
  data: {
    id: string;
    [key: string]: any;
  };
}
export const OrderCompleted: FC = () => {
  const t = useT();

  return (
    <div className="border border-customColor44 flex flex-col rounded-[6px] overflow-hidden">
      <div className="flex items-center bg-customColor8 px-[24px] py-[16px] text-[20px]">
        <div className="flex-1">{t('order_completed', 'Order completed')}</div>
      </div>
      <div className="py-[16px] px-[24px] flex flex-col gap-[20px] text-[18px]">
        {t('the_order_has_been_completed', 'The order has been completed')}
      </div>
    </div>
  );
};
export const Published: FC<{
  isCurrentOrder: boolean;
  isSellerOrBuyer: 'BUYER' | 'SELLER';
  orderStatus: string;
  data: SpecialMessageInterface;
}> = (props) => {
  const t = useT();
  const { data, isSellerOrBuyer } = props;
  return (
    <div className="border border-customColor44 flex flex-col rounded-[6px] overflow-hidden">
      <div className="flex items-center bg-customColor8 px-[24px] py-[16px] text-[20px]">
        <div className="flex-1">
          {isSellerOrBuyer === 'BUYER' ? 'Your' : 'The'}
          {t('post_has_been_published', 'post has been published')}
        </div>
      </div>

      <div className="py-[16px] px-[24px] flex flex-col gap-[20px]">
        <div className="flex gap-[20px]">
          <div className="relative">
            <img
              src={data.data.picture}
              alt="platform"
              className="w-[24px] h-[24px] rounded-full"
            />
            <img
              className="absolute start-[15px] top-[15px] w-[15px] h-[15px] rounded-full"
              src={`/icons/platforms/${data.data.integration}.png`}
              alt={data.data.name}
            />
          </div>

          <div className="flex-1 text-[18px]">{data.data.name}</div>
        </div>
        <div className="text-[14px]">
          {t('url_1', 'URL:')}
          <a className="underline hover:font-bold" href={data.data.url}>
            {data.data.url}
          </a>
        </div>
      </div>
    </div>
  );
};
export const PreviewPopup: FC<{
  postId: string;
  providerId: string;
  post: {
    integration: string;
    group: string;
    posts: PrismaPost[];
    settings: any;
  };
}> = (props) => {
  const modal = useModals();
  const close = useCallback(() => {
    return modal.closeAll();
  }, []);
  return (
    <div className="bg-primary p-[20px] w-full relative">
      <button
        onClick={close}
        className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
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
      <PreviewPopupDynamic {...props} />
    </div>
  );
};
export const Offer: FC<{
  isCurrentOrder: boolean;
  isSellerOrBuyer: 'BUYER' | 'SELLER';
  orderStatus: string;
  data: SpecialMessageInterface;
}> = (props) => {
  const { data, isSellerOrBuyer, isCurrentOrder, orderStatus } = props;
  const fetch = useFetch();
  const acceptOrder = useCallback(async () => {
    const { url } = await (
      await fetch(`/marketplace/orders/${data.data.id}/payment`, {
        method: 'POST',
      })
    ).json();
    window.location.href = url;
  }, [data.data.id]);
  const totalPrice = useMemo(() => {
    return data?.data?.ordersItems?.reduce((all: any, current: any) => {
      return all + current.price * current.quantity;
    }, 0);
  }, [data?.data?.ordersItems]);

  const t = useT();

  return (
    <div className="border border-customColor44 flex flex-col rounded-[6px] overflow-hidden">
      <div className="flex items-center bg-customColor8 px-[24px] py-[16px] text-[20px]">
        <div className="flex-1">{t('new_offer', 'New Offer')}</div>
        <div className="text-customColor42">${totalPrice}</div>
      </div>
      <div className="py-[16px] px-[24px] flex flex-col gap-[20px]">
        <div className="text-inputText text-[12px]">
          {t('platform', 'Platform')}
        </div>
        {data.data.ordersItems.map((item: any) => (
          <div
            key={item.integration.id}
            className="flex gap-[10px] items-center"
          >
            <div className="relative">
              <img
                src={item.integration.picture}
                alt="platform"
                className="w-[24px] h-[24px] rounded-full"
              />
              <img
                className="absolute start-[15px] top-[15px] w-[15px] h-[15px] rounded-full"
                src={`/icons/platforms/${item.integration.providerIdentifier}.png`}
                alt={item.integration.name}
              />
            </div>
            <div className="flex-1 text-[18px]">{item.integration.name}</div>
            <div className="text-[18px]">
              {item.quantity}
              {t('posts', 'Posts')}
            </div>
          </div>
        ))}
        {orderStatus === 'PENDING' &&
          isCurrentOrder &&
          isSellerOrBuyer === 'BUYER' && (
            <div className="flex justify-end">
              <Button
                className="rounded-[4px] text-[14px]"
                onClick={acceptOrder}
              >
                {t('pay_accept_offer', 'Pay & Accept Offer')}
              </Button>
            </div>
          )}
        {orderStatus === 'ACCEPTED' && (
          <div className="flex justify-end">
            <Button className="rounded-[4px] text-[14px] border border-tableBorder !bg-sixth text-tableBorder">
              {t('accepted', 'Accepted')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
export const Post: FC<{
  isCurrentOrder: boolean;
  isSellerOrBuyer: 'BUYER' | 'SELLER';
  orderStatus: string;
  message: string;
  data: SpecialMessageInterface;
}> = (props) => {
  const { data, isSellerOrBuyer, message, isCurrentOrder, orderStatus } = props;
  const fetch = useFetch();
  const modal = useModals();
  const getIntegration = useCallback(async () => {
    return (
      await fetch(
        `/integrations/${data.data.integration}?order=${data.data.id}`,
        {
          method: 'GET',
        }
      )
    ).json();
  }, []);
  const requestRevision = useCallback(async () => {
    if (
      !(await deleteDialog(
        'Are you sure you want to request a revision?',
        'Yes'
      ))
    ) {
      return;
    }
    await fetch(`/marketplace/posts/${data.data.postId}/revision`, {
      method: 'POST',
      body: JSON.stringify({
        message,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }, [data]);
  const requestApproved = useCallback(async () => {
    if (
      !(await deleteDialog(
        'Are you sure you want to approve this post?',
        'Yes'
      ))
    ) {
      return;
    }
    await fetch(`/marketplace/posts/${data.data.postId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        message,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }, [data]);
  const preview = useCallback(async () => {
    const post = await (
      await fetch(`/marketplace/posts/${data.data.postId}`)
    ).json();
    const integration = await getIntegration();
    modal.openModal({
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      size: 'auto',
      withCloseButton: false,
      children: (
        <IntegrationContext.Provider
          value={{
            allIntegrations: [],
            date: newDayjs(),
            integration,
            value: [],
          }}
        >
          <PreviewPopup
            providerId={post?.providerId!}
            post={post}
            postId={data?.data?.postId!}
          />
        </IntegrationContext.Provider>
      ),
    });
  }, [data?.data]);
  const { data: integrationData } = useSWR<{
    id: string;
    name: string;
    picture: string;
    providerIdentifier: string;
  }>(`/integrations/${data.data.integration}`, getIntegration);

  const t = useT();

  return (
    <div className="border border-customColor44 flex flex-col rounded-[6px] overflow-hidden">
      <div className="flex items-center bg-customColor8 px-[24px] py-[16px] text-[20px]">
        <div className="flex-1">
          {t('post_draft', 'Post Draft')}
          {capitalize(integrationData?.providerIdentifier || '')}
        </div>
      </div>
      <div className="py-[16px] px-[24px] flex gap-[20px]">
        <div>
          <div className="relative">
            <img
              src={integrationData?.picture}
              alt="platform"
              className="w-[24px] h-[24px] rounded-full"
            />
            <img
              className="absolute start-[15px] top-[15px] w-[15px] h-[15px] rounded-full"
              src={`/icons/platforms/${integrationData?.providerIdentifier}.png`}
              alt={integrationData?.name}
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col text-[16px] gap-[2px]">
          <div className="text-[18px]">{integrationData?.name}</div>
          <div>{removeMd(data.data.description)}</div>
          {isSellerOrBuyer === 'BUYER' &&
            isCurrentOrder &&
            data.data.status === 'PENDING' &&
            orderStatus === 'ACCEPTED' && (
              <div className="mt-[18px] flex gap-[10px] justify-end">
                <Button
                  onClick={requestRevision}
                  className="rounded-[4px] text-[14px] border-[2px] border-customColor21 !bg-sixth"
                >
                  {t('revision_needed', 'Revision Needed')}
                </Button>
                <Button
                  onClick={requestApproved}
                  className="rounded-[4px] text-[14px] border-[2px] border-customColor21 !bg-sixth"
                >
                  {t('approve', 'Approve')}
                </Button>
                <Button className="rounded-[4px]" onClick={preview}>
                  {t('preview', 'Preview')}
                </Button>
              </div>
            )}

          {data.data.status === 'REVISION' && (
            <div className="flex justify-end">
              <Button className="rounded-[4px] text-[14px] border border-tableBorder !bg-sixth text-tableBorder">
                {t('revision_requested', 'Revision Requested')}
              </Button>
            </div>
          )}
          {data.data.status === 'APPROVED' && (
            <div className="flex justify-end gap-[10px]">
              <Button className="rounded-[4px] text-[14px] border border-tableBorder !bg-sixth text-tableBorder">
                {t('accepted_1', 'ACCEPTED')}
              </Button>
            </div>
          )}

          {data.data.status === 'CANCELED' && (
            <div className="flex justify-end gap-[10px]">
              <Button className="rounded-[4px] text-[14px] border border-tableBorder !bg-sixth text-tableBorder">
                {t('cancelled_by_the_seller', 'Cancelled by the seller')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export const SpecialMessage: FC<{
  data: SpecialMessageInterface;
  id: string;
}> = (props) => {
  const { data, id } = props;
  const { message } = useContext(MarketplaceProvider);
  const user = useUser();
  const isCurrentOrder = useMemo(() => {
    return message?.orders?.[0]?.id === data?.data?.id;
  }, [message, data]);
  const isSellerOrBuyer = useMemo(() => {
    return user?.id === message?.buyerId ? 'BUYER' : 'SELLER';
  }, [user, message]);
  if (data.type === 'offer') {
    return (
      <Offer
        data={data}
        orderStatus={message?.orders?.[0]?.status!}
        isCurrentOrder={isCurrentOrder}
        isSellerOrBuyer={isSellerOrBuyer}
      />
    );
  }
  if (data.type === 'post') {
    return (
      <Post
        data={data}
        orderStatus={message?.orders?.[0]?.status!}
        isCurrentOrder={isCurrentOrder}
        isSellerOrBuyer={isSellerOrBuyer}
        message={id}
      />
    );
  }
  if (data.type === 'published') {
    return (
      <Published
        data={data}
        orderStatus={message?.orders?.[0]?.status!}
        isCurrentOrder={isCurrentOrder}
        isSellerOrBuyer={isSellerOrBuyer}
      />
    );
  }
  if (data.type === 'order-completed') {
    return <OrderCompleted />;
  }
  return null;
};
