'use client';

import { FC, ReactNode, useCallback } from 'react';
import clsx from 'clsx';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useParams, useRouter } from 'next/navigation';

export interface Root2 {
  id: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  seller: Seller;
  messages: Message[];
}

export interface Seller {
  name: any;
  picture: Picture;
}

export interface Picture {
  id: string;
  path: string;
}

export interface Message {
  id: string;
  from: string;
  content: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: any;
}

const Card: FC<{ message: Root2 }> = (props) => {
  const { message } = props;
  const path = useParams();
  const router = useRouter();

  const changeConversation = useCallback(() => {
    router.push(`/messages/${message.id}`);
  }, []);

  return (
    <div
      onClick={changeConversation}
      className={clsx(
        'h-[89px] p-[24px] flex gap-[16px] rounded-[4px] cursor-pointer',
        path?.id === message.id && 'bg-sixth border border-[#172034]'
      )}
    >
      <div className="w-[40px] h-[40px] rounded-full bg-amber-200">
        {message?.seller?.picture?.path && (
          <img src={message.seller.picture.path} alt={message.seller.name || 'Noname'} className="w-full h-full rounded-full" />
        )}
      </div>
      <div className="flex-1 relative">
        <div className="absolute left-0 top-0 w-full h-full flex flex-col whitespace-nowrap">
          <div>{message.seller.name || 'Noname'}</div>
          <div className="text-[12px] w-full overflow-ellipsis overflow-hidden">
            {message.messages[0]?.content}
          </div>
        </div>
      </div>
      <div className="text-[12px]">Mar 28</div>
    </div>
  );
};
export const Layout: FC<{ renderChildren: ReactNode }> = (props) => {
  const { renderChildren } = props;
  const fetch = useFetch();

  const loadMessagesGroup = useCallback(async () => {
    return await (await fetch('/messages')).json();
  }, []);

  const messagesGroup = useSWR<Root2[]>('messagesGroup', loadMessagesGroup);

  return (
    <div className="flex gap-[20px]">
      <div className="pt-[7px] w-[330px] flex flex-col">
        <div className="text-[20px] mb-[18px]">All Messages</div>
        <div className="flex flex-col">
          {messagesGroup.data?.map((message) => (
            <Card key={message.id} message={message} />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">{renderChildren}</div>
    </div>
  );
};
