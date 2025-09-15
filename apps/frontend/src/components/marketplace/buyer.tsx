'use client';

import React, {
  FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';
import {
  allTagsOptions,
  tagsList,
} from '@gitroom/nestjs-libraries/database/prisma/marketplace/tags.list';
import { capitalize, chunk, fill } from 'lodash';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Textarea } from '@gitroom/react/form/textarea';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { NewConversationDto } from '@gitroom/nestjs-libraries/dtos/marketplace/new.conversation.dto';
import { OrderList } from '@gitroom/frontend/components/marketplace/order.list';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export interface Root {
  list: List[];
  count: number;
}
export interface List {
  id: string;
  name: any;
  bio: string;
  audience: number;
  picture: {
    id: string;
    path: string;
  };
  organizations: Organization[];
  items: Item[];
}
export interface Organization {
  organization: Organization2;
}
export interface Organization2 {
  Integration: Integration[];
}
export interface Integration {
  providerIdentifier: string;
}
export interface Item {
  key: string;
}
export const LabelCheckbox: FC<{
  label: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string, status: boolean) => void;
}> = (props) => {
  const { label, name, value, checked, onChange } = props;
  const ref = useRef<any>(null);
  const [innerCheck, setInnerCheck] = useState(checked);
  const change = useCallback(() => {
    setInnerCheck(!innerCheck);
    onChange(value, !innerCheck);
  }, [innerCheck]);
  return (
    <div className="flex items-center gap-[10px] select-none">
      <Checkbox
        ref={ref}
        variant="hollow"
        name={name}
        checked={checked}
        onChange={change}
        disableForm={true}
      />
      <label
        onClick={() => ref.current.click()}
        className="text-[20px]"
        htmlFor={name}
      >
        {label}
      </label>
    </div>
  );
};
const Pagination: FC<{
  results: number;
}> = (props) => {
  const { results } = props;
  const router = useRouter();
  const search = useSearchParams();
  const page = +(parseInt(search.get('page')!) || 1) - 1;
  const t = useT();
  const from = page * 8;
  const to = (page + 1) * 8;
  const pagesArray = useMemo(() => {
    return Array.from(
      {
        length: Math.ceil(results / 8),
      },
      (_, i) => i + 1
    );
  }, [results]);
  const changePage = useCallback(
    (newPage: number) => () => {
      const params = new URLSearchParams(window.location.search);
      params.set('page', String(newPage));
      router.replace('?' + params.toString(), {
        scroll: true,
      });
    },
    [page]
  );
  if (results < 8) {
    return null;
  }
  return (
    <div className="flex items-center relative">
      <div className="absolute start-0">
        {t('showing', 'Showing')}
        {from + 1}
        {t('to', 'to')}
        {to > results ? results : to}
        {t('from', 'from')}
        {results}
        {t('results', 'Results')}
      </div>
      <div className="flex mx-auto">
        {page > 0 && (
          <div>
            <svg
              width="41"
              height="40"
              viewBox="0 0 41 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              onClick={changePage(page)}
            >
              <g clipPath="url(#clip0_703_22324)">
                <path
                  d="M22.5 25L17.5 20L22.5 15"
                  stroke="#64748B"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_703_22324">
                  <rect x="0.5" width="40" height="40" rx="8" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
        )}
        {pagesArray.map((p) => (
          <div
            key={p}
            onClick={changePage(p)}
            className={clsx(
              'w-[40px] h-[40px] flex justify-center items-center rounded-[8px] cursor-pointer',
              p === page + 1 ? 'bg-customColor4' : 'text-inputText'
            )}
          >
            {p}
          </div>
        ))}
        {page + 1 < pagesArray[pagesArray.length - 1] && (
          <svg
            onClick={changePage(page + 2)}
            width="41"
            height="40"
            viewBox="0 0 41 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18.5 15L23.5 20L18.5 25"
              stroke="#64748B"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
};
export const Options: FC<{
  title: string;
  options: Array<{
    key: string;
    value: string;
  }>;
  onChange?: (key: string, value: boolean) => void;
  preSelected?: string[];
  rows?: number;
  search: boolean;
}> = (props) => {
  const { title, onChange, search, preSelected } = props;
  const query = 'services';
  const [selected, setPreSelected] = useState<string[]>(
    preSelected?.slice(0) || []
  );
  const rows = props.rows || 1;
  const optionsGroupList = chunk(
    props.options,
    Math.ceil(props.options.length / rows)
  );
  const optionsGroup =
    optionsGroupList.length < rows
      ? [
          ...optionsGroupList,
          ...fill(Array(rows - optionsGroupList.length), []),
        ]
      : optionsGroupList;
  const router = useRouter();
  const searchParams = (useSearchParams().get(query) || '')?.split(',') || [];
  const change = (value: string, state: boolean) => {
    if (onChange) {
      onChange(value, state);
    }
    if (!search) {
      return;
    }
    const getAll = new URLSearchParams(window.location.search).get(query);
    const splitAll = (getAll?.split(',') || []).filter((f) => f);
    if (state) {
      splitAll?.push(value);
    } else {
      splitAll?.splice(splitAll.indexOf(value), 1);
    }
    const params = new URLSearchParams(window.location.search);
    if (!splitAll?.length) {
      params.delete(query);
    } else {
      params.set(query, splitAll?.join(',') || '');
    }
    router.replace('?' + params.toString());
    return params.toString();
  };
  return (
    <>
      <div className="h-[56px] text-[20px] font-[600] flex items-center px-[24px] bg-customColor8">
        {title}
      </div>
      <div className="bg-customColor3 flex px-[32px] py-[24px]">
        {optionsGroup.map((options, key) => (
          <div
            key={`options_` + key}
            className="flex gap-[16px] flex-col flex-1 justify-start"
          >
            {options.map((option) => (
              <div key={option.key} className="flex gap-[10px]">
                <LabelCheckbox
                  value={option.key}
                  label={option.value}
                  checked={
                    selected?.indexOf(option.key) > -1 ||
                    searchParams.indexOf(option.key) > -1
                  }
                  name={query}
                  onChange={change}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};
export const RequestService: FC<{
  toId: string;
  name: string;
}> = (props) => {
  const { toId, name } = props;
  const router = useRouter();
  const fetch = useFetch();
  const modal = useModals();
  const resolver = useMemo(() => {
    return classValidatorResolver(NewConversationDto);
  }, []);
  const form = useForm({
    resolver,
    values: {
      to: toId,
      message: '',
    },
  });
  const close = useCallback(() => {
    return modal.closeAll();
  }, []);

  const t = useT();

  const createConversation: SubmitHandler<NewConversationDto> = useCallback(
    async (data) => {
      const { id } = await (
        await fetch('/marketplace/conversation', {
          method: 'POST',
          body: JSON.stringify(data),
        })
      ).json();
      close();
      router.push(`/messages/${id}`);
    },
    []
  );
  return (
    <form onSubmit={form.handleSubmit(createConversation)}>
      <FormProvider {...form}>
        <div className="w-full max-w-[920px] mx-auto bg-sixth px-[16px] rounded-[4px] border border-customColor6 gap-[24px] flex flex-col relative">
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
          <div className="text-[18px] font-[500] flex flex-col">
            <TopTitle title={`Send a message to ${name}`} />
            <Textarea
              placeholder="Add a message like: I'm intrested in 3 posts for Linkedin... (min 50 chars)"
              className="mt-[14px] resize-none h-[400px]"
              name="message"
              label=""
            />
            <div className="flex justify-end">
              <Button
                disabled={!form.formState.isValid}
                type="submit"
                className="w-[144px] mb-[16px] rounded-[4px] text-[14px]"
              >
                {t('send_message', 'Send Message')}
              </Button>
            </div>
          </div>
        </div>
      </FormProvider>
    </form>
  );
};
export const Card: FC<{
  data: List;
}> = (props) => {
  const { data } = props;
  const modal = useModals();
  const tags = useMemo(() => {
    return data.items
      .filter((f) => !['content-writer', 'influencers'].includes(f.key))
      .map((p) => {
        return allTagsOptions?.find((t) => t.key === p.key)?.value;
      });
  }, [data]);
  const requestService = useCallback(() => {
    modal.openModal({
      children: <RequestService toId={data.id} name={data.name || 'Noname'} />,
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
      size: '100%',
    });
  }, []);
  const t = useT();

  const identifier = useMemo(() => {
    return [
      ...new Set(
        data.organizations.flatMap((p) =>
          p.organization.Integration.flatMap((d) => d.providerIdentifier)
        )
      ),
    ];
  }, []);
  return (
    <div className="min-h-[155px] bg-sixth p-[24px] flex">
      <div className="flex gap-[16px] flex-1">
        <div>
          <div className="h-[103px] w-[103px] bg-red-500/10 rounded-full relative">
            {data?.picture?.path && (
              <img
                src={data?.picture?.path}
                className="rounded-full w-full h-full"
              />
            )}
            <div className="w-[80px] h-[28px] bg-customColor4 absolute bottom-0 start-[50%] -translate-x-[50%] rounded-[30px] flex gap-[4px] justify-center items-center">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M7.82348 9.80876C8.45164 9.28076 8.90221 8.57235 9.11409 7.77958C9.32597 6.98682 9.28891 6.14807 9.00792 5.37709C8.72694 4.60611 8.21563 3.9402 7.54334 3.46967C6.87106 2.99914 6.07032 2.74677 5.24973 2.74677C4.42914 2.74677 3.62841 2.99914 2.95612 3.46967C2.28383 3.9402 1.77253 4.60611 1.49154 5.37709C1.21056 6.14807 1.17349 6.98682 1.38537 7.77958C1.59725 8.57235 2.04782 9.28076 2.67598 9.80876C1.69509 10.2523 0.845054 10.9411 0.207856 11.8088C0.0901665 11.9691 0.0410049 12.1697 0.0711866 12.3663C0.101368 12.5629 0.208421 12.7395 0.368794 12.8572C0.529167 12.9749 0.729724 13.024 0.926344 12.9939C1.12296 12.9637 1.29954 12.8566 1.41723 12.6963C1.85832 12.0938 2.43521 11.6039 3.10109 11.2662C3.76697 10.9284 4.50309 10.7524 5.24973 10.7524C5.99637 10.7524 6.73249 10.9284 7.39837 11.2662C8.06426 11.6039 8.64114 12.0938 9.08223 12.6963C9.19992 12.8567 9.37653 12.9638 9.57321 12.9941C9.76989 13.0243 9.97053 12.9752 10.131 12.8575C10.2914 12.7398 10.3986 12.5632 10.4288 12.3665C10.459 12.1699 10.4099 11.9692 10.2922 11.8088C9.65465 10.9412 8.80445 10.2524 7.82348 9.80876ZM2.74973 6.75001C2.74973 6.25556 2.89635 5.77221 3.17106 5.36108C3.44576 4.94996 3.83621 4.62953 4.29302 4.44031C4.74984 4.25109 5.2525 4.20158 5.73746 4.29805C6.22241 4.39451 6.66787 4.63261 7.0175 4.98224C7.36713 5.33187 7.60523 5.77733 7.70169 6.26228C7.79816 6.74724 7.74865 7.2499 7.55943 7.70672C7.37021 8.16353 7.04978 8.55398 6.63866 8.82868C6.22753 9.10339 5.74418 9.25001 5.24973 9.25001C4.58669 9.25001 3.95081 8.98662 3.48196 8.51778C3.01312 8.04894 2.74973 7.41305 2.74973 6.75001ZM15.631 12.8544C15.5516 12.9127 15.4615 12.9549 15.3658 12.9784C15.2701 13.0019 15.1707 13.0063 15.0733 12.9914C14.9759 12.9765 14.8824 12.9425 14.7982 12.8914C14.7139 12.8404 14.6405 12.7732 14.5822 12.6938C14.1401 12.0925 13.5629 11.6034 12.8973 11.2658C12.2317 10.9282 11.4961 10.7515 10.7497 10.75C10.5508 10.75 10.3601 10.671 10.2194 10.5303C10.0787 10.3897 9.99973 10.1989 9.99973 10C9.99973 9.8011 10.0787 9.61033 10.2194 9.46968C10.3601 9.32903 10.5508 9.25001 10.7497 9.25001C11.1178 9.24958 11.4813 9.16786 11.8142 9.01071C12.147 8.85355 12.4411 8.62482 12.6753 8.34086C12.9096 8.05691 13.0782 7.72473 13.1692 7.36805C13.2602 7.01138 13.2713 6.63901 13.2017 6.27754C13.1322 5.91607 12.9837 5.57443 12.7668 5.277C12.5499 4.97958 12.27 4.73373 11.9471 4.557C11.6242 4.38027 11.2662 4.27702 10.8988 4.25464C10.5314 4.23225 10.1636 4.29128 9.82161 4.42751C9.73 4.46502 9.63188 4.48402 9.5329 4.48343C9.43392 4.48283 9.33603 4.46265 9.24488 4.42404C9.15374 4.38543 9.07114 4.32916 9.00184 4.25848C8.93255 4.18779 8.87793 4.10409 8.84114 4.0122C8.80435 3.9203 8.78612 3.82204 8.78749 3.72306C8.78885 3.62409 8.8098 3.52636 8.84912 3.43552C8.88844 3.34468 8.94535 3.26252 9.01658 3.19378C9.0878 3.12504 9.17193 3.07108 9.26411 3.03501C10.1468 2.6816 11.1265 2.65418 12.0276 2.95767C12.9287 3.26115 13.6922 3.87569 14.1812 4.6911C14.6703 5.50652 14.8528 6.46947 14.6962 7.4073C14.5396 8.34512 14.0541 9.1965 13.3266 9.80876C14.3075 10.2523 15.1575 10.9411 15.7947 11.8088C15.9113 11.9693 15.9594 12.1694 15.9288 12.3654C15.8981 12.5613 15.791 12.7372 15.631 12.8544Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="text-[14px]">{data?.audience}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[8px]">
          <div className="flex gap-[14px] items-center">
            <div className="text-[24px]">{data.name || 'Noname'}</div>
            <div className="flex gap-[3px]">
              {data.items.some((i) => i.key === 'content-writer') && (
                <div
                  className={clsx(
                    'bg-customColor6 rounded-[34px] py-[8px] px-[12px] text-[12px]',
                  )}
                >
                  {t('content_writer', 'Content Writer')}
                </div>
              )}
              {data.items.some((i) => i.key === 'influencers') && (
                <div
                  className={clsx(
                    'bg-customColor6 rounded-[34px] py-[8px] px-[12px] text-[12px]',
                  )}
                >
                  {t('influencer', 'Influencer')}
                </div>
              )}
            </div>
            <div className="flex gap-[10px]">
              {identifier.map((i) => (
                <img
                  key={i}
                  src={`/icons/platforms/${i}.png`}
                  className="w-[24px] h-[24px] rounded-full"
                />
              ))}
            </div>
          </div>
          <div className="text-[18px] text-customColor18 font-[400]">
            {data.bio || 'No bio'}
          </div>
          <div
            className={clsx(
              'gap-[8px] flex items-center text-[10px] font-[300] text-customColor41 tracking-[1.2px] uppercase',
            )}
          >
            {tags.map((tag, index) => (
              <Fragment key={tag}>
                <div>{tag}</div>
                {index !== tags.length - 1 && (
                  <div>
                    <div className="w-[4px] h-[4px] bg-customColor1 rounded-full" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="ms-[100px] items-center flex">
        <Button onClick={requestService}>
          {t('request_service', 'Request Service')}
        </Button>
      </div>
    </div>
  );
};
export const Buyer = () => {
  const search = useSearchParams();
  const services = search.get('services');
  const page = +(search.get('page') || 1);
  const router = useRouter();
  const fetch = useFetch();
  const marketplace = useCallback(async () => {
    return await (
      await fetch('/marketplace', {
        method: 'POST',
        body: JSON.stringify({
          items: services?.split(',').filter((f) => f) || [],
          page: page === 0 ? 1 : page,
        }),
      })
    ).json();
  }, [services, page]);

  const t = useT();

  useEffect(() => {
    if (!services) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set('page', '1');
    router.replace('?' + params.toString());
  }, [services]);
  const { data: list } = useSWR<Root>('search' + services + page, marketplace);
  return (
    <div className="flex flex-col items-center mt-[100px] gap-[27px] text-center">
      <div>
        <img src="/peoplemarketplace.svg" />
      </div>
      <div className="text-[48px]">
        {t(
          'the_marketplace_is_not_opened_yet',
          'The marketplace is not opened yet'
        )}
        <br />
        {t('check_again_soon', 'Check again soon!')}
      </div>
    </div>
  );
  return (
    <>
      <div>
        <OrderList type="buyer" />
      </div>
      <div className="flex mt-[29px] w-full gap-[43px]">
        <div className="w-[330px]">
          <div className="flex flex-col gap-[16px]">
            <h2 className="text-[20px]">{t('filter', 'Filter')}</h2>
            <div className="flex flex-col">
              {tagsList.map((tag) => (
                <Options
                  search={true}
                  key={tag.key}
                  options={tag.options}
                  title={tag.name}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 gap-[16px] flex-col flex">
          <div className="text-[20px] text-right">
            {list?.count || 0}
            {t('result', 'Result')}
          </div>
          {list?.list?.map((item, index) => (
            <Card key={String(index)} data={item} />
          ))}
          {/*<Pagination results={list?.count || 0} />*/}
        </div>
      </div>
    </>
  );
};
