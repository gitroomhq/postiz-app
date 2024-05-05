'use client';

import dayjs from 'dayjs';

export interface Root {
  id: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  seller: SellerBuyer;
  buyer: SellerBuyer;
  messages: Message[];
}

export interface SellerBuyer {
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
  groupId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: any;
}

import { Textarea } from '@gitroom/react/form/textarea';
import interClass from '@gitroom/react/helpers/inter.font';
import clsx from 'clsx';
import useSWR from 'swr';
import { FC, UIEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { reverse } from 'lodash';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { AddMessageDto } from '@gitroom/nestjs-libraries/dtos/messages/add.message';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export const Message: FC<{
  message: Message;
  seller: SellerBuyer;
  buyer: SellerBuyer;
  scrollDown: () => void;
}> = (props) => {
  const { message, seller, buyer, scrollDown } = props;
  useEffect(() => {
    scrollDown();
  }, []);
  const person = useMemo(() => {
    return message.from === 'BUYER' ? buyer : seller;
  }, [message]);

  const isMe = useMemo(() => {
    return message.from === 'BUYER';
  }, []);

  const time = useMemo(() => {
    return dayjs(message.createdAt).format('h:mm A');
  }, [message]);
  return (
    <div className="flex gap-[10px]">
      <div>
        <div className="w-[24px] h-[24px] rounded-full bg-amber-200">
          {!!person.picture?.path && (
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
          <div>{isMe ? 'Me' : person.name}</div>
          <div className="w-[6px] h-[6px] bg-[#334155] rounded-full" />
          <div className="text-[14px] text-inputText">{time}</div>
        </div>
        <pre
          className={clsx(
            'whitespace-pre-line font-[400] text-[12px]',
            interClass
          )}
        >
          {message.content}
        </pre>
      </div>
    </div>
  );
};

const Page: FC<{ page: number; group: string; refChange: any }> = (props) => {
  const { page, group, refChange } = props;
  const fetch = useFetch();

  const loadMessages = useCallback(async () => {
    return await (await fetch(`/messages/${group}/${page}`)).json();
  }, []);

  const { data, mutate } = useSWR<Root>(`load-${page}-${group}`, loadMessages);

  const scrollDown = useCallback(() => {
    if (page > 1) {
      return ;
    }
    // @ts-ignore
    refChange.current?.scrollTo(0, refChange.current.scrollHeight);
  }, [refChange]);

  const messages = useMemo(() => {
    return reverse([...(data?.messages || [])]);
  }, [data]);

  return (
    <>
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          seller={data?.seller!}
          buyer={data?.buyer!}
          scrollDown={scrollDown}
        />
      ))}
    </>
  );
};

export const Messages = () => {
  const [pages, setPages] = useState([makeId(3)]);
  const params = useParams();
  const fetch = useFetch();
  const ref = useRef(null);
  const resolver = useMemo(() => {
    return classValidatorResolver(AddMessageDto);
  }, []);

  const form = useForm({ resolver, values: { message: '' } });
  useEffect(() => {
    setPages([makeId(3)]);
  }, [params.id]);

  const loadMessages = useCallback(async () => {
    return await (await fetch(`/messages/${params.id}/1`)).json();
  }, []);

  const { data, mutate, isLoading } = useSWR<Root>(`load-1-${params.id}`, loadMessages);

  const submit: SubmitHandler<AddMessageDto> = useCallback(async (values) => {
    await fetch(`/messages/${params.id}`, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    mutate();
    form.reset();
  }, []);

  const changeScroll: UIEventHandler<HTMLDivElement> = useCallback((e) => {
    // @ts-ignore
    if (e.target.scrollTop === 0) {
      // @ts-ignore
      e.target.scrollTop = 1;
      setPages((prev) => [...prev, makeId(3)]);
    }
  }, [pages, setPages]);

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <FormProvider {...form}>
        <div className="flex-1 flex flex-col rounded-[4px] border border-[#172034] bg-[#0b0f1c] pb-[16px]">
          <div className="bg-[#0F1524] h-[64px] px-[24px] py-[16px] flex gap-[10px] items-center">
            <div className="w-[32px] h-[32px] rounded-full bg-amber-200">
              {!!data?.seller?.picture?.path && (
                <img
                  src={data?.seller?.picture?.path}
                  alt="seller"
                  className="w-[32px] h-[32px] rounded-full"
                />
              )}
            </div>
            <div className="text-[20px]">{data?.seller?.name || 'Noname'}</div>
          </div>
          <div className="flex-1 min-h-[658px] max-h-[658px] relative">
            <div
              className="pt-[18px] pb-[18px] absolute top-0 left-0 w-full h-full px-[24px] flex flex-col gap-[24px] overflow-x-hidden overflow-y-auto"
              onScroll={changeScroll}
              ref={ref}
            >
              {pages.map((p, index) => (
                <Page key={'page_' + (pages.length - index)} refChange={ref} page={pages.length - index} group={params.id as string} />
              ))}
            </div>
          </div>

          <div className="border-t border-t-[#658dac] p-[16px] flex flex-col">
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
                  'rounded-[4px] border border-[#506490] h-[48px] px-[24px]',
                  !form.formState.isValid && 'opacity-40'
                )}
                disabled={!form.formState.isValid}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      </FormProvider>
    </form>
  );
};
