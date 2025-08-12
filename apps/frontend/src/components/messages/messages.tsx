'use client';

import dayjs from 'dayjs';
export interface Root {
  id: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}
export interface SellerBuyer {
  id: string;
  name?: string;
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
  special?: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: any;
}
import { Textarea } from '@gitroom/react/form/textarea';
import clsx from 'clsx';
import useSWR from 'swr';
import {
  FC,
  UIEventHandler,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { reverse } from 'lodash';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { AddMessageDto } from '@gitroom/nestjs-libraries/dtos/messages/add.message';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { OrderTopActions } from '@gitroom/frontend/components/marketplace/order.top.actions';
import { MarketplaceProvider } from '@gitroom/frontend/components/marketplace/marketplace.provider';
import { SpecialMessage } from '@gitroom/frontend/components/marketplace/special.message';
import { usePageVisibility } from '@gitroom/react/helpers/use.is.visible';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
export const Message: FC<{
  message: Message;
  seller: SellerBuyer;
  buyer: SellerBuyer;
  scrollDown: () => void;
}> = (props) => {
  const { message, seller, buyer, scrollDown } = props;
  const user = useUser();
  const amITheBuyerOrSeller = useMemo(() => {
    return user?.id === buyer?.id ? 'BUYER' : 'SELLER';
  }, [buyer, user]);
  useEffect(() => {
    scrollDown();
  }, []);
  const person = useMemo(() => {
    if (message.from === 'BUYER') {
      return buyer;
    }
    if (message.from === 'SELLER') {
      return seller;
    }
  }, [amITheBuyerOrSeller, buyer, seller, message]);
  const data = useMemo(() => {
    if (!message.special) {
      return false;
    }
    return JSON.parse(message.special);
  }, [message]);
  const isMe = useMemo(() => {
    return (
      (amITheBuyerOrSeller === 'BUYER' && message.from === 'BUYER') ||
      (amITheBuyerOrSeller === 'SELLER' && message.from === 'SELLER')
    );
  }, [amITheBuyerOrSeller, message]);
  const time = useMemo(() => {
    return newDayjs(message.createdAt).format('h:mm A');
  }, [message]);
  return (
    <div className="flex gap-[10px]">
      <div>
        <div className="w-[24px] h-[24px] rounded-full bg-amber-200">
          {!!person?.picture?.path && (
            <img
              src={person.picture.path}
              alt="person"
              className="w-[24px] h-[24px] rounded-full"
            />
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col max-w-[534px] gap-[10px]">
        <div className="flex gap-[10px] items-center">
          <div>{isMe ? 'Me' : person?.name}</div>
          <div className="w-[6px] h-[6px] bg-customColor34 rounded-full" />
          <div className="text-[14px] text-inputText">{time}</div>
        </div>
        <pre
          className={clsx(
            'whitespace-pre-line font-[400] text-[12px]',
          )}
        >
          {message.content}
          {data && <SpecialMessage data={data} id={message.id} />}
        </pre>
      </div>
    </div>
  );
};
const Page: FC<{
  page: number;
  group: string;
  refChange: any;
}> = (props) => {
  const { page, group, refChange } = props;
  const fetch = useFetch();
  const { message } = useContext(MarketplaceProvider);
  const visible = usePageVisibility(page);
  const loadMessages = useCallback(async () => {
    return await (await fetch(`/messages/${group}/${page}`)).json();
  }, []);
  const { data, mutate } = useSWR<Root>(`load-${page}-${group}`, loadMessages, {
    ...(page === 1
      ? {
          refreshInterval: visible ? 5000 : 0,
          refreshWhenHidden: false,
          refreshWhenOffline: false,
          revalidateOnFocus: false,
          revalidateIfStale: false,
        }
      : {}),
  });
  const scrollDown = useCallback(() => {
    if (page > 1) {
      return;
    }
    // @ts-ignore
    refChange.current?.scrollTo(0, refChange.current.scrollHeight);
  }, [refChange]);
  const messages = useMemo(() => {
    return reverse([...(data?.messages || [])]);
  }, [data]);
  return (
    <>
      {messages.map((m) => (
        <Message
          key={m.id}
          message={m}
          seller={message?.seller!}
          buyer={message?.buyer!}
          scrollDown={scrollDown}
        />
      ))}
    </>
  );
};
export const Messages = () => {
  const [pages, setPages] = useState([makeId(3)]);
  const user = useUser();
  const params = useParams();
  const fetch = useFetch();
  const t = useT();

  const ref = useRef(null);
  const { message } = useContext(MarketplaceProvider);
  const showFrom = useMemo(() => {
    return user?.id === message?.buyerId ? message?.seller : message?.buyer;
  }, [message, user]);
  const resolver = useMemo(() => {
    return classValidatorResolver(AddMessageDto);
  }, []);
  const form = useForm({
    resolver,
    values: {
      message: '',
    },
  });
  useEffect(() => {
    setPages([makeId(3)]);
  }, [params.id]);
  const loadMessages = useCallback(async () => {
    return await (await fetch(`/messages/${params.id}/1`)).json();
  }, []);
  const { data, mutate, isLoading } = useSWR<Root>(
    `load-1-${params.id}`,
    loadMessages
  );
  const submit: SubmitHandler<AddMessageDto> = useCallback(async (values) => {
    await fetch(`/messages/${params.id}`, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    mutate();
    form.reset();
  }, []);
  const changeScroll: UIEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      // @ts-ignore
      if (e.target.scrollTop === 0) {
        // @ts-ignore
        e.target.scrollTop = 1;
        setPages((prev) => [...prev, makeId(3)]);
      }
    },
    [pages, setPages]
  );
  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <FormProvider {...form}>
        <div className="flex-1 flex flex-col rounded-[4px] border border-customColor6 bg-customColor3 pb-[16px]">
          <div className="bg-customColor8 h-[64px] px-[24px] py-[16px] flex gap-[10px] items-center">
            <div className="w-[32px] h-[32px] rounded-full bg-amber-200">
              {!!showFrom?.picture?.path && (
                <img
                  src={showFrom?.picture?.path}
                  alt="seller"
                  className="w-[32px] h-[32px] rounded-full"
                />
              )}
            </div>
            <div className="text-[20px] flex-1">
              {showFrom?.name || 'Noname'}
            </div>
            <div>
              <OrderTopActions />
            </div>
          </div>
          <div className="flex-1 min-h-[658px] max-h-[658px] relative">
            <div
              className="pt-[18px] pb-[18px] absolute top-0 start-0 w-full h-full px-[24px] flex flex-col gap-[24px] overflow-x-hidden overflow-y-auto"
              onScroll={changeScroll}
              ref={ref}
            >
              {pages.map((p, index) => (
                <Page
                  key={'page_' + (pages.length - index)}
                  refChange={ref}
                  page={pages.length - index}
                  group={params.id as string}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-t-customColor46 p-[16px] flex flex-col">
            <div>
              <Textarea
                className="!min-h-[100px] resize-none"
                label=""
                name="message"
              />
            </div>
            <div className="flex justify-end">
              <button
                className={clsx(
                  'rounded-[4px] border border-customColor21 h-[48px] px-[24px]',
                  !form.formState.isValid && 'opacity-40'
                )}
                disabled={!form.formState.isValid}
              >
                {t('send_message', 'Send Message')}
              </button>
            </div>
          </div>
        </div>
      </FormProvider>
    </form>
  );
};
