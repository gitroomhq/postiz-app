'use client';

import React, { FC, useCallback, useContext, useMemo } from 'react';
import { MarketplaceProvider } from '@gitroom/frontend/components/marketplace/marketplace.provider';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Post } from '@gitroom/frontend/components/marketplace/post';
import { OrderCompleted } from "@gitroom/frontend/components/marketplace/order-completed-message";
import { SpecialMessageInterface } from "@gitroom/frontend/components/marketplace/types";
import { Published } from "@gitroom/frontend/components/marketplace/published";
import { PreviewPopup} from "@gitroom/frontend/components/marketplace/preview-popup";
import { Offer } from "@gitroom/frontend/components/marketplace/offer";


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
