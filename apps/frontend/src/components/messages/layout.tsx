'use client';

import { FC, ReactNode, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useParams, useRouter } from 'next/navigation';
import {
  MarketplaceProvider,
  Root2,
} from '@gitroom/frontend/components/marketplace/marketplace.provider';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
const Card: FC<{
  message: Root2;
}> = (props) => {
  const { message } = props;
  const path = useParams();
  const router = useRouter();
  const user = useUser();
  const changeConversation = useCallback(() => {
    router.push(`/messages/${message.id}`);
  }, []);
  const t = useT();

  const showFrom = useMemo(() => {
    return user?.id === message?.buyerId ? message?.seller : message?.buyer;
  }, [message, user]);
  return (
    <div
      onClick={changeConversation}
      className={clsx(
        'h-[89px] p-[24px] flex gap-[16px] rounded-[4px] cursor-pointer',
        path?.id === message.id && 'bg-sixth border border-customColor6'
      )}
    >
      <div className="w-[40px] h-[40px] rounded-full bg-amber-200">
        {showFrom?.picture?.path && (
          <img
            src={showFrom.picture.path}
            alt={showFrom.name || 'Noname'}
            className="w-full h-full rounded-full"
          />
        )}
      </div>
      <div className="flex-1 relative">
        <div className="absolute start-0 top-0 w-full h-full flex flex-col whitespace-nowrap">
          <div>{showFrom?.name || 'Noname'}</div>
          <div className="text-[12px] w-full overflow-ellipsis overflow-hidden">
            {message.messages[0]?.content}
          </div>
        </div>
      </div>
      <div className="text-[12px]">{t('mar_28', 'Mar 28')}</div>
    </div>
  );
};
export const Layout: FC<{
  renderChildren: ReactNode;
}> = (props) => {
  const { renderChildren } = props;
  const fetch = useFetch();
  const params = useParams();
  const router = useRouter();
  const loadMessagesGroup = useCallback(async () => {
    return await (await fetch('/messages')).json();
  }, []);
  const messagesGroup = useSWR<Root2[]>('messagesGroup', loadMessagesGroup, {
    refreshInterval: 5000,
  });
  const t = useT();

  const marketplace = useCallback(() => {
    router.push('/marketplace');
  }, [router]);
  const currentMessage = useMemo(() => {
    return messagesGroup?.data?.find((message) => message.id === params.id);
  }, [params.id, messagesGroup.data]);
  if (messagesGroup.isLoading) {
    return null;
  }
  if (!messagesGroup.isLoading && !messagesGroup?.data?.length) {
    return (
      <div className="flex flex-col justify-center items-center mt-[100px] gap-[27px] text-center">
        <div>
          <img src="/peoplemarketplace.svg" />
        </div>
        <div className="text-[48px]">
          {t('there_are_no_messages_yet', 'There are no messages yet.')}
          <br />
          {t('checkout_the_marketplace', 'Checkout the Marketplace')}
        </div>
        <div>
          <Button onClick={marketplace}>
            {t('go_to_marketplace', 'Go to marketplace')}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-[20px]">
      <div className="pt-[7px] w-[330px] flex flex-col">
        <div className="text-[20px] mb-[18px]">
          {t('all_messages', 'All Messages')}
        </div>
        <div className="flex flex-col">
          {messagesGroup.data?.map((message) => (
            <Card key={message.id} message={message} />
          ))}
        </div>
      </div>
      <MarketplaceProvider.Provider
        value={{
          message: currentMessage,
        }}
      >
        <div className="flex-1 flex flex-col">{renderChildren}</div>
      </MarketplaceProvider.Provider>
    </div>
  );
};
